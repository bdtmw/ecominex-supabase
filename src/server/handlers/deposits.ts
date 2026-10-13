import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { admin } from "../supabase";
import { requireUser, requireAdmin } from "../auth";
import { HttpError, Ctx, json, readJson, isStr, isUuid, rateLimit, pageParams } from "../http";
import { toDeposit } from "../mappers";
import { env, optionalEnv, appUrl } from "../env";
import { uploadImages, signDepositProofs } from "../storage";

const sortObject = (o: any): any =>
  o === null || typeof o !== "object" ? o : Array.isArray(o) ? o.map(sortObject)
    : Object.keys(o).sort().reduce((a: any, k) => ((a[k] = sortObject(o[k])), a), {});

function validSignature(body: unknown, signature: string | null) {
  const secret = optionalEnv("NOWPAYMENTS_IPN_SECRET");
  if (!secret || !signature) return false;
  const expected = Buffer.from(crypto.createHmac("sha512", secret).update(JSON.stringify(sortObject(body))).digest("hex"));
  const given = Buffer.from(signature);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

// Manual deposit: the user uploads proof; an admin later credits the balance.
export async function createDeposit(req: NextRequest) {
  const me = await requireUser(req);
  rateLimit(req, "deposit", 30);
  const fd = await req.formData();
  const amount = Number(fd.get("amount"));
  const transactionId = fd.get("transactionId");
  const accounttype = fd.get("accounttype");
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) throw new HttpError(400, "Invalid deposit amount");
  if (!isStr(transactionId) || !transactionId.trim() || !isStr(accounttype) || !accounttype.trim())
    throw new HttpError(400, "Transaction ID and account type are required");

  const files = [...fd.getAll("attachment"), ...fd.getAll("attachment[]")].filter((f): f is File => typeof f !== "string" && f.size > 0);
  if (files.length > 5) throw new HttpError(400, "At most 5 attachments");
  const attachment = await uploadImages(files, "deposit-proofs", me.id, true);

  // The deposit always belongs to the logged-in user, whatever the form says.
  const { data, error } = await admin().from("deposits").insert({
    user_id: me.id, amount, transaction_id: transactionId.trim(), account_type: accounttype.trim(),
    attachment, payment_provider: "manual", payment_status: "pending",
  }).select("*").single();
  if (error) throw error;
  return json({ success: true, message: "Deposit submitted successfully", data: toDeposit(data) }, 201);
}

const num = (name: string, fallback: number) => {
  const v = Number(optionalEnv(name));
  return Number.isFinite(v) && v > 0 ? v : fallback;
};

export async function createNowPaymentsDeposit(req: NextRequest) {
  const me = await requireUser(req);
  rateLimit(req, "deposit", 30);

  // Never take a payment we could not credit: the key creates invoices, the IPN secret lets us verify the callback.
  if (!optionalEnv("NOWPAYMENTS_API_KEY") || !optionalEnv("NOWPAYMENTS_IPN_SECRET")) {
    console.error("[nowpayments] NOWPAYMENTS_API_KEY and NOWPAYMENTS_IPN_SECRET must both be set");
    throw new HttpError(503, "Crypto deposits are temporarily unavailable. Please try again later.");
  }

  const body = await readJson(req);
  const minUsd = num("MIN_DEPOSIT_USD", 10), maxUsd = num("MAX_DEPOSIT_USD", 100000);
  const allowed = (optionalEnv("NOWPAYMENTS_ALLOWED_CURRENCIES") || "usdttrc20,usdterc20").split(",").map((c) => c.trim().toLowerCase()).filter(Boolean);
  const payCurrency = body.payCurrency === undefined ? allowed[0] : String(body.payCurrency).toLowerCase();

  if (typeof body.amount !== "number" || !Number.isFinite(body.amount)) throw new HttpError(400, "Invalid deposit amount");
  const amount = Math.round(body.amount * 100) / 100;
  if (amount < minUsd) throw new HttpError(400, `The minimum deposit is $${minUsd}`);
  if (amount > maxUsd) throw new HttpError(400, `The maximum single deposit is $${maxUsd}`);
  if (!allowed.includes(payCurrency)) throw new HttpError(400, "Unsupported payment currency");

  const db = admin();
  const { data: deposit, error } = await db.from("deposits").insert({
    user_id: me.id, amount, transaction_id: `NP-${Date.now()}-${me.id}`, account_type: "NOWPayments",
    payment_provider: "nowpayments", payment_status: "creating", pay_currency: payCurrency,
  }).select("*").single();
  if (error) throw error;

  const fail = async (status: number, message: string, raw?: unknown) => {
    await db.from("deposits").update({ payment_status: "failed", now_payments_raw: raw ?? { error: message }, updated_at: new Date().toISOString() }).eq("id", deposit.id);
    throw new HttpError(status, message);
  };

  let res: Response;
  try {
    res = await fetch(`${optionalEnv("NOWPAYMENTS_BASE_URL") || "https://api.nowpayments.io/v1"}/invoice`, {
      method: "POST",
      headers: { "x-api-key": env("NOWPAYMENTS_API_KEY"), "Content-Type": "application/json" },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        price_amount: amount, price_currency: "usd", pay_currency: payCurrency,
        ipn_callback_url: `${appUrl()}/api/v1/nowpayments/ipn`, order_id: deposit.id,
        order_description: `Deposit for ${me.email}`,
        success_url: `${appUrl()}/deposit/success?depositId=${deposit.id}`, cancel_url: `${appUrl()}/deposit/cancel?depositId=${deposit.id}`,
      }),
    });
  } catch (e) {
    console.error("[nowpayments] invoice request failed", e);
    return fail(502, "The payment provider did not respond. Please try again.");
  }
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("[nowpayments] invoice rejected", res.status, data?.message);
    return fail(502, data?.message || "The payment provider could not create the invoice.", data);
  }
  const url = data.invoice_url;
  // https only; plain http is accepted solely when the provider base URL is overridden (local testing)
  const okUrl = typeof url === "string" && (/^https:\/\//.test(url) || (!!optionalEnv("NOWPAYMENTS_BASE_URL") && /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(url)));
  if (!okUrl) {
    return fail(502, "The payment provider returned an invalid invoice.", data);
  }

  await db.from("deposits").update({
    now_payments_invoice_id: String(data.id ?? data.invoice_id ?? ""), invoice_url: data.invoice_url,
    payment_status: "waiting", now_payments_raw: data, updated_at: new Date().toISOString(),
  }).eq("id", deposit.id);

  return json({ success: true, message: "NOWPayments invoice created successfully",
    data: { depositId: deposit.id, invoiceId: data.id ?? data.invoice_id, invoiceUrl: data.invoice_url, status: "waiting" } }, 201);
}

/** What the user sees after paying: has the deposit been credited yet? (own deposits only; admins may read any) */
export async function getDepositStatus(req: NextRequest, { params }: Ctx) {
  const me = await requireUser(req);
  if (!isUuid(params.id)) throw new HttpError(404, "Deposit not found");
  const { data } = await admin().from("deposits").select("*").eq("id", params.id).maybeSingle();
  if (!data || (data.user_id !== me.id && me.role !== "admin")) throw new HttpError(404, "Deposit not found");
  return json({
    id: data.id, provider: data.payment_provider, status: data.payment_status, amount: Number(data.amount),
    credited: !!data.credited_at, creditedAt: data.credited_at, actuallyPaid: data.actually_paid == null ? null : Number(data.actually_paid),
    needsReview: !!data.review_note, invoiceUrl: data.payment_status === "waiting" ? data.invoice_url : null, createdAt: data.created_at,
  });
}

export async function nowPaymentsIpn(req: NextRequest) {
  const body = await readJson(req);
  if (!optionalEnv("NOWPAYMENTS_IPN_SECRET")) console.error("[nowpayments] IPN received but NOWPAYMENTS_IPN_SECRET is not set; payments cannot be credited");
  if (!validSignature(body, req.headers.get("x-nowpayments-sig"))) throw new HttpError(401, "Invalid NOWPayments signature");
  const { payment_id, invoice_id, order_id, payment_status, actually_paid, price_amount, pay_currency } = body as any;
  if (!isUuid(order_id)) throw new HttpError(404, "Deposit not found");

  const { error } = await admin().rpc("fn_apply_nowpayments", {
    p_deposit: order_id, p_payment_id: payment_id != null ? String(payment_id) : null,
    p_invoice_id: invoice_id != null ? String(invoice_id) : null, p_status: payment_status ?? null,
    p_pay_currency: pay_currency ?? null, p_actually_paid: actually_paid ?? null,
    p_amount: typeof price_amount === "number" ? price_amount : price_amount != null ? Number(price_amount) : null, p_raw: body,
  });
  if (error) throw error;
  return json({ success: true });
}

export async function getDeposits(req: NextRequest) {
  const me = await requireUser(req);
  const db = admin();
  if (me.role === "admin") {
    const { data, error } = await db.from("deposits").select("*, profiles(id, first_name, last_name, email)").order("created_at", { ascending: false });
    if (error) throw error;
    const rows = await Promise.all((data || []).map(async (d: any) => ({ ...toDeposit(d, d.profiles), attachment: await signDepositProofs(d.attachment || []) })));
    return json({ success: true, count: rows.length, data: rows });
  }
  const { data, error } = await db.from("deposits").select("*").eq("user_id", me.id).order("created_at", { ascending: false });
  if (error) throw error;
  return json({ success: true, count: data.length, data: data.map((d) => toDeposit(d)) });
}

const DEPOSIT_STATUSES = ["creating", "waiting", "confirming", "confirmed", "sending", "partially_paid", "finished", "failed", "refunded", "expired", "review", "pending"];

/** Admin list of every deposit (manual proofs and NOWPayments) with filters, paging and tab counts. */
export async function adminListDeposits(req: NextRequest) {
  const me = await requireAdmin(req);
  const sp = req.nextUrl.searchParams;
  const provider = sp.get("provider");
  if (provider && !["manual", "nowpayments"].includes(provider)) throw new HttpError(400, "Invalid provider");
  const statuses = (sp.get("status") || "").split(",").map((x) => x.trim()).filter(Boolean);
  if (statuses.some((x) => !DEPOSIT_STATUSES.includes(x))) throw new HttpError(400, "Invalid status");
  const { page, limit, from } = pageParams(req, 25, 100);
  const user = sp.get("user");
  if (user && !isUuid(user)) throw new HttpError(400, "Invalid user");

  const { data, error } = await admin().rpc("fn_admin_deposits", {
    p_user: user || null,
    p_admin: me.id, p_provider: provider || null, p_statuses: statuses.length ? statuses : null,
    p_review: sp.get("review") === "1", p_search: (sp.get("search") || "").slice(0, 100) || null, p_limit: limit, p_offset: from,
  });
  if (error) throw error;
  // proofs live in a private bucket: hand the admin short-lived signed links
  const rows = await Promise.all((data.rows as any[]).map(async (r) => ({ ...r, attachments: await signDepositProofs(r.attachments || []) })));
  return json({ ...data, rows, page, limit, totalPages: Math.max(1, Math.ceil(data.total / limit)) });
}

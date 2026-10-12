import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { admin } from "../supabase";
import { requireUser } from "../auth";
import { HttpError, json, readJson, isStr, isUuid, rateLimit } from "../http";
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

export async function createNowPaymentsDeposit(req: NextRequest) {
  const me = await requireUser(req);
  rateLimit(req, "deposit", 30);
  const { amount, payCurrency = "usdttrc20" } = await readJson(req);
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) throw new HttpError(400, "Invalid deposit amount");
  if (!isStr(payCurrency) || !/^[a-z0-9]{2,20}$/i.test(payCurrency)) throw new HttpError(400, "Invalid currency");

  const db = admin();
  const { data: deposit, error } = await db.from("deposits").insert({
    user_id: me.id, amount, transaction_id: `NP-${Date.now()}-${me.id}`, account_type: "NOWPayments",
    payment_provider: "nowpayments", payment_status: "creating", pay_currency: payCurrency,
  }).select("*").single();
  if (error) throw error;

  const res = await fetch(`${optionalEnv("NOWPAYMENTS_BASE_URL") || "https://api.nowpayments.io/v1"}/invoice`, {
    method: "POST",
    headers: { "x-api-key": env("NOWPAYMENTS_API_KEY"), "Content-Type": "application/json" },
    body: JSON.stringify({
      price_amount: amount, price_currency: "usd", pay_currency: payCurrency,
      ipn_callback_url: `${appUrl()}/api/v1/nowpayments/ipn`, order_id: deposit.id,
      order_description: `Deposit for ${me.email}`,
      success_url: `${appUrl()}/deposit/success?depositId=${deposit.id}`, cancel_url: `${appUrl()}/deposit/cancel?depositId=${deposit.id}`,
    }),
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    await db.from("deposits").update({ payment_status: "failed", now_payments_raw: data }).eq("id", deposit.id);
    throw new HttpError(502, data?.message || "NOWPayments invoice creation failed");
  }
  await db.from("deposits").update({
    now_payments_invoice_id: String(data.id ?? data.invoice_id ?? ""), invoice_url: data.invoice_url,
    payment_status: "waiting", now_payments_raw: data,
  }).eq("id", deposit.id);

  return json({ success: true, message: "NOWPayments invoice created successfully",
    data: { depositId: deposit.id, invoiceId: data.id ?? data.invoice_id, invoiceUrl: data.invoice_url, status: "waiting" } }, 201);
}

export async function nowPaymentsIpn(req: NextRequest) {
  const body = await readJson(req);
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

import { NextRequest } from "next/server";
import { admin, must } from "../supabase";
import { requireAdmin, requireUser } from "../auth";
import { HttpError, json, readJson, isStr, isUuid, isPositiveNumber, pageParams, escapeHtml } from "../http";
import { toTransaction } from "../mappers";
import { sendEmail, layout, p } from "../email";
import { optionalEnv } from "../env";

const MIN_WITHDRAWAL_USD = 50;
const USER_COLS = "id, first_name, last_name, email";

async function withUsers(rows: any[], withProcessor = false) {
  const ids = [...new Set(rows.flatMap((r) => [r.user_id, withProcessor ? r.processed_by : null]).filter(Boolean))];
  const data: any[] = ids.length ? must(await admin().from("profiles").select(USER_COLS).in("id", ids)) : [];
  const map = new Map((data || []).map((u: any) => [u.id, u]));
  return rows.map((r) => toTransaction(r, map.get(r.user_id), withProcessor ? map.get(r.processed_by) : undefined));
}

export async function requestWithdrawal(req: NextRequest) {
  const me = await requireUser(req);
  const { amount, walletAddress, network } = await readJson(req);
  if (!isPositiveNumber(amount) || !isStr(walletAddress) || !walletAddress.trim() || !isStr(network) || !network.trim())
    throw new HttpError(400, "Valid amount, wallet address, and network are required");
  if (Number(amount) < MIN_WITHDRAWAL_USD) throw new HttpError(400, `Minimum withdrawal is $${MIN_WITHDRAWAL_USD}`);

  const { data, error } = await admin().rpc("fn_request_withdrawal", {
    p_user: me.id, p_amount: amount, p_wallet: walletAddress, p_network: network,
  });
  if (error) {
    if ((error as any).details && (error as any).message?.includes("exceeds")) {
      throw new HttpError(400, "Withdrawal amount exceeds available balance", { availableBalance: Number((error as any).details) });
    }
    throw error;
  }

  const adminEmail = optionalEnv("ADMIN_EMAIL");
  if (adminEmail) {
    sendEmail(adminEmail, "Withdrawal Request Submitted", layout("New Withdrawal Request",
      p(`<b>User:</b> ${escapeHtml(`${me.first_name} ${me.last_name}`.trim() || me.email)} (${escapeHtml(me.email)})`) +
      p(`<b>Amount:</b> $${escapeHtml(amount)}<br><b>Wallet:</b> ${escapeHtml(walletAddress)}<br><b>Network:</b> ${escapeHtml(network)}<br><b>Transaction:</b> ${escapeHtml(data.transaction.id)}`) +
      p("Please review this request in the admin panel."))
    ).catch((e) => console.error("[withdrawal] admin email failed", e));
  }
  return json({ message: "Withdrawal request submitted successfully", transaction: toTransaction(data.transaction), availableBalance: data.availableBalance });
}

export async function processWithdrawal(req: NextRequest) {
  const adminUser = await requireAdmin(req);
  const { transactionId, action, adminComment } = await readJson(req);
  if (!isUuid(transactionId) || !["approved", "rejected"].includes(action)) throw new HttpError(400, "Invalid request");
  if (adminComment !== undefined && adminComment !== null && !isStr(adminComment)) throw new HttpError(400, "Invalid comment");

  const { data, error } = await admin().rpc("fn_process_withdrawal", {
    p_admin: adminUser.id, p_tx: transactionId, p_action: action, p_comment: adminComment ?? null,
  });
  if (error) throw error;

  const owner = must(await admin().from("profiles").select(USER_COLS).eq("id", data.user_id).single());
  if (owner) {
    sendEmail(owner.email, `Withdrawal Request ${action.toUpperCase()}`, layout(`Withdrawal Request ${action[0].toUpperCase()}${action.slice(1)}`,
      p(`Hi ${escapeHtml(`${owner.first_name} ${owner.last_name}`.trim()) || "there"}, your withdrawal request has been <b>${action}</b>.`) +
      p(`<b>Amount:</b> $${escapeHtml(data.amount)}<br><b>Transaction ID:</b> ${escapeHtml(data.id)}` + (adminComment ? `<br><b>Note from admin:</b> ${escapeHtml(adminComment)}` : "")) +
      p("If you did not request this withdrawal, please contact support immediately."))
    ).catch((e) => console.error("[withdrawal] user email failed", e));
  }
  return json({ message: `Withdrawal request ${action} successfully`, transaction: toTransaction(data, owner) });
}

export async function getPendingWithdrawals(req: NextRequest) {
  await requireAdmin(req);
  const { page, limit, from, to } = pageParams(req);
  const { data, count, error } = await admin().from("transactions").select("*", { count: "exact" })
    .eq("type", "withdrawal").eq("status", "pending").order("transaction_date", { ascending: false }).range(from, to);
  if (error) throw error;
  return json({ withdrawals: await withUsers(data || []), totalPages: Math.ceil((count || 0) / limit), currentPage: page, totalWithdrawals: count || 0 });
}

// A user's own history (withdrawals + admin credits). Admins may look up any email.
export async function getUserWithdrawals(req: NextRequest) {
  const me = await requireUser(req);
  const { page, limit, from, to } = pageParams(req, 10);
  const asked = req.nextUrl.searchParams.get("email");
  let userId = me.id;
  if (me.role === "admin" && asked) {
    const data = must(await admin().from("profiles").select("id").eq("email", asked.trim().toLowerCase()).maybeSingle());
    if (!data) throw new HttpError(404, "User not found with provided email");
    userId = data.id;
  }
  const { data, count, error } = await admin().from("transactions").select("*", { count: "exact" })
    .eq("user_id", userId).in("type", ["withdrawal", "ADMIN_ADD"]).order("transaction_date", { ascending: false }).range(from, to);
  if (error) throw error;
  return json({ withdrawals: await withUsers(data || []), totalPages: Math.ceil((count || 0) / limit), currentPage: page, totalTransactions: count || 0 });
}

export async function getWithdrawalStats(req: NextRequest) {
  await requireAdmin(req);
  const { data, error } = await admin().from("transactions").select("status, amount").eq("type", "withdrawal");
  if (error) throw error;
  const agg = (s: string) => {
    const rows = data.filter((r) => r.status === s);
    return { count: rows.length, amount: rows.reduce((t, r) => t + Number(r.amount), 0) };
  };
  return json({ pending: agg("pending"), approved: agg("approved"), rejected: { count: agg("rejected").count } });
}

export async function getAllWithdrawals(req: NextRequest) {
  await requireAdmin(req);
  const sp = req.nextUrl.searchParams;
  const { page, limit, from, to } = pageParams(req);
  const sortBy = ["transaction_date", "amount", "status"].includes(sp.get("sortBy") || "") ? sp.get("sortBy")! : "transaction_date";
  const sortOrder = sp.get("sortOrder") === "asc" ? "asc" : "desc";
  const status = sp.get("status");
  const startDate = sp.get("startDate"), endDate = sp.get("endDate");

  let q = admin().from("transactions").select("*", { count: "exact" }).eq("type", "withdrawal");
  if (startDate) q = q.gte("transaction_date", new Date(startDate).toISOString());
  if (endDate) q = q.lte("transaction_date", new Date(endDate).toISOString());
  if (status && ["pending", "approved", "rejected"].includes(status)) q = q.eq("status", status);
  const { data, count, error } = await q.order(sortBy, { ascending: sortOrder === "asc" }).range(from, to);
  if (error) throw error;

  let totalQ = admin().from("transactions").select("amount").eq("type", "withdrawal");
  if (status && ["pending", "approved", "rejected"].includes(status)) totalQ = totalQ.eq("status", status);
  const all = must(await totalQ);
  return json({
    withdrawals: await withUsers(data || [], true), totalPages: Math.ceil((count || 0) / limit), currentPage: page,
    totalWithdrawals: count || 0, totalAmount: (all || []).reduce((s: number, r: any) => s + Number(r.amount), 0),
    filters: { startDate, endDate, status }, sorting: { sortBy, sortOrder },
  });
}

export async function getBalanceHistory(req: NextRequest) {
  const me = await requireUser(req);
  const sp = req.nextUrl.searchParams;
  const { page, limit, from, to } = pageParams(req);
  let userId = me.id;
  if (me.role === "admin" && sp.get("userId")) {
    if (!isUuid(sp.get("userId"))) throw new HttpError(400, "Invalid user id");
    userId = sp.get("userId")!;
  }
  let q = admin().from("transactions").select("*", { count: "exact" }).eq("user_id", userId);
  if (sp.get("startDate")) q = q.gte("processed_at", new Date(sp.get("startDate")!).toISOString());
  if (sp.get("endDate")) q = q.lte("processed_at", new Date(sp.get("endDate")!).toISOString());
  const { data, count, error } = await q.order("transaction_date", { ascending: false }).range(from, to);
  if (error) throw error;
  return json({ transactions: await withUsers(data || [], true), totalPages: Math.ceil((count || 0) / limit), currentPage: page, totalTransactions: count || 0 });
}

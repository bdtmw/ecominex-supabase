import { NextRequest } from "next/server";
import { admin } from "../supabase";
import { requireAdmin } from "../auth";
import { HttpError, json, isUuid, pageParams } from "../http";
import { csvResponse } from "../csv";
import { ledgerStart, clampFrom } from "../ledgerStart";

const DAY = 86400000;
const startOfUtcDay = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

/** Turns ?range=7d|30d|90d|12m|today|ytd|custom (&from=YYYY-MM-DD&to=YYYY-MM-DD) into [from, to). UTC days; today is included. */
export function resolveRange(sp: URLSearchParams) {
  const range = sp.get("range") || "30d";
  const tomorrow = new Date(startOfUtcDay(new Date()).getTime() + DAY);
  const days: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90, "12m": 365 };

  let from: Date, to = tomorrow;
  if (range === "today") from = new Date(tomorrow.getTime() - DAY);
  else if (range === "ytd") from = new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1));
  else if (days[range]) from = new Date(tomorrow.getTime() - days[range] * DAY);
  else if (range === "custom") {
    const f = parseDay(sp.get("from")), t = parseDay(sp.get("to"));
    if (!f || !t) throw new HttpError(400, "Custom range needs valid from and to dates (YYYY-MM-DD)");
    from = f; to = new Date(t.getTime() + DAY);
    if (to <= from) throw new HttpError(400, "'to' must not be before 'from'");
    if (to.getTime() - from.getTime() > 800 * DAY) throw new HttpError(400, "Range too large (max about 2 years)");
  } else throw new HttpError(400, "Unknown range");
  return { range, from, to };
}

function parseDay(v: string | null): Date | null {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function getAnalytics(req: NextRequest) {
  const me = await requireAdmin(req);
  const { range, from, to } = resolveRange(req.nextUrl.searchParams);
  const spanDays = (to.getTime() - from.getTime()) / DAY;
  const bucket = spanDays > 92 ? "week" : "day";

  const db = admin();
  const [kpis, series, review] = await Promise.all([
    db.rpc("fn_admin_kpis", { p_admin: me.id, p_from: from.toISOString(), p_to: to.toISOString() }),
    db.rpc("fn_admin_timeseries", { p_admin: me.id, p_from: from.toISOString(), p_to: to.toISOString(), p_bucket: bucket }),
    db.rpc("fn_admin_deposits", { p_admin: me.id, p_review: true, p_limit: 1, p_offset: 0 }),
  ]);
  if (kpis.error) throw kpis.error;
  if (series.error) throw series.error;
  if (review.error) throw review.error;
  const attention = { ...kpis.data.attention, depositsNeedingReview: review.data.total };
  return json({ range, from, to, bucket: series.data.bucket, ...kpis.data, attention, series: series.data.points });
}

// ------------------------------------------------------------------ users
const SEGMENTS = ["all", "new", "pending_withdrawal", "never_deposited", "holding", "dormant", "no_machines", "admins"];
const SORTS = ["joined", "name", "balance", "deposited", "withdrawn", "machines", "referrals", "activity", "pending"];

function userFilters(sp: URLSearchParams) {
  const segment = sp.get("segment") || "all";
  const sort = sp.get("sort") || "joined";
  const dir = sp.get("dir") === "asc" ? "asc" : "desc";
  if (!SEGMENTS.includes(segment)) throw new HttpError(400, "Unknown segment");
  if (!SORTS.includes(sort)) throw new HttpError(400, "Unknown sort column");
  const search = (sp.get("search") || "").slice(0, 100);
  return { segment, sort, dir, search };
}

export async function getUsersOverview(req: NextRequest) {
  const me = await requireAdmin(req);
  const sp = req.nextUrl.searchParams;
  const f = userFilters(sp);
  const { page, limit, from } = pageParams(req, 25, 100);
  const { data, error } = await admin().rpc("fn_admin_users_overview", {
    p_admin: me.id, p_search: f.search, p_segment: f.segment, p_sort: f.sort, p_dir: f.dir, p_limit: limit, p_offset: from,
  });
  if (error) throw error;
  return json({ ...data, page, limit, totalPages: Math.max(1, Math.ceil(data.total / limit)) });
}

export async function exportUsers(req: NextRequest) {
  const me = await requireAdmin(req);
  const f = userFilters(req.nextUrl.searchParams);
  const { data, error } = await admin().rpc("fn_admin_users_overview", {
    p_admin: me.id, p_search: f.search, p_segment: f.segment, p_sort: f.sort, p_dir: f.dir, p_limit: 1000, p_offset: 0,
  });
  if (error) throw error;
  const rows = (data.rows as any[]).map((u) => [
    `${u.firstName} ${u.lastName}`.trim(), u.email, u.phone, u.country, u.role, u.joinedAt, u.lastActivityAt,
    u.depositedBalance, u.profitBalance, u.totalBalance, u.totalDeposited, u.totalWithdrawn, u.pendingWithdrawal,
    u.machines, u.shares, u.referrals, (u.tags || []).join(" "),
  ]);
  return csvResponse(`users-${new Date().toISOString().slice(0, 10)}.csv`, [
    "Name", "Email", "Phone", "Country", "Role", "Joined", "Last activity", "Deposited balance", "Profit balance", "Total balance",
    "Total deposited", "Total withdrawn", "Pending withdrawal", "Machines", "Shares", "Referrals", "Tags",
  ], rows);
}

// ------------------------------------------------------------------ ledger
const CATEGORIES = ["deposit", "withdrawal", "purchase", "profit", "sale", "referral"];
const STATUSES = ["pending", "approved", "rejected", "completed"];

function ledgerArgs(sp: URLSearchParams, adminId: string) {
  const list = (key: string, allowed: string[]) => {
    const v = (sp.get(key) || "").split(",").map((x) => x.trim()).filter(Boolean);
    if (v.some((x) => !allowed.includes(x))) throw new HttpError(400, `Invalid ${key}`);
    return v.length ? v : null;
  };
  const num = (key: string) => {
    const v = sp.get(key);
    if (v === null || v === "") return null;
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) throw new HttpError(400, `Invalid ${key}`);
    return n;
  };
  const user = sp.get("user");
  if (user && !isUuid(user)) throw new HttpError(400, "Invalid user");

  let from: string | null = null, to: string | null = null;
  if (sp.get("range") && sp.get("range") !== "all") { const r = resolveRange(sp); from = r.from.toISOString(); to = r.to.toISOString(); }

  const start = ledgerStart();
  from = clampFrom(from, start);

  return {
    p_admin: adminId, p_from: from, p_to: to, p_categories: list("category", CATEGORIES), p_statuses: list("status", STATUSES),
    p_user: user || null, p_search: (sp.get("search") || "").slice(0, 100) || null, p_min: num("min"), p_max: num("max"),
  };
}

export async function getLedger(req: NextRequest) {
  const me = await requireAdmin(req);
  const args = ledgerArgs(req.nextUrl.searchParams, me.id);
  const { page, limit, from } = pageParams(req, 50, 200);
  const { data, error } = await admin().rpc("fn_admin_ledger", { ...args, p_limit: limit, p_offset: from });
  if (error) throw error;
  const totalPages = Math.max(1, Math.ceil(data.total / limit));

  // A user's full history that starts with money already in the account (e.g. history that was never imported):
  // say so on the last page instead of leaving the first balance unexplained. Only for an unfiltered single-user view.
  let opening: { amount: number; at: string } | null = null;
  const start = ledgerStart();
  const unfiltered = args.p_user && (!args.p_from || args.p_from === start?.toISOString()) && !args.p_to && !args.p_categories && !args.p_statuses && !args.p_search && args.p_min === null && args.p_max === null;
  if (unfiltered && page >= totalPages) {
    let q = admin().from("v_ledger").select("balance_before, effective_at").eq("user_id", args.p_user as string);
    if (start) q = q.gte("effective_at", start.toISOString());
    const { data: first, error: e2 } = await q.order("effective_at", { ascending: true }).order("id", { ascending: true }).limit(1);
    if (e2) throw e2;
    const before = first?.[0]?.balance_before == null ? 0 : Number(first[0].balance_before);
    if (before > 0.005) opening = { amount: before, at: first![0].effective_at };
  }
  return json({ ...data, opening, startsAt: start ? start.toISOString() : null, page, limit, totalPages });
}

export async function exportLedger(req: NextRequest) {
  const me = await requireAdmin(req);
  const args = ledgerArgs(req.nextUrl.searchParams, me.id);
  const { data, error } = await admin().rpc("fn_admin_ledger", { ...args, p_limit: 20000, p_offset: 0 });
  if (error) throw error;
  const rows = (data.rows as any[]).map((r) => [
    r.date, r.userName, r.userEmail, r.typeLabel, r.status, r.direction, r.amount, r.signedAmount,
    r.balanceBefore, r.balanceAfter, r.description, r.walletAddress, r.network, r.id,
  ]);
  return csvResponse(`ledger-${new Date().toISOString().slice(0, 10)}.csv`, [
    "Date", "User", "Email", "Type", "Status", "Direction", "Amount", "Effect on balance", "Balance before", "Balance after",
    "Description", "Wallet", "Network", "Transaction ID",
  ], rows);
}

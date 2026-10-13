import { NextRequest } from "next/server";
import { admin } from "../supabase";
import { requireUser } from "../auth";
import { HttpError, json, pageParams } from "../http";
import { ledgerStart } from "../ledgerStart";

const CATEGORIES = ["deposit", "withdrawal", "purchase", "profit", "sale", "referral", "adjustment"];

/** The logged-in user's own ledger. The user id always comes from the session token, never from the request. */
export async function getMyLedger(req: NextRequest) {
  const me = await requireUser(req);
  const sp = req.nextUrl.searchParams;
  const cats = (sp.get("category") || "").split(",").map((x) => x.trim()).filter(Boolean);
  if (cats.some((c) => !CATEGORIES.includes(c))) throw new HttpError(400, "Invalid category");
  const { page, limit, from } = pageParams(req, 25, 100);

  const start = ledgerStart();
  const { data, error } = await admin().rpc("fn_user_ledger", {
    p_user: me.id, p_start: start ? start.toISOString() : null, p_categories: cats.length ? cats : null, p_limit: limit, p_offset: from,
  });
  if (error) throw error;
  return json({ ...data, startsAt: start ? start.toISOString() : null, page, limit, totalPages: Math.max(1, Math.ceil(data.total / limit)) });
}

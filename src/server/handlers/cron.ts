import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { admin } from "../supabase";
import { HttpError, json } from "../http";
import { optionalEnv } from "../env";

const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

/**
 * Daily profit payout. Accepts the secret as `x-cron-secret: <secret>` (cron-job.org)
 * or `Authorization: Bearer <secret>` (Vercel Cron). Fails closed if CRON_SECRET is unset.
 */
export async function profitUpdate(req: NextRequest) {
  const expected = optionalEnv("CRON_SECRET");
  const bearer = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const given = req.headers.get("x-cron-secret") || bearer;
  if (!expected || !given || !safeEqual(given, expected)) throw new HttpError(401, "Unauthorized");

  const { data, error } = await admin().rpc("fn_run_profit_update");
  if (error) throw error;
  return json({ success: true, ...data });
}

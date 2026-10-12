import crypto from "node:crypto";
import { admin, must } from "./supabase";
import { env } from "./env";
import { HttpError } from "./http";

const MAX_ATTEMPTS = 5;
const TTL_MS = 5 * 60 * 1000;

const hash = (code: string) =>
  crypto.createHmac("sha256", env("APP_JWT_SECRET")).update(code).digest("hex");

const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

/** Creates (replacing any previous) a 6-digit code for the user and returns it. Only a hash is stored. */
export async function issueOtp(userId: string, purpose: "signup" | "login"): Promise<string> {
  const code = crypto.randomInt(100000, 1000000).toString();
  const { error } = await admin().from("otp_codes").upsert({
    user_id: userId, purpose, code_hash: hash(code),
    expires_at: new Date(Date.now() + TTL_MS).toISOString(), attempts: 0,
  });
  if (error) throw error;
  return code;
}

/** Checks a submitted code. Wrong guesses are counted; after MAX_ATTEMPTS the code is destroyed. */
export async function consumeOtp(userId: string, purpose: "signup" | "login", code: string) {
  const db = admin();
  const data = must(await db.from("otp_codes").select("*").eq("user_id", userId).eq("purpose", purpose).maybeSingle());
  if (!data) throw new HttpError(400, "No active code. Please request a new one.");

  if (new Date(data.expires_at) < new Date()) {
    await db.from("otp_codes").delete().eq("user_id", userId).eq("purpose", purpose);
    throw new HttpError(400, "Code expired. Please request a new one.");
  }
  if (data.attempts >= MAX_ATTEMPTS) {
    await db.from("otp_codes").delete().eq("user_id", userId).eq("purpose", purpose);
    throw new HttpError(429, "Too many attempts. Please request a new code.");
  }
  if (!safeEqual(data.code_hash, hash(code))) {
    await db.from("otp_codes").update({ attempts: data.attempts + 1 }).eq("user_id", userId).eq("purpose", purpose);
    throw new HttpError(400, "Invalid OTP");
  }
  await db.from("otp_codes").delete().eq("user_id", userId).eq("purpose", purpose);
}

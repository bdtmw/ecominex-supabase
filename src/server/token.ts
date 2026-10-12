import { SignJWT, jwtVerify } from "jose";
import { env } from "./env";

// Sessions are our own short-lived JWTs (1 day, like the old Express backend), signed
// with APP_JWT_SECRET. Supabase Auth is the credential store; it is not used per request.
const key = () => new TextEncoder().encode(env("APP_JWT_SECRET"));

export async function signToken(userId: string): Promise<string> {
  return new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject(userId)
    .setIssuedAt().setExpirationTime("1d").sign(key());
}

export async function verifyToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

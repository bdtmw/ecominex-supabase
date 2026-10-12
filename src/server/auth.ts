import { NextRequest } from "next/server";
import { admin } from "./supabase";
import { verifyToken } from "./token";
import { HttpError, isUuid } from "./http";

export type Profile = {
  id: string; first_name: string; last_name: string; email: string; phone_number: string;
  country: string; role: "user" | "admin"; referral_code: string | null; referred_by: string | null;
  referral_status: string | null; deposit_count: number | null; discount: number;
  two_factor_enabled: boolean; created_at: string;
};

/** Resolves the logged-in user from `Authorization: Bearer <token>`; 401 otherwise. */
export async function requireUser(req: NextRequest): Promise<Profile> {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) throw new HttpError(401, "Not authorized, please login!");

  const id = await verifyToken(token);
  if (!id) throw new HttpError(401, "Not authorized, token failed!");

  const { data, error } = await admin().from("profiles").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(401, "Not authorized, token failed!");
  return data as Profile;
}

export async function requireAdmin(req: NextRequest): Promise<Profile> {
  const user = await requireUser(req);
  if (user.role !== "admin") throw new HttpError(403, "Only admins can do this!");
  return user;
}

/** Owner-or-admin check for routes with a :userId parameter. Same answer for "missing" and "not yours". */
export function assertSelfOrAdmin(user: Profile, targetId: string, status = 403) {
  if (!isUuid(targetId) || (user.id !== targetId && user.role !== "admin")) {
    throw new HttpError(status, status === 404 ? "Not found" : "Not allowed");
  }
}

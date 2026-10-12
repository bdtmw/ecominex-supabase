import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

let adminClient: SupabaseClient | null = null;
let anonClient: SupabaseClient | null = null;

const opts = { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } };

/** Service-role client: bypasses RLS. Server-only; every caller must authorise first. */
export function admin(): SupabaseClient {
  if (!adminClient) {
    adminClient = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), opts);
  }
  return adminClient;
}

/** Anon client, used only to verify a password with signInWithPassword. */
export function anon(): SupabaseClient {
  if (!anonClient) {
    anonClient = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("NEXT_PUBLIC_SUPABASE_ANON_KEY"), opts);
  }
  return anonClient;
}

/** Returns `data`, throwing the database error (instead of silently yielding null) so outages surface as 500s. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function must(res: { data: any; error: any }): any {
  if (res.error) throw res.error;
  return res.data;
}

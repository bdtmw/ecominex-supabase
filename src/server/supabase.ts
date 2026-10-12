import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

let adminClient: SupabaseClient | null = null;
let anonClient: SupabaseClient | null = null;

const opts = { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } };

/** Service-role client: bypasses RLS. Server-only; every caller must authorise first. */
export function admin(): SupabaseClient {
  if (!adminClient) {
    // Accepts the legacy name (service_role) and the newer one (secret key)
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || env("SUPABASE_SERVICE_ROLE_KEY");
    adminClient = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), key, opts);
  }
  return adminClient;
}

/** Anon client, used only to verify a password with signInWithPassword. */
export function anon(): SupabaseClient {
  if (!anonClient) {
    // Accepts the legacy name (anon) and the newer one (publishable key)
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    anonClient = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), key, opts);
  }
  return anonClient;
}

/** Returns `data`, throwing the database error (instead of silently yielding null) so outages surface as 500s. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function must(res: { data: any; error: any }): any {
  if (res.error) throw res.error;
  return res.data;
}

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

test("supabase/setup.sql runs in one go on a fresh database and creates everything", async () => {
  const db = new PGlite();
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth; create table auth.users (id uuid primary key default gen_random_uuid(), email text);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create schema storage; create table storage.buckets (id text primary key, name text, public boolean);
  `);
  await db.exec(readFileSync(new URL("../../supabase/setup.sql", import.meta.url), "utf8"));
  const t = await db.query(`select count(*)::int c from information_schema.tables where table_schema='public' and table_type='BASE TABLE'`);
  assert.equal(t.rows[0].c, 12);   // includes balance_reconciliation_log and purchase_void_log
  const m = await db.query(`select count(*)::int c from public.mining_machines where is_share_based`);
  assert.equal(m.rows[0].c, 1);
});

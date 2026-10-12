// Spins up an in-memory Postgres (PGlite) that mimics the parts of Supabase the
// migrations rely on: roles, auth.users/auth.uid(), storage.buckets and default grants.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const migrations = path.join(here, "../../supabase/migrations");

export async function createDb(options = {}) {
  const db = new PGlite(options);
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key default gen_random_uuid(), email text);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create schema storage;
    create table storage.buckets (id text primary key, name text, public boolean);
    grant usage on schema public, auth to anon, authenticated, service_role;
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant execute on functions to public, anon, authenticated, service_role;
  `);
  for (const f of readdirSync(migrations).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(path.join(migrations, f), "utf8"));
  }
  return db;
}

let n = 0;
export async function makeUser(db, { role = "user", adminAdd = 0, mining = 0, referredBy = null } = {}) {
  n += 1;
  const { rows } = await db.query(`insert into auth.users (email) values ($1) returning id`, [`u${n}@test.com`]);
  const id = rows[0].id;
  await db.query(
    `insert into public.profiles (id, first_name, last_name, email, phone_number, country, role, referral_code, referred_by)
     values ($1,'T','U',$2,'123456','US',$3,$4,$5)`,
    [id, `u${n}@test.com`, role, `code-${n}`, referredBy]
  );
  await db.query(`insert into public.balances (user_id, admin_add, mining_balance) values ($1,$2,$3)`, [id, adminAdd, mining]);
  return id;
}

export async function makeMachine(db, over = {}) {
  const m = { name: "Miner", price: 1000, profit: 100, share: false, ...over };
  const { rows } = await db.query(
    `insert into public.mining_machines (machine_name, hashrate, power_consumption, price_range, coins_mined,
       monthly_profit, description, is_share_based, share_price, total_shares, profit_per_share)
     values ($1,'100 TH/s',3000,$2,'Bitcoin',$3,'d',$4,$5,380,$6) returning id`,
    [m.name, m.price, m.profit, m.share, m.sharePrice ?? 50, m.profitPerShare ?? 9.21]
  );
  return rows[0].id;
}

export const balanceOf = async (db, id) =>
  (await db.query(`select admin_add::float a, mining_balance::float m, total_balance::float t from public.balances where user_id=$1`, [id])).rows[0];

// Runs a query and returns the error (code/message) instead of throwing.
export async function err(promise) {
  try { await promise; } catch (e) { return { code: e.code, message: e.message }; }
  return null;
}

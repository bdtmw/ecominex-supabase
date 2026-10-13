import { test, before } from "node:test";
import assert from "node:assert/strict";
import { createDb, makeUser } from "./harness.mjs";

let db, u, v;
const call = async (fn, ...a) => (await db.query(`select public.${fn}(${a.map((_, i) => `$${i + 1}`).join(",")}) as r`, a)).rows[0].r;
const tx = (user, type, amount, status, at, extra = {}) => db.query(
  `insert into public.transactions (user_id, type, amount, status, transaction_date, processed_at, balance_before, balance_after)
   values ($1,$2,$3,$4,$5,$6,$7,$8)`, [user, type, amount, status, at, extra.processed ?? at, extra.before ?? null, extra.after ?? null]);
const bal = async (user) => (await db.query(`select type, status, balance_before::float b, balance_after::float a from public.transactions where user_id=$1 order by transaction_date, id`, [user])).rows;

before(async () => {
  db = await createDb({ parsers: { 1700: (x) => parseFloat(x) } });
  u = await makeUser(db); v = await makeUser(db);
  // u: +1000 deposit, -300 purchase, +50 profit, pending withdrawal 100 (no effect), rejected withdrawal 40, -200 approved withdrawal => 550
  await tx(u, "ADMIN_ADD", 1000, "approved", "2026-01-01T10:00:00Z");
  await tx(u, "MACHINE_PURCHASE", 300, "completed", "2026-01-02T10:00:00Z");
  await tx(u, "profit", 50, "completed", "2026-01-03T10:00:00Z");
  await tx(u, "withdrawal", 200, "approved", "2026-01-04T10:00:00Z");
  await tx(u, "withdrawal", 40, "rejected", "2026-01-05T10:00:00Z");
  await tx(u, "withdrawal", 100, "pending", "2026-01-06T10:00:00Z");
  await db.query(`update public.balances set admin_add=500, mining_balance=50 where user_id=$1`, [u]);
  // v already has real values on one row: must be left alone
  await tx(v, "ADMIN_ADD", 70, "approved", "2026-01-01T10:00:00Z", { before: 0, after: 70 });
  await tx(v, "ADMIN_ADD", 30, "approved", "2026-01-02T10:00:00Z");
  await db.query(`update public.balances set admin_add=100, mining_balance=0 where user_id=$1`, [v]);
});

test("running balance ends at today's balance and works backwards", async () => {
  assert.equal(await call("fn_backfill_transaction_balances"), 7);
  assert.deepEqual((await bal(u)).map((r) => r.a), [1000, 700, 750, 550, 550, 550]);
  assert.deepEqual((await bal(u)).map((r) => r.b), [0, 1000, 700, 750, 550, 550]);
});

test("existing values are never overwritten", async () => {
  const r = await bal(v);
  assert.deepEqual(r.map((x) => x.a), [70, 100]);
  assert.equal(r[1].b, 70);
});

test("it is idempotent and only service_role may run it", async () => {
  assert.equal(await call("fn_backfill_transaction_balances"), 0);
  await db.query(`set role authenticated`);
  await assert.rejects(call("fn_backfill_transaction_balances"), /permission denied/);
  await db.query(`reset role`);
});

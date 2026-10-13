import { test, before } from "node:test";
import assert from "node:assert/strict";
import { createDb, makeUser } from "./harness.mjs";

let db, phantom, referrer, buyer, honest, low, partial;
const q = (sql, p = []) => db.query(sql, p);
const tx = (u, type, amount, status, at, extra = {}) => q(
  `insert into public.transactions (user_id, type, amount, status, transaction_date, processed_at, metadata) values ($1,$2,$3,$4,$5,$5,$6)`,
  [u, type, amount, status, at, JSON.stringify(extra)]);
const setBal = (u, admin, mining) => q(`update public.balances set admin_add=$2, mining_balance=$3 where user_id=$1`, [u, admin, mining]);
const bal = async (u) => (await q(`select admin_add::float a, mining_balance::float m, total_balance::float t from public.balances where user_id=$1`, [u])).rows[0];
const run = async (apply, exclude = []) => (await q(`select * from public.fn_reconcile_unrecorded_balances($1, $2::uuid[])`, [apply, exclude])).rows;

before(async () => {
  db = await createDb({ parsers: { 1700: (x) => parseFloat(x) } });
  phantom = await makeUser(db); referrer = await makeUser(db); buyer = await makeUser(db, {}); honest = await makeUser(db); low = await makeUser(db); partial = await makeUser(db);

  // phantom: records net to -1226.64 (the old negative adminAdd was clamped to 0, mining stayed 323.92)
  await tx(phantom, "ADMIN_ADD", 1126.08, "approved", "2026-05-25T10:00:00Z");
  await tx(phantom, "SHARE_SALE", 45, "completed", "2026-06-01T10:00:00Z");
  await tx(phantom, "SHARE_PURCHASE", 2700, "completed", "2026-06-02T10:00:00Z");
  await tx(phantom, "SHARE_PROFIT", 626.28, "completed", "2026-07-01T10:00:00Z");
  await tx(phantom, "withdrawal", 324, "approved", "2026-08-01T10:00:00Z");
  await setBal(phantom, 0, 323.92);

  // referrer: referred `buyer`, who bought twice (1000 -> 10% = 100, 500 -> 2% = 10); their balance holds the 110 but nothing was recorded
  await q(`update public.profiles set referred_by = $1 where id = $2`, [referrer, buyer]);
  await tx(buyer, "MACHINE_PURCHASE", 1000, "completed", "2026-06-01T10:00:00Z");
  await tx(buyer, "MACHINE_PURCHASE", 500, "completed", "2026-06-10T10:00:00Z");
  await tx(referrer, "ADMIN_ADD", 50, "approved", "2026-05-30T10:00:00Z");
  await setBal(referrer, 160, 0);          // 50 deposited + 110 referral bonuses

  await tx(honest, "ADMIN_ADD", 200, "approved", "2026-06-01T10:00:00Z"); await setBal(honest, 200, 0);
  await tx(low, "ADMIN_ADD", 200, "approved", "2026-06-01T10:00:00Z"); await setBal(low, 120, 0);          // balance below the records
  await tx(partial, "ADMIN_ADD", 50, "approved", "2026-06-01T10:00:00Z"); await setBal(partial, 30, 50);  // 30 too much
});

test("preview lists what is wrong and changes nothing", async () => {
  const rows = await run(false);
  const by = Object.fromEntries(rows.map((r) => [r.user_id, r]));
  assert.equal(by[phantom].action, "reduce");
  assert.equal(by[phantom].unexplained, 1550.56);
  assert.equal(by[phantom].new_balance, 0);
  assert.equal(by[partial].unexplained, 30);
  assert.equal(by[partial].new_balance, 50);
  assert.equal(by[referrer].referral_unrecorded, 110);
  assert.equal(by[referrer].action, "ok");
  assert.match(by[low].action, /^review/);
  assert.ok(!by[honest]);
  assert.deepEqual(await bal(phantom), { a: 0, m: 323.92, t: 323.92 });
});

test("excluded users are left alone", async () => {
  const rows = await run(false, [phantom]);
  assert.match(rows.find((r) => r.user_id === phantom).action, /^skipped/);
});

test("apply: removes unrecorded money, records earned referral bonuses, never touches 'review' users", async () => {
  await run(true);
  assert.deepEqual(await bal(phantom), { a: 0, m: 0, t: 0 });
  assert.deepEqual(await bal(partial), { a: 30, m: 20, t: 50 });          // mining is reduced first
  assert.deepEqual(await bal(honest), { a: 200, m: 0, t: 200 });
  assert.deepEqual(await bal(low), { a: 120, m: 0, t: 120 });             // lower than its records: reported, not changed
  assert.deepEqual(await bal(referrer), { a: 160, m: 0, t: 160 });       // the bonuses were real: now explained, not removed
  const bonuses = (await q(`select amount::float a, details from public.transactions where user_id=$1 and type='REFERRAL_BONUS' order by transaction_date`, [referrer])).rows;
  assert.deepEqual(bonuses.map((x) => x.a), [100, 10]);
  assert.match(bonuses[0].details, /10%/);
  assert.equal((await q(`select count(*)::int c from public.balance_reconciliation_log`)).rows[0].c, 2);   // phantom + partial
});

test("after applying, every user's records add up to their balance (except those flagged for review), and running balances end at it", async () => {
  const rows = await run(false);
  assert.deepEqual(rows.map((r) => r.action).sort(), [rows.find((r) => /^review/.test(r.action)).action]);   // only 'low' is left
  for (const u of [phantom, referrer, honest, partial]) {
    const last = (await q(`select balance_after::float a from public.transactions where user_id=$1 order by transaction_date desc, id limit 1`, [u])).rows[0].a;
    assert.equal(last, (await bal(u)).t);
  }
});

test("running it again changes nothing", async () => {
  const before = (await q(`select count(*)::int c from public.transactions`)).rows[0].c;
  await run(true);
  assert.equal((await q(`select count(*)::int c from public.transactions`)).rows[0].c, before);
  assert.equal((await q(`select count(*)::int c from public.balance_reconciliation_log`)).rows[0].c, 2);
});

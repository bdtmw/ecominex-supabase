import { test, before } from "node:test";
import assert from "node:assert/strict";
import { createDb, makeUser } from "./harness.mjs";

let db, ahmad, referrer, buyer, honest, low;
const q = (sql, p = []) => db.query(sql, p);
const tx = (u, type, amount, status, at) => q(`insert into public.transactions (user_id, type, amount, status, transaction_date, processed_at) values ($1,$2,$3,$4,$5,$5)`, [u, type, amount, status, at]);
const setBal = (u, a, m) => q(`update public.balances set admin_add=$2, mining_balance=$3 where user_id=$1`, [u, a, m]);
const bal = async (u) => (await q(`select admin_add::float a, mining_balance::float m, total_balance::float t from public.balances where user_id=$1`, [u])).rows[0];
const fix = async (apply, exclude = []) => (await q(`select * from public.fn_fix_balances($1, $2::uuid[])`, [apply, exclude])).rows;

before(async () => {
  db = await createDb({ parsers: { 1700: (x) => parseFloat(x) } });
  ahmad = await makeUser(db); referrer = await makeUser(db); buyer = await makeUser(db); honest = await makeUser(db); low = await makeUser(db);
  // Ahmad exactly as in the old system: adminAdd was -323.92 (clamped to 0 by the import), mining 323.92, real total 0, records net -1226.64
  await tx(ahmad, "ADMIN_ADD", 1126.08, "approved", "2026-05-25T14:32:00Z");
  await tx(ahmad, "SHARE_SALE", 45, "completed", "2026-06-01T10:00:00Z");
  await tx(ahmad, "SHARE_PROFIT", 626.28, "completed", "2026-07-01T10:00:00Z");
  await tx(ahmad, "SHARE_PURCHASE", 2700, "completed", "2026-07-02T10:00:00Z");
  await tx(ahmad, "withdrawal", 324, "approved", "2026-08-01T10:00:00Z");
  await setBal(ahmad, 0, 323.92);
  await q(`update public.profiles set referred_by = $1 where id = $2`, [referrer, buyer]);
  await tx(buyer, "MACHINE_PURCHASE", 1000, "completed", "2026-06-01T10:00:00Z");
  await tx(buyer, "MACHINE_PURCHASE", 500, "completed", "2026-06-10T10:00:00Z");
  await tx(referrer, "ADMIN_ADD", 50, "approved", "2026-05-30T10:00:00Z"); await setBal(referrer, 160, 0);
  await tx(honest, "ADMIN_ADD", 200, "approved", "2026-06-01T10:00:00Z"); await setBal(honest, 200, 0);
  await tx(low, "ADMIN_ADD", 200, "approved", "2026-06-01T10:00:00Z"); await setBal(low, 120, 0);
});

test("preview: Ahmad loses the phantom 323.92 and gets a 1226.64 correction; nothing is changed yet", async () => {
  const rows = await fix(false);
  const a = rows.find((r) => r.user_id === ahmad);
  assert.equal(a.balance_before, 323.92); assert.equal(a.balance_after, 0);
  assert.equal(a.balance_reduced, 323.92); assert.equal(a.correction_added, 1226.64);
  assert.ok(!rows.find((r) => r.user_id === honest));
  assert.match(rows.find((r) => r.user_id === low).action, /^review/);
  assert.equal(rows.find((r) => r.user_id === referrer).referral_added, 110);
  assert.deepEqual(await bal(ahmad), { a: 0, m: 323.92, t: 323.92 });
});

test("apply: balance 0, one correction of 1226.64, history never goes minus and ends at 0", async () => {
  await fix(true);
  assert.deepEqual(await bal(ahmad), { a: 0, m: 0, t: 0 });
  const adj = (await q(`select amount::float a from public.transactions where user_id=$1 and type='ADJUSTMENT'`, [ahmad])).rows;
  assert.deepEqual(adj.map((x) => x.a), [1226.64]);
  const net = (await q(`select sum(signed_amount)::float n from public.v_ledger where user_id=$1`, [ahmad])).rows[0].n;
  assert.ok(Math.abs(net) < 0.005);
  const chain = (await q(`select balance_after::float a from public.transactions where user_id=$1 order by transaction_date, id`, [ahmad])).rows.map((x) => x.a);
  assert.ok(chain.every((x) => x >= 0), JSON.stringify(chain));
  assert.equal(chain.at(-1), 0);
});

test("referral bonuses are recorded (not removed); honest and 'review' users are untouched", async () => {
  assert.deepEqual(await bal(referrer), { a: 160, m: 0, t: 160 });
  assert.deepEqual((await q(`select amount::float a from public.transactions where user_id=$1 and type='REFERRAL_BONUS' order by transaction_date`, [referrer])).rows.map((x) => x.a), [100, 10]);
  assert.deepEqual(await bal(honest), { a: 200, m: 0, t: 200 });
  assert.deepEqual(await bal(low), { a: 120, m: 0, t: 120 });
});

test("running it again changes nothing, and excluded users are skipped", async () => {
  const before = (await q(`select count(*)::int c from public.transactions`)).rows[0].c;
  const rows = await fix(true);
  assert.deepEqual(rows.map((r) => r.action), [rows.find((r) => /^review/.test(r.action)).action]);
  assert.equal((await q(`select count(*)::int c from public.transactions`)).rows[0].c, before);
  assert.match((await fix(false, [low])).find((r) => r.user_id === low).action, /^skipped/);
});

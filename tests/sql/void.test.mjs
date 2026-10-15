// Ahmad's real history: cancel the purchases that no recorded balance could pay for, and bring the balance back in line.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { createDb, makeUser } from "./harness.mjs";

let db, ahmad, other;
const q = (sql, p = []) => db.query(sql, p);
const T = [
  ["ADMIN_ADD", "approved", 50, "2026-05-25T14:32:05.028Z"], ["SHARE_PURCHASE", "completed", 50, "2026-05-25T14:38:46.300Z"],
  ["SHARE_SALE", "completed", 45, "2026-06-01T19:12:42.169Z"], ["ADMIN_ADD", "approved", 6, "2026-06-11T14:42:33.245Z"],
  ["ADMIN_ADD", "approved", 10, "2026-06-12T12:24:27.999Z"], ["withdrawal", "rejected", 60, "2026-06-12T13:29:18.869Z"],
  ["withdrawal", "rejected", 60, "2026-06-12T14:01:24.447Z"], ["withdrawal", "approved", 61, "2026-06-12T17:56:26.191Z"],
  ["ADMIN_ADD", "approved", 404, "2026-06-28T12:01:34.960Z"], ["SHARE_PURCHASE", "completed", 400, "2026-06-28T12:08:34.144Z"],
  ["SHARE_PROFIT", "completed", 73.68, "2026-07-03T11:45:02.092Z"],
  ["SHARE_PROFIT", "completed", 73.68, "2026-07-03T12:11:33.894Z", "[REVERSAL] Incorrect early profit payout for shares x — reversed"],
  ["ADMIN_ADD", "approved", 30.38, "2026-07-12T16:28:19.970Z"], ["SHARE_PROFIT", "completed", 73.68, "2026-07-29T13:54:17.420Z"],
  ["withdrawal", "approved", 108, "2026-07-30T17:17:24.360Z"], ["ADMIN_ADD", "approved", 526, "2026-07-30T22:50:56.398Z"],
  ["SHARE_PURCHASE", "completed", 500, "2026-07-31T10:08:55.458Z"], ["ADMIN_ADD", "approved", 99.7, "2026-07-31T11:15:03.364Z"],
  ["SHARE_PURCHASE", "completed", 100, "2026-07-31T11:20:13.579Z"], ["SHARE_PROFIT", "completed", 73.68, "2026-08-27T19:00:19.067Z"],
  ["SHARE_PURCHASE", "completed", 50, "2026-08-30T09:41:02.104Z"], ["SHARE_PROFIT", "completed", 92.1, "2026-08-30T19:00:19.594Z"],
  ["SHARE_PROFIT", "completed", 18.42, "2026-08-30T19:00:20.535Z"], ["SHARE_PURCHASE", "completed", 150, "2026-08-30T22:55:27.142Z"],
  ["SHARE_PROFIT", "completed", 73.68, "2026-09-26T19:00:17.340Z"], ["SHARE_PURCHASE", "completed", 600, "2026-09-27T00:24:28.027Z"],
  ["SHARE_PURCHASE", "completed", 850, "2026-09-27T00:26:20.439Z"], ["SHARE_PROFIT", "completed", 92.1, "2026-09-29T19:00:20.529Z"],
  ["SHARE_PROFIT", "completed", 18.42, "2026-09-29T19:00:21.540Z"], ["SHARE_PROFIT", "completed", 9.21, "2026-09-29T19:00:22.547Z"],
  ["SHARE_PROFIT", "completed", 27.63, "2026-09-30T07:00:21.014Z"], ["withdrawal", "approved", 155, "2026-09-30T15:46:06.301Z"],
];
const SHARES = [[1, 50, "2026-05-25T14:38:46.083Z", "inactive"], [8, 400, "2026-06-28T12:08:33.936Z", "active"], [10, 500, "2026-07-31T10:08:55.237Z", "active"],
  [2, 100, "2026-07-31T11:20:13.372Z", "active"], [1, 50, "2026-08-30T09:41:01.912Z", "active"], [3, 150, "2026-08-30T22:55:26.953Z", "active"],
  [12, 600, "2026-09-27T00:24:27.830Z", "active"], [17, 850, "2026-09-27T00:26:20.246Z", "active"]];
const fn = async (apply) => (await q(`select * from public.fn_void_unfunded_purchases($1, $2)`, [ahmad, apply])).rows;
const bal = async (u) => (await q(`select admin_add::float a, mining_balance::float m, total_balance::float t from public.balances where user_id=$1`, [u])).rows[0];

before(async () => {
  db = await createDb({ parsers: { 1700: (x) => parseFloat(x) } });
  ahmad = await makeUser(db); other = await makeUser(db);
  for (const [type, status, amount, at, details] of T) await q(`insert into public.transactions (user_id, type, amount, status, transaction_date, processed_at, details) values ($1,$2,$3,$4,$5,$5,$6)`, [ahmad, type, amount, status, at, details ?? null]);
  const machine = (await q(`insert into public.mining_machines (machine_name, hashrate, power_consumption, price_range, coins_mined, monthly_profit, description, is_share_based, share_price, total_shares, available_shares, profit_per_share) values ('GoldShell KD 6 II','26 TH/s',3000,19000,'KDA',3500,'x',true,50,380,380,9.21) returning id`)).rows[0].id;
  for (const [n, amt, at, st] of SHARES) await q(`insert into public.share_purchases (user_id, machine_id, number_of_shares, price_per_share, profit_per_share, total_investment, purchase_date, last_profit_update, status) values ($1,$2,$3,50,9.21,$4,$5,$5,$6)`, [ahmad, machine, n, amt, at, st]);
  await q(`update public.balances set admin_add = 0, mining_balance = 323.92 where user_id=$1`, [ahmad]);   // as imported (clamped)
  await q(`update public.balances set admin_add = 100 where user_id=$1`, [other]);
  await q(`insert into public.transactions (user_id, type, amount, status) values ($1,'ADMIN_ADD',100,'approved')`, [other]);
  // the "Balance correction" from an earlier step is present too (balance already 0 after fn_fix_balances)
  await q(`select * from public.fn_fix_balances(true)`);
});

test("preview names exactly the two 27 Sep purchases and the balance the records support (76.00); nothing changes", async () => {
  const rows = await fn(false);
  const voids = rows.filter((r) => r.step === "void purchase");
  assert.deepEqual(voids.map((r) => r.amount), [600, 850]);
  assert.equal(rows.find((r) => r.step === "new balance").amount, 76);
  assert.ok(rows.some((r) => r.step === "remove correction"));
  assert.equal((await q(`select count(*)::int c from public.share_purchases where user_id=$1 and status='cancelled'`, [ahmad])).rows[0].c, 0);
});

test("apply: purchases voided, correction removed (copy kept), 29 shares cancelled, balance 76.00, records add up", async () => {
  await fn(true);
  assert.deepEqual(await bal(ahmad), { a: 0, m: 76, t: 76 });
  const tx = (await q(`select amount::float a, status, admin_comment from public.transactions where user_id=$1 and type='SHARE_PURCHASE' and amount in (600,850) order by amount`, [ahmad])).rows;
  assert.deepEqual(tx.map((x) => x.status), ["rejected", "rejected"]);
  assert.match(tx[0].admin_comment, /not funded/);
  assert.equal((await q(`select count(*)::int c from public.transactions where user_id=$1 and type='ADJUSTMENT'`, [ahmad])).rows[0].c, 0);
  const snap = (await q(`select snapshot from public.purchase_void_log where user_id=$1 and action='removed correction'`, [ahmad])).rows;
  assert.equal(snap.length, 1); assert.equal(snap[0].snapshot.amount, 1374);
  const sp = (await q(`select number_of_shares n, status from public.share_purchases where user_id=$1 and total_investment in (600,850) order by total_investment`, [ahmad])).rows;
  assert.deepEqual(sp.map((x) => x.status), ["cancelled", "cancelled"]);
  assert.equal((await q(`select coalesce(sum(number_of_shares),0)::int n from public.share_purchases where user_id=$1 and status='active'`, [ahmad])).rows[0].n, 24);
  const net = (await q(`select sum(signed_amount)::float n from public.v_ledger where user_id=$1`, [ahmad])).rows[0].n;
  assert.ok(Math.abs(net - 76) < 0.005);
  const chain = (await q(`select balance_after::float a from public.transactions where user_id=$1 order by transaction_date, id`, [ahmad])).rows.map((x) => x.a);
  assert.ok(chain.every((x) => x >= -0.005), JSON.stringify(chain)); assert.equal(chain.at(-1), 76);
});

test("other users are untouched, and running it again changes nothing", async () => {
  assert.deepEqual(await bal(other), { a: 100, m: 0, t: 100 });
  const before = (await q(`select count(*)::int c from public.purchase_void_log`)).rows[0].c;
  const rows = await fn(true);
  assert.equal(rows.filter((r) => r.step === "void purchase").length, 0);
  assert.equal((await q(`select count(*)::int c from public.purchase_void_log`)).rows[0].c, before);
  assert.deepEqual(await bal(ahmad), { a: 0, m: 76, t: 76 });
});

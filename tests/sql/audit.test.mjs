// Ahmad's real history: cancel the purchases that no recorded balance could pay for, and bring the balance back in line.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { createDb, makeUser } from "./harness.mjs";

import { readFileSync } from "node:fs";
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
const audit = async (email) => (await q(readFileSync(new URL("../../supabase/audit_user.sql", import.meta.url), "utf8").replace("ahmadmagharba@hotmail.com", email))).rows;

before(async () => {
  db = await createDb({ parsers: { 1700: (x) => parseFloat(x) } });
  ahmad = await makeUser(db);
  for (const [type, status, amount, at, details] of T) await q(`insert into public.transactions (user_id, type, amount, status, transaction_date, processed_at, details) values ($1,$2,$3,$4,$5,$5,$6)`, [ahmad, type, amount, status, at, details ?? null]);
  const machine = (await q(`insert into public.mining_machines (machine_name, hashrate, power_consumption, price_range, coins_mined, monthly_profit, description, is_share_based, share_price, total_shares, available_shares, profit_per_share) values ('GoldShell KD 6 II','26 TH/s',3000,19000,'KDA',3500,'x',true,50,380,380,9.21) returning id`)).rows[0].id;
  for (const [n, amt, at, st] of SHARES) await q(`insert into public.share_purchases (user_id, machine_id, number_of_shares, price_per_share, profit_per_share, total_investment, purchase_date, last_profit_update, status) values ($1,$2,$3,50,9.21,$4,$5,$5,$6)`, [ahmad, machine, n, amt, at, st]);
  await q(`update public.balances set admin_add = 0, mining_balance = 323.92 where user_id=$1`, [ahmad]);
});

const email = async () => (await q(`select email from public.profiles where id=$1`, [ahmad])).rows[0].email;
const bad = (rows) => rows.filter((r) => r.status === "CHECK").map((r) => r.check);

test("before the fix the audit flags the problems", async () => {
  const rows = await audit(await email());
  assert.ok(bad(rows).length >= 2, JSON.stringify(bad(rows)));
  assert.ok(bad(rows).some((c) => /net of every recorded/.test(c)));
});

test("after the fix every check is OK and the figures are the expected ones", async () => {
  await q(`select * from public.fn_void_unfunded_purchases($1, true)`, [ahmad]);
  const rows = await audit(await email());
  assert.deepEqual(bad(rows), [], JSON.stringify(rows.filter((r) => r.status === "CHECK")));
  const info = Object.fromEntries(rows.filter((r) => r.status === "info").map((r) => [r.check, r.actual]));
  assert.equal(info["Active shares owned"], "24");
  assert.equal(Number(info["Monthly profit of those shares"]), 221.04);
  assert.equal(info["Machines owned (user_machines)"], "0");
  assert.match(info["Current balance (deposited + profit)"], /^76\.00 /);
  assert.equal(Number(info["Deposits credited (admin + NOWPayments)"]), 1126.08);
  assert.equal(Number(info["Share profit paid (net of reversals)"]), 478.92);
  assert.equal(Number(info["Withdrawals paid out"]), 324);
  assert.equal(Number(info["Money spent on shares (completed purchases)"]), 1250);
});

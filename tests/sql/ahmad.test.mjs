// Ahmad's real MongoDB history (32 transactions), imported as-is with his clamped balance (admin_add 0, mining 323.92).
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { createDb, makeUser } from "./harness.mjs";

let db, ahmad;
const q = (sql, p = []) => db.query(sql, p);
const T = [
  ["ADMIN_ADD", "approved", 50, "2026-05-25T14:32:05.028Z", "Admin balance add: $50"],
  ["SHARE_PURCHASE", "completed", 50, "2026-05-25T14:38:46.300Z"], ["SHARE_SALE", "completed", 45, "2026-06-01T19:12:42.169Z"],
  ["ADMIN_ADD", "approved", 6, "2026-06-11T14:42:33.245Z"], ["ADMIN_ADD", "approved", 10, "2026-06-12T12:24:27.999Z"],
  ["withdrawal", "rejected", 60, "2026-06-12T13:29:18.869Z"], ["withdrawal", "rejected", 60, "2026-06-12T14:01:24.447Z"],
  ["withdrawal", "approved", 61, "2026-06-12T17:56:26.191Z"], ["ADMIN_ADD", "approved", 404, "2026-06-28T12:01:34.960Z"],
  ["SHARE_PURCHASE", "completed", 400, "2026-06-28T12:08:34.144Z"], ["SHARE_PROFIT", "completed", 73.68, "2026-07-03T11:45:02.092Z"],
  ["SHARE_PROFIT", "completed", 73.68, "2026-07-03T12:11:33.894Z", "[REVERSAL] Incorrect early profit payout for shares 6a410ec1490de8868d06334b — reversed"],
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

before(async () => {
  db = await createDb({ parsers: { 1700: (x) => parseFloat(x) } });
  ahmad = await makeUser(db);
  for (const [type, status, amount, at, details] of T) {
    await q(`insert into public.transactions (user_id, type, amount, status, transaction_date, processed_at, details) values ($1,$2,$3,$4,$5,$5,$6)`, [ahmad, type, amount, status, at, details ?? null]);
  }
  await q(`update public.balances set admin_add = 0, mining_balance = 323.92 where user_id=$1`, [ahmad]);   // after the import's clamp
});

test("the profit reversal is a debit, so the records net to -1374.00 (not -1226.64)", async () => {
  const net = (await q(`select sum(signed_amount)::float n from public.v_ledger where user_id=$1`, [ahmad])).rows[0].n;
  assert.ok(Math.abs(net + 1374) < 0.005, String(net));
  const rev = (await q(`select type_label, direction from public.v_ledger where user_id=$1 and description like '[REVERSAL]%'`, [ahmad])).rows[0];
  assert.deepEqual(rev, { type_label: "Profit reversal", direction: "debit" });
});

test("fix: balance 323.92 -> 0 and one 1374.00 correction placed just before the 27 Sep purchases", async () => {
  const p = (await q(`select * from public.fn_fix_balances(false)`)).rows.find((r) => r.user_id === ahmad);
  assert.equal(p.balance_reduced, 323.92); assert.equal(p.correction_added, 1374);
  await q(`select * from public.fn_fix_balances(true)`);
  const bal = (await q(`select total_balance::float t from public.balances where user_id=$1`, [ahmad])).rows[0].t;
  assert.equal(bal, 0);
  const adj = (await q(`select amount::float a, transaction_date from public.transactions where user_id=$1 and type='ADJUSTMENT'`, [ahmad])).rows;
  assert.equal(adj.length, 1); assert.equal(adj[0].a, 1374);
  assert.equal(new Date(adj[0].transaction_date).toISOString(), "2026-09-27T00:24:27.027Z");
});

test("his whole history now runs from zero, never goes below zero, and ends at 0.00 (155.00 just before his last withdrawal)", async () => {
  const chain = (await q(`select type, balance_after::float a from public.transactions where user_id=$1 order by transaction_date, id`, [ahmad])).rows;
  assert.ok(chain.every((x) => x.a >= -0.005), JSON.stringify(chain.filter((x) => x.a < 0)));
  assert.equal(chain.at(-1).a, 0);
  assert.ok(Math.abs(chain.at(-2).a - 155) < 0.005);
  const net = (await q(`select sum(signed_amount)::float n from public.v_ledger where user_id=$1`, [ahmad])).rows[0].n;
  assert.ok(Math.abs(net) < 0.005);
});

import { test, before } from "node:test";
import assert from "node:assert/strict";
import { createDb, makeUser } from "./harness.mjs";

let db, ahmad, admin, fine;
const q = (sql, p = []) => db.query(sql, p);
const tx = (u, type, amount, status, at) => q(`insert into public.transactions (user_id, type, amount, status, transaction_date, processed_at) values ($1,$2,$3,$4,$5,$5)`, [u, type, amount, status, at]);
const run = async (apply, exclude = []) => (await q(`select * from public.fn_record_unexplained_balances($1, $2::uuid[])`, [apply, exclude])).rows;

before(async () => {
  db = await createDb({ parsers: { 1700: (x) => parseFloat(x) } });
  admin = await makeUser(db, { role: "admin" }); ahmad = await makeUser(db); fine = await makeUser(db);
  await tx(ahmad, "ADMIN_ADD", 1126.08, "approved", "2026-05-25T14:32:00Z");
  await tx(ahmad, "SHARE_SALE", 45, "completed", "2026-06-01T10:00:00Z");
  await tx(ahmad, "SHARE_PROFIT", 626.28, "completed", "2026-07-01T10:00:00Z");
  await tx(ahmad, "SHARE_PURCHASE", 2700, "completed", "2026-07-02T10:00:00Z");
  await tx(ahmad, "withdrawal", 324, "approved", "2026-08-01T10:00:00Z");
  await q(`update public.balances set admin_add = 0, mining_balance = 323.92 where user_id=$1`, [ahmad]);
  await tx(fine, "ADMIN_ADD", 100, "approved", "2026-06-01T10:00:00Z");
  await q(`update public.balances set admin_add = 100 where user_id=$1`, [fine]);
});

test("preview shows the correction and changes nothing", async () => {
  const rows = await run(false);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].correction, 1550.56);
  assert.equal((await q(`select count(*)::int c from public.transactions where type='ADJUSTMENT'`)).rows[0].c, 0);
});

test("apply records one dated, labelled correction; the balance is untouched and the books add up", async () => {
  await run(true);
  const adj = (await q(`select amount::float a, transaction_date, type from public.transactions where user_id=$1 and type='ADJUSTMENT'`, [ahmad])).rows;
  assert.equal(adj.length, 1); assert.equal(adj[0].a, 1550.56);
  assert.ok(new Date(adj[0].transaction_date) < new Date("2026-05-25T14:32:00Z"));       // before his first entry
  assert.equal((await q(`select total_balance::float t from public.balances where user_id=$1`, [ahmad])).rows[0].t, 323.92);
  const net = (await q(`select sum(signed_amount)::float n from public.v_ledger where user_id=$1`, [ahmad])).rows[0].n;
  assert.ok(Math.abs(net - 323.92) < 0.005);
  const chain = (await q(`select balance_after::float a from public.transactions where user_id=$1 order by transaction_date, id`, [ahmad])).rows.map((x) => x.a);
  assert.ok(chain.every((x) => x >= 0), JSON.stringify(chain));                                // never minus
  assert.equal(chain[0], 1550.56); assert.equal(chain.at(-1), 323.92);
  assert.equal((await run(false)).length, 0);                                                    // nothing unexplained any more
});

test("it shows as 'Balance correction' (category adjustment), not as a deposit", async () => {
  const l = (await q(`select type_label, category, direction from public.v_ledger where user_id=$1 and type='ADJUSTMENT'`, [ahmad])).rows[0];
  assert.deepEqual(l, { type_label: "Balance correction", category: "adjustment", direction: "credit" });
  const k = (await q(`select public.fn_admin_kpis($1, '2026-05-01', '2026-09-01') as r`, [admin])).rows[0].r;
  assert.equal(k.current.deposits, 1226.08);          // 1126.08 + 100: the correction is not a deposit
});

test("running it again adds nothing", async () => {
  await run(true);
  assert.equal((await q(`select count(*)::int c from public.transactions where type='ADJUSTMENT'`)).rows[0].c, 1);
});

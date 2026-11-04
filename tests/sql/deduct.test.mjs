import { test, before } from "node:test";
import assert from "node:assert/strict";
import { createDb, makeUser } from "./harness.mjs";

let db, admin, u, holder, plain;
const q = (sql, p = []) => db.query(sql, p);
const deduct = (user, amt = null, note = "test") => q(`select public.fn_admin_deduct_balance($1,$2,$3,$4) as r`, [admin, user, amt, note]);

before(async () => {
  db = await createDb({ parsers: { 1700: (x) => parseFloat(x) } });
  admin = await makeUser(db, { role: "admin" }); u = await makeUser(db); holder = await makeUser(db); plain = await makeUser(db);
  await q(`insert into public.transactions (user_id, type, amount, status, transaction_date, processed_at) values ($1,'ADMIN_ADD',1000,'approved','2026-06-01T10:00:00Z','2026-06-01T10:00:00Z')`, [u]);
  await q(`insert into public.transactions (user_id, type, amount, status, transaction_date, processed_at) values ($1,'SHARE_PROFIT',505,'completed','2026-07-01T10:00:00Z','2026-07-01T10:00:00Z')`, [u]);
  await q(`update public.balances set admin_add = 1000, mining_balance = 505 where user_id=$1`, [u]);
  await q(`insert into public.transactions (user_id, type, amount, status, transaction_date, processed_at) values ($1,'ADMIN_ADD',200,'approved','2026-06-01T10:00:00Z','2026-06-01T10:00:00Z')`, [holder]);
  await q(`insert into public.transactions (user_id, type, amount, status, wallet_address, network) values ($1,'withdrawal',150,'pending','0xabc','ERC20')`, [holder]);
  await q(`update public.balances set admin_add = 200 where user_id=$1`, [holder]);
});

test("a partial deduction comes from profit first and is a visible debit", async () => {
  const r = (await deduct(u, 5)).rows[0].r;
  assert.equal(r.type, "ADMIN_DEDUCT");
  const b = (await q(`select admin_add::float a, mining_balance::float m, total_balance::float t from public.balances where user_id=$1`, [u])).rows[0];
  assert.deepEqual(b, { a: 1000, m: 500, t: 1500 });
});

test("zeroing (null amount) takes everything, the ledger shows one Admin deduction and the books add up", async () => {
  await deduct(u, null, "Test account reset");
  const b = (await q(`select total_balance::float t from public.balances where user_id=$1`, [u])).rows[0];
  assert.equal(b.t, 0);
  const l = (await q(`select type_label, direction, signed_amount::float s, category from public.v_ledger where user_id=$1 and type='ADMIN_DEDUCT' order by transaction_date`, [u])).rows;
  assert.equal(l.length, 2);
  assert.equal(l[1].type_label, "Admin deduction"); assert.equal(l[1].direction, "debit"); assert.equal(l[1].s, -1500); assert.equal(l[1].category, "adjustment");
  const net = (await q(`select sum(signed_amount)::float n from public.v_ledger where user_id=$1`, [u])).rows[0].n;
  assert.equal(net, 0);                                                                     // ledger net == balance
});

test("it is not counted as a deposit, withdrawal or cash flow", async () => {
  const k = (await q(`select public.fn_admin_kpis($1, now() - interval '1 year', now() + interval '1 day') as r`, [admin])).rows[0].r;
  assert.equal(k.current.withdrawals, 0);
  assert.equal(k.current.deposits, 1200);                                                    // only the real deposits (u 1000 + holder 200)
});

test("money on hold for a pending withdrawal cannot be deducted", async () => {
  await assert.rejects(deduct(holder), /held by pending withdrawals/);
  await deduct(holder, 50);                                                                  // the free part is fine
  assert.equal((await q(`select total_balance::float t from public.balances where user_id=$1`, [holder])).rows[0].t, 150);
});

test("empty balance, unknown user and non-admin are refused", async () => {
  await assert.rejects(deduct(plain), /Nothing to deduct/);
  await assert.rejects(deduct("00000000-0000-0000-0000-000000000000"), /User not found/);
  await assert.rejects(q(`select public.fn_admin_deduct_balance($1,$2,null,null)`, [plain, u]), /Only admins/);
});

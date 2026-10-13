import { test, before, describe } from "node:test";
import assert from "node:assert/strict";
import { createDb, makeUser, makeMachine, balanceOf, err } from "./harness.mjs";

let db;
before(async () => { db = await createDb(); });

const call = (fn, ...args) =>
  db.query(`select public.${fn}(${args.map((_, i) => `$${i + 1}`).join(",")}) as r`, args).then((r) => r.rows[0].r);

describe("machine purchase", () => {
  test("charges the buyer, creates machines and pays the referrer 10% on the first purchase", async () => {
    const referrer = await makeUser(db);
    const buyer = await makeUser(db, { adminAdd: 2500, referredBy: referrer });
    const machine = await makeMachine(db);
    const r = await call("fn_purchase_machine", buyer, machine, 2);
    assert.equal(r.userMachineIds.length, 2);
    assert.equal((await balanceOf(db, buyer)).a, 500);
    assert.equal((await balanceOf(db, referrer)).a, 200); // 10% of 2000
    assert.equal((await balanceOf(db, referrer)).t, 200); // total recalculates correctly
    const { rows } = await db.query(`select discount::float d, referral_status s from public.profiles where id=$1`, [buyer]);
    assert.deepEqual(rows[0], { d: 200, s: "active" });
  });

  test("second purchase pays the referrer only 2%", async () => {
    const referrer = await makeUser(db);
    const buyer = await makeUser(db, { adminAdd: 3000, referredBy: referrer });
    const machine = await makeMachine(db);
    await call("fn_purchase_machine", buyer, machine, 1);
    await call("fn_purchase_machine", buyer, machine, 1);
    assert.equal((await balanceOf(db, referrer)).a, 100 + 20);
  });

  test("mining profit cannot pay for a purchase, and nothing changes on failure", async () => {
    const u = await makeUser(db, { adminAdd: 1500, mining: 5000 });
    const machine = await makeMachine(db);
    const e = await err(call("fn_purchase_machine", u, machine, 2));
    assert.equal(e.code, "P0001");
    assert.match(e.message, /Insufficient balance/);
    assert.deepEqual(await balanceOf(db, u), { a: 1500, m: 5000, t: 6500 });
    assert.equal((await db.query(`select count(*)::int c from public.user_machines where user_id=$1`, [u])).rows[0].c, 0);
  });

  test("rejects invalid quantities and unknown machines", async () => {
    const u = await makeUser(db, { adminAdd: 1e6 });
    const machine = await makeMachine(db);
    for (const q of [0, -1, 101, null]) assert.equal((await err(call("fn_purchase_machine", u, machine, q))).code, "P0001");
    const e = await err(call("fn_purchase_machine", u, "00000000-0000-0000-0000-000000000000", 1));
    assert.equal(e.code, "P0002");
  });
});

describe("machine sale", () => {
  test("owner sells at 90% of the price recorded at purchase; others cannot; no double sale", async () => {
    const owner = await makeUser(db);
    const other = await makeUser(db);
    const machine = await makeMachine(db, { price: 1000 });
    const { rows } = await db.query(
      `insert into public.user_machines (user_id, machine_id, machine_name, hashrate, power_consumption, price_range, coins_mined, monthly_profit, description)
       values ($1,$2,'Miner','1',1,800,'BTC',100,'d') returning id`, [owner, machine]);
    const um = rows[0].id;

    assert.equal((await err(call("fn_sell_user_machine", other, um))).code, "P0002");
    assert.equal((await balanceOf(db, owner)).a, 0);

    const sale = await call("fn_sell_user_machine", owner, um);
    assert.equal(sale.sellingPrice, 720);
    assert.equal((await balanceOf(db, owner)).a, 720);
    assert.equal((await err(call("fn_sell_user_machine", owner, um))).code, "P0001");
  });

  test("an admin may sell on behalf of a user", async () => {
    const owner = await makeUser(db);
    const admin = await makeUser(db, { role: "admin" });
    const machine = await makeMachine(db);
    const { rows } = await db.query(
      `insert into public.user_machines (user_id, machine_id, machine_name, hashrate, power_consumption, price_range, coins_mined, monthly_profit, description)
       values ($1,$2,'Miner','1',1,100,'BTC',10,'d') returning id`, [owner, machine]);
    await call("fn_sell_user_machine", admin, rows[0].id);
    assert.equal((await balanceOf(db, owner)).a, 90);
  });
});

describe("share machine", () => {
  const shareMachine = () => makeMachine(db, { name: "Share", price: 19000, share: true, sharePrice: 50, profitPerShare: 10 });

  test("cap is on total shares held, not on number of purchases", async () => {
    await db.query(`delete from public.share_purchases`); await db.query(`delete from public.mining_machines where is_share_based`);
    await shareMachine();
    const a = await makeUser(db, { adminAdd: 1e5 });
    const b = await makeUser(db, { adminAdd: 1e5 });
    await call("fn_purchase_shares", a, 300);
    const over = await err(call("fn_purchase_shares", b, 81));
    assert.equal(over.code, "P0001");
    assert.match(over.message, /Only 80 shares/);
    await call("fn_purchase_shares", b, 80);
    assert.match((await err(call("fn_purchase_shares", b, 1))).message, /Only 0 shares/);
  });

  test("uses deposited funds only and rejects bad counts", async () => {
    await db.query(`delete from public.share_purchases`); await db.query(`delete from public.mining_machines where is_share_based`);
    await shareMachine();
    const u = await makeUser(db, { adminAdd: 100, mining: 10000 });
    for (const n of [0, -1, null]) assert.equal((await err(call("fn_purchase_shares", u, n))).code, "P0001");
    assert.match((await err(call("fn_purchase_shares", u, 3))).message, /Insufficient balance/); // 150 > 100
    await call("fn_purchase_shares", u, 2);
    assert.equal((await balanceOf(db, u)).a, 0);
  });

  test("only the owner can sell; partial sale reduces holding; 90% payout", async () => {
    await db.query(`delete from public.share_purchases`); await db.query(`delete from public.mining_machines where is_share_based`);
    await shareMachine();
    const owner = await makeUser(db, { adminAdd: 1000 });
    const other = await makeUser(db);
    const bought = await call("fn_purchase_shares", owner, 10);
    const id = bought.purchase.id;
    assert.equal((await err(call("fn_sell_shares", other, id, 10))).code, "P0002");
    const sale = await call("fn_sell_shares", owner, id, 4);
    assert.equal(sale.sellingPrice, 180);
    assert.equal(sale.remainingShares, 6);
    assert.equal((await balanceOf(db, owner)).a, 500 + 180);
    assert.equal((await err(call("fn_sell_shares", owner, id, 7))).code, "P0001");
    await call("fn_sell_shares", owner, id, 6);
    assert.equal((await err(call("fn_sell_shares", owner, id, 1))).code, "P0001"); // inactive now
  });
});

describe("withdrawals", () => {
  test("pending requests reduce what is available; negative/zero rejected", async () => {
    const u = await makeUser(db, { adminAdd: 100 });
    await call("fn_request_withdrawal", u, 80, "TXYZ", "TRC20");
    assert.equal((await err(call("fn_request_withdrawal", u, 80, "TXYZ", "TRC20"))).code, "P0001");
    for (const amt of [-5, 0, null]) assert.equal((await err(call("fn_request_withdrawal", u, amt, "TXYZ", "TRC20"))).code, "P0001");
    assert.equal((await err(call("fn_request_withdrawal", u, 5, "", "TRC20"))).code, "P0001");
    const r = await call("fn_request_withdrawal", u, 20, "TXYZ", "TRC20");
    assert.equal(r.availableBalance, 0);
  });

  test("approval deducts mining profit first, then deposited funds, exactly once", async () => {
    const u = await makeUser(db, { adminAdd: 100, mining: 30 });
    const admin = await makeUser(db, { role: "admin" });
    const { transaction } = await call("fn_request_withdrawal", u, 50, "TXYZ", "TRC20");
    const done = await call("fn_process_withdrawal", admin, transaction.id, "approved", "ok");
    assert.equal(done.status, "approved");
    assert.deepEqual(await balanceOf(db, u), { a: 80, m: 0, t: 80 });
    assert.equal((await err(call("fn_process_withdrawal", admin, transaction.id, "approved", null))).code, "P0001");
    assert.equal((await err(call("fn_process_withdrawal", admin, transaction.id, "rejected", null))).code, "P0001");
    assert.deepEqual(await balanceOf(db, u), { a: 80, m: 0, t: 80 });
  });

  test("rejection leaves balances untouched and frees the hold; non-admins are refused", async () => {
    const u = await makeUser(db, { adminAdd: 100 });
    const admin = await makeUser(db, { role: "admin" });
    const { transaction } = await call("fn_request_withdrawal", u, 100, "TXYZ", "TRC20");
    assert.equal((await err(call("fn_process_withdrawal", u, transaction.id, "approved", null))).code, "42501");
    await call("fn_process_withdrawal", admin, transaction.id, "rejected", "no");
    assert.equal((await balanceOf(db, u)).a, 100);
    await call("fn_request_withdrawal", u, 100, "TXYZ", "TRC20"); // available again
  });

  test("approval fails if the balance dropped below the amount since the request", async () => {
    const u = await makeUser(db, { adminAdd: 100 });
    const admin = await makeUser(db, { role: "admin" });
    const { transaction } = await call("fn_request_withdrawal", u, 100, "TXYZ", "TRC20");
    await db.query(`update public.balances set admin_add = 10 where user_id=$1`, [u]);
    assert.match((await err(call("fn_process_withdrawal", admin, transaction.id, "approved", null))).message, /Insufficient/);
  });
});

describe("admin balance and deposits", () => {
  test("only admins add balance, with a valid positive amount for an existing user", async () => {
    const admin = await makeUser(db, { role: "admin" });
    const user = await makeUser(db);
    assert.equal((await err(call("fn_admin_add_balance", user, user, 10))).code, "42501");
    assert.equal((await err(call("fn_admin_add_balance", admin, user, -10))).code, "P0001");
    assert.equal((await err(call("fn_admin_add_balance", admin, "00000000-0000-0000-0000-000000000000", 10))).code, "P0002");
    await call("fn_admin_add_balance", admin, user, 100);
    assert.equal((await balanceOf(db, user)).a, 100);
  });

  test("NOWPayments callbacks credit exactly once, however often they repeat", async () => {
    const u = await makeUser(db);
    const { rows } = await db.query(
      `insert into public.deposits (user_id, amount, transaction_id, account_type, payment_provider, payment_status)
       values ($1, 50, 'NP-1', 'NOWPayments', 'nowpayments', 'waiting') returning id`, [u]);
    const id = rows[0].id;
    const apply = (status) => call("fn_apply_nowpayments", id, "pay1", "inv1", status, "usdttrc20", 50, 50, JSON.stringify({ s: status }));
    assert.equal((await apply("confirming")).credited, false);
    assert.equal((await apply("finished")).credited, true);
    assert.equal((await apply("finished")).credited, false);
    assert.equal((await apply("finished")).credited, false);
    assert.equal((await balanceOf(db, u)).a, 50);
  });
});

describe("profit job", () => {
  const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();

  test("pays whole 30-day periods once and advances the schedule", async () => {
    const u = await makeUser(db);
    const machine = await makeMachine(db, { profit: 100 });
    const { rows } = await db.query(
      `insert into public.user_machines (user_id, machine_id, machine_name, hashrate, power_consumption, price_range, coins_mined, monthly_profit, description, assigned_date)
       values ($1,$2,'Miner','1',1,1000,'BTC',100,'d',$3) returning id`, [u, machine, daysAgo(65)]);

    const first = await call("fn_run_profit_update");
    assert.ok(first.normalProcessed >= 1);
    assert.equal((await balanceOf(db, u)).m, 200); // 2 months
    const second = await call("fn_run_profit_update");
    assert.equal((await balanceOf(db, u)).m, 200); // nothing more due
    assert.equal((await db.query(`select count(*)::int c from public.transactions where user_id=$1 and type='profit'`, [u])).rows[0].c, 1);
    const { rows: [um] } = await db.query(`select extract(day from (last_profit_update - assigned_date))::int as d from public.user_machines where id=$1`, [rows[0].id]);
    assert.equal(um.d, 60);
    assert.deepEqual(second.errors, []);
  });

  test("share profits are paid per 30-day period", async () => {
    await db.query(`delete from public.share_purchases`); await db.query(`delete from public.mining_machines where is_share_based`);
    const machine = await makeMachine(db, { name: "Share", price: 19000, share: true, profitPerShare: 10 });
    const u = await makeUser(db);
    await db.query(
      `insert into public.share_purchases (user_id, machine_id, number_of_shares, price_per_share, profit_per_share, total_investment, purchase_date, last_profit_update)
       values ($1,$2,5,50,10,250,$3,$3)`, [u, machine, daysAgo(31)]);
    await call("fn_run_profit_update");
    await call("fn_run_profit_update");
    assert.equal((await balanceOf(db, u)).m, 50);
  });

  test("owner can trigger their own machine only when due; others get not-found", async () => {
    const u = await makeUser(db);
    const other = await makeUser(db);
    const machine = await makeMachine(db, { profit: 100 });
    const { rows } = await db.query(
      `insert into public.user_machines (user_id, machine_id, machine_name, hashrate, power_consumption, price_range, coins_mined, monthly_profit, description, assigned_date)
       values ($1,$2,'Miner','1',1,1000,'BTC',100,'d',$3) returning id`, [u, machine, daysAgo(5)]);
    const early = await call("fn_pay_user_machine_profit", u, rows[0].id);
    assert.equal(early.paid, false);
    assert.equal((await balanceOf(db, u)).m, 0);
    assert.equal((await err(call("fn_pay_user_machine_profit", other, rows[0].id))).code, "P0002");
  });
});

describe("constraints", () => {
  test("balances can never go negative", async () => {
    const u = await makeUser(db, { adminAdd: 10 });
    const e = await err(db.query(`update public.balances set admin_add = admin_add - 11 where user_id=$1`, [u]));
    assert.equal(e.code, "23514");
  });
});

describe("NOWPayments callbacks (provider retries and out-of-order delivery)", () => {
  const mkDeposit = async (user, amount = 50, provider = "nowpayments") =>
    (await db.query(`insert into public.deposits (user_id, amount, transaction_id, account_type, payment_provider, payment_status)
                     values ($1,$2,'NP-x','NOWPayments',$3,'waiting') returning id`, [user, amount, provider])).rows[0].id;
  const apply = (id, status, extra = {}) =>
    call("fn_apply_nowpayments", id, extra.payment ?? "pay1", "inv1", status, "usdttrc20", extra.paid ?? 50, extra.amount ?? 50, JSON.stringify({ status }));
  const credits = async (u) => (await db.query(`select count(*)::int c from public.transactions where user_id=$1 and type='ADMIN_ADD'`, [u])).rows[0].c;
  const dep = async (id) => (await db.query(`select payment_status s, credited_at, review_note n from public.deposits where id=$1`, [id])).rows[0];

  test("a late 'confirming' after 'finished' cannot cause a second credit when 'finished' is retried", async () => {
    const u = await makeUser(db);
    const id = await mkDeposit(u);
    assert.equal((await apply(id, "confirming")).credited, false);
    assert.equal((await apply(id, "finished")).credited, true);
    await apply(id, "confirming");                       // delayed older notification arrives
    const retry = await apply(id, "finished");           // provider retries the final one
    assert.equal(retry.credited, false);
    assert.equal(retry.duplicate, true);
    assert.equal((await balanceOf(db, u)).a, 50);
    assert.equal(await credits(u), 1);
    assert.equal((await dep(id)).s, "finished");         // the final status never regresses
  });

  test("many repeats of 'finished', in any interleaving, still credit once", async () => {
    const u = await makeUser(db);
    const id = await mkDeposit(u, 120);
    for (const s of ["waiting", "finished", "finished", "sending", "confirmed", "finished", "waiting", "finished"]) await apply(id, s, { amount: 120, paid: 120 });
    assert.equal((await balanceOf(db, u)).a, 120);
    assert.equal(await credits(u), 1);
  });

  test("credits the invoiced amount and links the ledger entry to the deposit", async () => {
    const u = await makeUser(db);
    const id = await mkDeposit(u, 75);
    await apply(id, "finished", { amount: 75, paid: 75.4 });
    const row = (await db.query(`select amount::float a, metadata from public.transactions where user_id=$1 and type='ADMIN_ADD'`, [u])).rows[0];
    assert.equal(row.a, 75);
    assert.equal(row.metadata.depositId, id);
    assert.ok((await dep(id)).credited_at);
  });

  test("a provider price that differs from the invoice is held for review, not credited", async () => {
    const u = await makeUser(db);
    const id = await mkDeposit(u, 100);
    const r = await apply(id, "finished", { amount: 1000, paid: 1000 });
    assert.equal(r.credited, false); assert.equal(r.flagged, true);
    assert.equal((await balanceOf(db, u)).a, 0);
    const d = await dep(id);
    assert.equal(d.s, "review"); assert.match(d.n, /invoice was for 100/);
  });

  test("a partial payment is flagged for an admin and not credited", async () => {
    const u = await makeUser(db);
    const id = await mkDeposit(u, 100);
    const r = await apply(id, "partially_paid", { paid: 40, amount: 100 });
    assert.equal(r.credited, false); assert.equal(r.flagged, true);
    assert.equal((await balanceOf(db, u)).a, 0);
    assert.match((await dep(id)).n, /Partially paid: received 40 of 100/);
  });

  test("expired and failed invoices never credit", async () => {
    const u = await makeUser(db);
    for (const s of ["expired", "failed"]) { const id = await mkDeposit(u); await apply(id, s); assert.equal((await dep(id)).s, s); }
    assert.equal((await balanceOf(db, u)).a, 0);
  });

  test("a refund after crediting is flagged for review (no automatic debit) and cannot re-credit", async () => {
    const u = await makeUser(db);
    const id = await mkDeposit(u, 60);
    await apply(id, "finished", { amount: 60, paid: 60 });
    const r = await apply(id, "refunded", { amount: 60 });
    assert.equal(r.flagged, true);
    const d = await dep(id);
    assert.equal(d.s, "refunded"); assert.match(d.n, /refunded this payment after it was credited/);
    assert.equal((await balanceOf(db, u)).a, 60);
    await apply(id, "finished", { amount: 60, paid: 60 });
    assert.equal(await credits(u), 1);
  });

  test("a manual deposit cannot be credited through the provider callback", async () => {
    const u = await makeUser(db);
    const id = await mkDeposit(u, 500, "manual");
    assert.equal((await err(apply(id, "finished", { amount: 500 }))).code, "P0002");
    assert.equal((await balanceOf(db, u)).a, 0);
  });

  test("the database itself refuses a second credit entry for one deposit", async () => {
    const u = await makeUser(db);
    const id = await mkDeposit(u, 10);
    await apply(id, "finished", { amount: 10, paid: 10 });
    const e = await err(db.query(`insert into public.transactions (user_id, amount, type, status, metadata) values ($1, 10, 'ADMIN_ADD', 'approved', $2)`, [u, JSON.stringify({ depositId: id })]));
    assert.equal(e.code, "23505");
  });

  test("unknown deposits are rejected", async () => {
    assert.equal((await err(apply("00000000-0000-0000-0000-000000000000", "finished"))).code, "P0002");
  });
});

import { test, before, describe } from "node:test";
import assert from "node:assert/strict";
import { createDb, makeUser, makeMachine, err } from "./harness.mjs";

let db, admin, ann, bob, cy, dan, eve;
const DAY = 86400000;
const ago = (days, hours = 0) => new Date(Date.now() - days * DAY - hours * 3600000).toISOString();
const call = async (fn, ...args) =>
  (await db.query(`select public.${fn}(${args.map((_, i) => `$${i + 1}`).join(",")}) as r`, args)).rows[0].r;

async function tx(user, type, amount, status, when, extra = {}) {
  const { rows } = await db.query(
    `insert into public.transactions (user_id, amount, type, status, transaction_date, processed_at, details, metadata, wallet_address, balance_after)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning id`,
    [user, amount, type, status, when, extra.processedAt ?? (status === "pending" ? null : when), extra.details ?? null,
     JSON.stringify(extra.metadata ?? {}), extra.wallet ?? null, extra.balanceAfter ?? null]);
  return rows[0].id;
}

before(async () => {
  db = await createDb();
  admin = await makeUser(db, { role: "admin" });
  // profile created_at drives "new users" and the 7/30-day segments
  ann = await makeUser(db, { adminAdd: 600, mining: 150 });  // active depositor, has machine, pending withdrawal
  bob = await makeUser(db, { adminAdd: 1000 });              // old, holds funds, no activity for 60 days -> dormant
  cy = await makeUser(db);                                    // new (2 days), never deposited
  dan = await makeUser(db, { adminAdd: 50, referredBy: ann }); // referred by ann
  eve = await makeUser(db);
  await db.query(`update public.profiles set created_at = $2 where id = $1`, [ann, ago(40)]);
  await db.query(`update public.profiles set created_at = $2 where id = $1`, [bob, ago(90)]);
  await db.query(`update public.profiles set created_at = $2 where id = $1`, [cy, ago(2)]);
  await db.query(`update public.profiles set created_at = $2 where id = $1`, [dan, ago(35)]);
  await db.query(`update public.profiles set created_at = $2 where id = $1`, [eve, ago(100)]);
  await db.query(`update public.profiles set first_name='Ann', last_name='Alpha', email='ann@alpha.com', country='PK' where id=$1`, [ann]);
  await db.query(`update public.profiles set first_name='Bob', last_name='Beta', email='bob@beta.com', country='US' where id=$1`, [bob]);

  const machine = await makeMachine(db, { name: "S19 Pro", price: 500 });
  await db.query(`insert into public.user_machines (user_id, machine_id, machine_name, hashrate, power_consumption, price_range, coins_mined, monthly_profit, description) values ($1,$2,'S19 Pro','1',1,500,'BTC',50,'d')`, [ann, machine]);

  // current window = last 30 days, previous window = the 30 days before that
  await tx(ann, "ADMIN_ADD", 1000, "approved", ago(10), { details: "Deposit" });
  await tx(ann, "ADMIN_ADD", 500, "approved", ago(5), { details: "Deposit 2" });
  await tx(bob, "ADMIN_ADD", 2000, "approved", ago(70), { details: "Old deposit" });                  // outside both windows
  await tx(dan, "ADMIN_ADD", 300, "approved", ago(40), { details: "Prev deposit" });                  // previous window
  await tx(ann, "withdrawal", 200, "approved", ago(12), { processedAt: ago(8), wallet: "TXYZ-ann" });  // paid 8 days ago
  await tx(ann, "withdrawal", 300, "pending", ago(3), { wallet: "TPEND-ann" });                         // hold
  await tx(dan, "withdrawal", 40, "rejected", ago(6), { wallet: "TREJ" });                              // no effect
  await tx(ann, "MACHINE_PURCHASE", 500, "completed", ago(9), { metadata: { quantity: 1, machineName: "S19 Pro" } });
  await tx(ann, "profit", 50, "completed", ago(2), { details: "Monthly profit from S19 Pro" });
  await tx(ann, "REFERRAL_BONUS", 10, "completed", ago(20), { details: "Referral bonus" });
  await tx(ann, "MACHINE_SALE", 90, "completed", ago(45), { metadata: { machineName: "Old rig" } });   // previous window
});

describe("ledger", () => {
  test("only admins can read it", async () => {
    assert.equal((await err(call("fn_admin_ledger", ann))).code, "42501");
  });

  test("lists everything newest first, with direction and a signed effect", async () => {
    const r = await call("fn_admin_ledger", admin);
    assert.equal(r.total, 11);
    const dates = r.rows.map((x) => new Date(x.date).getTime());
    assert.deepEqual(dates, [...dates].sort((a, b) => b - a));
    const pend = r.rows.find((x) => x.walletAddress === "TPEND-ann");
    assert.equal(pend.signedAmount, 0);          // pending = hold, not money moved
    assert.equal(pend.direction, "debit");
    const paid = r.rows.find((x) => x.walletAddress === "TXYZ-ann");
    assert.equal(paid.signedAmount, -200);
    assert.equal(r.rows.find((x) => x.walletAddress === "TREJ").signedAmount, 0); // rejected = no effect
    assert.equal(r.rows.find((x) => x.type === "MACHINE_PURCHASE").description, "1 × S19 Pro");
  });

  test("totals: credits, debits, net and the pending hold are computed over the whole filtered set", async () => {
    const r = await call("fn_admin_ledger", admin);
    // credits: 1000+500+2000+300+50+10+90 = 3950 ; debits: 200+500 = 700
    assert.deepEqual(r.totals, { credits: 3950, debits: 700, net: 3250, pendingHold: 300 });
  });

  test("filters by category, status, user, date window, amount and text; paginates", async () => {
    const dep = await call("fn_admin_ledger", admin, null, null, ["deposit"]);
    assert.equal(dep.total, 4);
    const pending = await call("fn_admin_ledger", admin, null, null, null, ["pending"]);
    assert.equal(pending.total, 1);
    const bobOnly = await call("fn_admin_ledger", admin, null, null, null, null, bob);
    assert.equal(bobOnly.total, 1);
    const last7 = await call("fn_admin_ledger", admin, ago(7), null);
    assert.equal(last7.total, 4); // profit(2d), pending wd(3d), deposit(5d), rejected wd(6d)
    const window = await call("fn_admin_ledger", admin, ago(11), ago(4));
    assert.equal(window.rows.every((x) => new Date(x.date) >= new Date(ago(11)) && new Date(x.date) < new Date(ago(4))), true);
    const big = await call("fn_admin_ledger", admin, null, null, null, null, null, null, 1000);
    assert.deepEqual(big.rows.map((x) => x.amount).sort((a, b) => a - b), [1000, 2000]);
    assert.equal((await call("fn_admin_ledger", admin, null, null, null, null, null, "beta.com")).total, 1);   // by email
    assert.equal((await call("fn_admin_ledger", admin, null, null, null, null, null, "TXYZ")).total, 1);      // by wallet
    assert.equal((await call("fn_admin_ledger", admin, null, null, null, null, null, "100%_")).total, 0);     // wildcard chars are literal
    const p1 = await call("fn_admin_ledger", admin, null, null, null, null, null, null, null, null, 4, 0);
    const p2 = await call("fn_admin_ledger", admin, null, null, null, null, null, null, null, null, 4, 4);
    assert.equal(p1.rows.length, 4); assert.equal(p2.rows.length, 4); assert.equal(p1.total, 11);
    assert.equal(new Set([...p1.rows, ...p2.rows].map((x) => x.id)).size, 8); // no overlap
  });

  test("a referral bonus on a purchase leaves a REFERRAL_BONUS ledger entry for the referrer", async () => {
    const m = await makeMachine(db, { name: "R1", price: 100 });
    await db.query(`update public.balances set admin_add = 500 where user_id = $1`, [dan]);
    await call("fn_purchase_machine", dan, m, 2);                 // dan was referred by ann; first purchase = 10% of 200
    const r = await call("fn_admin_ledger", admin, null, null, ["referral"], null, ann);
    const bonus = r.rows.find((x) => x.description.includes("purchase by"));
    assert.equal(bonus.amount, 20);
    assert.equal(bonus.type, "REFERRAL_BONUS");
    assert.equal(bonus.signedAmount, 20);
    // keep later tests deterministic
    await db.query(`delete from public.transactions where metadata ? 'referredUser' or metadata->>'machineName' = 'R1'`);
    await db.query(`update public.balances set admin_add = 50 where user_id = $1`, [dan]);
    await db.query(`update public.balances set admin_add = 600, mining_balance = 150 where user_id = $1`, [ann]);
    await db.query(`update public.profiles set discount = 0, referral_status = null where id = $1`, [dan]);
    await db.query(`delete from public.user_machines where machine_name = 'R1'`);
  });
});

describe("users overview", () => {
  const rowFor = (r, id) => r.rows.find((x) => x.id === id);

  test("only admins", async () => {
    assert.equal((await err(call("fn_admin_users_overview", ann))).code, "42501");
  });

  test("per-user metrics are correct", async () => {
    const r = await call("fn_admin_users_overview", admin, null, "all", "name", "asc", 50, 0);
    assert.equal(r.total, 6);
    const a = rowFor(r, ann);
    assert.equal(a.totalDeposited, 1500);
    assert.equal(a.totalWithdrawn, 200);
    assert.equal(a.pendingWithdrawal, 300);
    assert.equal(a.totalBalance, 750);
    assert.equal(a.depositedBalance, 600); assert.equal(a.profitBalance, 150);
    assert.equal(a.machines, 1);
    assert.equal(a.referrals, 1);
    assert.ok(a.tags.includes("pending_withdrawal"));
    assert.equal(new Date(a.lastActivityAt).getTime() > Date.now() - 3 * DAY, true); // the 2-day-old profit
  });

  test("segments find the people an admin cares about, and the tab counts agree", async () => {
    const ids = async (seg) => (await call("fn_admin_users_overview", admin, null, seg, "joined", "desc", 50, 0));
    assert.deepEqual((await ids("new")).rows.map((x) => x.id), [cy]);
    assert.deepEqual((await ids("pending_withdrawal")).rows.map((x) => x.id), [ann]);
    assert.deepEqual((await ids("dormant")).rows.map((x) => x.id).sort(), [bob, dan].sort()); // hold funds, no activity for 30+ days
    assert.deepEqual((await ids("holding")).rows.map((x) => x.id).sort(), [ann, bob, dan].sort());
    assert.deepEqual((await ids("admins")).rows.map((x) => x.id), [admin]);
    const never = (await ids("never_deposited")).rows.map((x) => x.id);
    assert.ok(never.includes(cy) && never.includes(eve) && !never.includes(ann) && !never.includes(admin));
    const all = await ids("all");
    assert.deepEqual(all.segmentCounts, { all: 6, new: 1, pending_withdrawal: 1, never_deposited: never.length, holding: 3, dormant: 2, no_machines: all.segmentCounts.no_machines, admins: 1 });
  });

  test("search, sort and paging", async () => {
    assert.deepEqual((await call("fn_admin_users_overview", admin, "beta.com")).rows.map((x) => x.id), [bob]);
    assert.deepEqual((await call("fn_admin_users_overview", admin, "pk")).rows.map((x) => x.id), [ann]);   // by country
    assert.equal((await call("fn_admin_users_overview", admin, "%")).total, 0);                              // wildcard is literal
    const byBal = await call("fn_admin_users_overview", admin, null, "all", "balance", "desc", 3, 0);
    assert.deepEqual(byBal.rows.map((x) => x.totalBalance), [1000, 750, 50]);
    const page2 = await call("fn_admin_users_overview", admin, null, "all", "balance", "desc", 3, 3);
    assert.equal(page2.rows.length, 3); assert.equal(page2.total, 6);
    const byName = await call("fn_admin_users_overview", admin, null, "all", "name", "asc", 50, 0);
    const names = byName.rows.map((x) => `${x.firstName} ${x.lastName}`.toLowerCase());
    assert.deepEqual(names, [...names].sort());
    // an unknown sort column / injection attempt falls back safely
    const odd = await call("fn_admin_users_overview", admin, null, "all", "balance; drop table public.profiles;--", "sideways", 5, 0);
    assert.equal(odd.rows.length, 5);
    assert.equal((await db.query(`select count(*)::int c from public.profiles`)).rows[0].c, 6);
  });
});

describe("kpis", () => {
  test("only admins; range must be valid", async () => {
    assert.equal((await err(call("fn_admin_kpis", ann, ago(30), ago(0)))).code, "42501");
    assert.equal((await err(call("fn_admin_kpis", admin, ago(0), ago(30)))).code, "P0001");
  });

  test("current vs previous period", async () => {
    const r = await call("fn_admin_kpis", admin, ago(30), new Date(Date.now() + 1000).toISOString());
    assert.equal(r.current.deposits, 1500);            // ann 1000 + 500
    assert.equal(r.current.depositCount, 2);
    assert.equal(r.current.withdrawals, 200);          // paid 8 days ago (payout date, not request date)
    assert.equal(r.current.investments, 500);
    assert.equal(r.current.profitPaid, 50);
    assert.equal(r.current.referralPaid, 10);
    assert.equal(r.current.newUsers, 2);               // cy + the admin account created by the test
    assert.equal(r.current.activeUsers, 1);            // only ann moved money in the window
    assert.equal(r.current.newDepositors, 1);          // ann's first deposit is in the window
    assert.equal(r.previous.deposits, 300);            // dan 40 days ago
    assert.equal(r.previous.buybacks, 90);             // ann sold 45 days ago
    assert.equal(r.previous.newUsers, 2);              // ann(40d) + dan(35d)
  });

  test("snapshot and attention list", async () => {
    const r = await call("fn_admin_kpis", admin, ago(30), new Date(Date.now() + 1000).toISOString());
    assert.equal(r.snapshot.fundsHeld, 1800);          // 750 + 1000 + 50
    assert.equal(r.snapshot.fundsDeposited, 1650); assert.equal(r.snapshot.fundsProfit, 150);
    assert.equal(r.snapshot.users, 5);
    assert.equal(r.snapshot.usersWithBalance, 3);
    assert.equal(r.snapshot.activeMachines, 1);
    assert.ok(Math.abs(r.snapshot.top5Share - 1) < 1e-9);  // only 3 holders, so the top 5 hold everything
    assert.equal(r.attention.pendingWithdrawals.count, 1);
    assert.equal(r.attention.pendingWithdrawals.amount, 300);
    assert.equal(r.attention.oldestPending[0].userEmail, "ann@alpha.com");
    assert.equal(r.attention.dormantWithFunds, 2);      // bob and dan
    assert.deepEqual(r.attention.topUsers.map((u) => u.totalBalance), [1000, 750, 50]);
  });
});

describe("time series", () => {
  test("zero-filled daily points whose totals match the KPIs", async () => {
    const from = ago(30), to = new Date(Date.now() + 1000).toISOString();
    const s = await call("fn_admin_timeseries", admin, from, to, "day");
    assert.equal(s.bucket, "day");
    assert.ok(s.points.length >= 30 && s.points.length <= 32);
    const days = s.points.map((p) => p.date);
    assert.equal(new Set(days).size, days.length);
    assert.deepEqual(days, [...days].sort());
    const sum = (k) => s.points.reduce((t, p) => t + p[k], 0);
    const k = (await call("fn_admin_kpis", admin, from, to)).current;
    assert.equal(sum("deposits"), k.deposits);
    assert.equal(sum("withdrawals"), k.withdrawals);
    assert.equal(sum("investments"), k.investments);
    assert.equal(sum("profitPaid"), k.profitPaid);
    assert.equal(sum("newUsers"), k.newUsers);
    assert.ok(s.points.some((p) => p.deposits === 0), "quiet days are present as zeros");
  });

  test("weekly buckets and range limits", async () => {
    const w = await call("fn_admin_timeseries", admin, ago(60), new Date().toISOString(), "week");
    assert.equal(w.bucket, "week");
    assert.ok(w.points.length >= 8 && w.points.length <= 10);
    assert.equal((await err(call("fn_admin_timeseries", admin, ago(900), ago(0), "day"))).code, "P0001");
    assert.equal((await err(call("fn_admin_timeseries", ann, ago(30), ago(0), "day"))).code, "42501");
  });
});

describe("access control", () => {
  test("client roles cannot call the admin functions or read the views", async () => {
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`set role ${role}`);
      const fn = await err(db.query(`select public.fn_admin_kpis($1, now() - interval '1 day', now())`, [admin]));
      const view = await err(db.query(`select * from public.v_ledger`));
      const view2 = await err(db.query(`select * from public.v_user_metrics`));
      await db.exec(`reset role`);
      assert.equal(fn?.code, "42501", `${role} fn`);
      assert.equal(view?.code, "42501", `${role} v_ledger`);
      assert.equal(view2?.code, "42501", `${role} v_user_metrics`);
    }
  });
});

test("ledger running balance counts from p_start with an opening balance of zero", async () => {
  const d = await createDb({ parsers: { 1700: (x) => parseFloat(x) } });
  const adm = await makeUser(d, { role: "admin" }), u = await makeUser(d);
  const tx = (type, amount, status, at) => d.query(`insert into public.transactions (user_id, type, amount, status, transaction_date, processed_at) values ($1,$2,$3,$4,$5,$5)`, [u, type, amount, status, at]);
  await tx("ADMIN_ADD", 999, "approved", "2026-05-01T10:00:00Z");           // before the start: hidden and not counted
  await tx("ADMIN_ADD", 100, "approved", "2026-05-25T10:00:00Z");
  await tx("MACHINE_PURCHASE", 30, "completed", "2026-05-26T10:00:00Z");
  await tx("withdrawal", 50, "pending", "2026-05-27T10:00:00Z");           // a hold: balance unchanged
  await tx("withdrawal", 20, "approved", "2026-05-28T10:00:00Z");
  const r = (await d.query(`select public.fn_admin_ledger($1, null, null, null, null, null, null, null, null, 50, 0, '2026-05-25T00:00:00Z') as r`, [adm])).rows[0].r;
  assert.equal(r.total, 4);
  assert.deepEqual(r.rows.map((x) => x.balanceAfter).reverse(), [100, 70, 70, 50]);
  assert.deepEqual(r.rows.map((x) => x.balanceBefore).reverse(), [0, 100, 70, 70]);
  assert.equal(r.totals.credits, 100);
  // a category filter must not change the running figures
  const w = (await d.query(`select public.fn_admin_ledger($1, null, null, array['withdrawal'], null, null, null, null, null, 50, 0, '2026-05-25T00:00:00Z') as r`, [adm])).rows[0].r;
  assert.deepEqual(w.rows.map((x) => x.balanceAfter).reverse(), [70, 50]);
});

test("user ledger returns only that user's rows, newest first, with their balance and no admin fields", async () => {
  const d = await createDb({ parsers: { 1700: (x) => parseFloat(x) } });
  const a = await makeUser(d), b = await makeUser(d);
  const tx = (u, type, amount, status, at, after) => d.query(`insert into public.transactions (user_id, type, amount, status, transaction_date, processed_at, balance_after, admin_comment) values ($1,$2,$3,$4,$5,$5,$6,'internal note')`, [u, type, amount, status, at, after]);
  await tx(a, "ADMIN_ADD", 100, "approved", "2026-06-01T10:00:00Z", 100);
  await tx(a, "withdrawal", 40, "pending", "2026-06-02T10:00:00Z", 100);
  await tx(a, "profit", 5, "completed", "2026-06-03T10:00:00Z", 105);
  await tx(a, "ADMIN_ADD", 7, "approved", "2026-04-01T10:00:00Z", 7);        // before the start
  await tx(b, "ADMIN_ADD", 999, "approved", "2026-06-01T10:00:00Z", 999);    // someone else
  await d.query(`update public.balances set admin_add = 105 where user_id = $1`, [a]);
  const r = (await d.query(`select public.fn_user_ledger($1, '2026-05-25T00:00:00Z') as r`, [a])).rows[0].r;
  assert.equal(r.total, 3);
  assert.deepEqual(r.rows.map((x) => x.type), ["profit", "withdrawal", "ADMIN_ADD"]);
  assert.equal(r.balance, 105);
  assert.equal(r.totals.credits, 105); assert.equal(r.totals.pendingHold, 40);
  assert.ok(!JSON.stringify(r).includes("internal note"));
  const only = (await d.query(`select public.fn_user_ledger($1, null, array['profit']) as r`, [a])).rows[0].r;
  assert.equal(only.total, 1);
  await d.query(`set role authenticated`);
  await assert.rejects(d.query(`select public.fn_user_ledger($1)`, [a]), /permission denied/);
  await d.query(`reset role`);
});

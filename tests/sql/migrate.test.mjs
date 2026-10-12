import { test, before } from "node:test";
import assert from "node:assert/strict";
import { createDb } from "./harness.mjs";
import { migrate, uuidFor } from "../../scripts/lib/migrate.mjs";

// ---- fake Mongo with data shaped like the old Mongoose models (including their messy edge cases)
const oid = (n) => n.toString(16).padStart(24, "0");
const O = { admin: oid(1), a: oid(2), b: oid(3), dup: oid(4), noEmail: oid(5), c: oid(6), orphan: oid(99) };
const days = (n) => new Date(Date.now() - n * 86400000);

const data = {
  users: [
    { _id: O.admin, firstName: "Ad", lastName: "Min", email: "Admin@Test.com", phoneNumber: "+971500000000", country: "AE", role: "admin", referralCode: "ad-1", createdAt: days(400) },
    { _id: O.a, firstName: "Ann", lastName: "A", email: "ann@test.com", phoneNumber: 123456789, country: "PK", role: "user", referralCode: "ann-1", referralId: O.admin, mainBalance: 50, discount: 12.5, deposit_count: 2, referralStatus: "active", twoFactorEnabled: true },
    { _id: O.b, firstName: "Bob", lastName: "B", email: "bob@test.com", phoneNumber: "987654321", country: "US", referralCode: "bob-1", referralId: O.orphan },
    { _id: O.dup, firstName: "Dup", lastName: "D", email: "ANN@test.com", phoneNumber: "111111", country: "US" },
    { _id: O.noEmail, firstName: "No", lastName: "Mail", phoneNumber: "111111", country: "US" },
    { _id: O.c, firstName: "Cy", lastName: "C", email: "cy@test.com", phoneNumber: "222222", country: "GB", referralCode: "cy-1" },
  ],
  balances: [
    { user: O.a, adminAdd: 100, miningBalance: 20, totalBalance: 150, lastUpdated: days(1) }, // total includes an unbooked 30 bonus
    { user: O.b, adminAdd: 1, miningBalance: 1, totalBalance: 2, lastUpdated: days(10) },       // older duplicate
    { user: O.b, adminAdd: 40, miningBalance: 10, totalBalance: 50, lastUpdated: days(2) },      // newer duplicate wins
    { user: O.c, adminAdd: -30, miningBalance: 5, totalBalance: -25, lastUpdated: days(3) },     // old overdraw bug
    { user: O.orphan, adminAdd: 999, miningBalance: 0, totalBalance: 999 },                       // user does not exist
  ],
  miningmachines: [
    { _id: oid(10), machineName: "S19", hashrate: "100 TH/s", powerConsumption: 3000, priceRange: 1000, coinsMined: "BTC", monthlyProfit: 100, description: "d", images: ["https://x/y.jpg"], createdAt: days(100) },
    { _id: oid(11), machineName: "Premium Share Mining Machine", hashrate: "180 TH/s", powerConsumption: 3400, priceRange: 19000, coinsMined: "Bitcoin", monthlyProfit: 3500, description: "d", isShareBased: true, sharePrice: 50, totalShares: 380, availableShares: 380, profitPerShare: 9.21 },
  ],
  usermachines: [
    { _id: oid(20), user: O.a, machine: oid(10), assignedDate: days(65), status: "active", monthlyProfitAccumulated: 0, machineName: "S19", hashrate: "100 TH/s", powerConsumption: 3000, priceRange: 1000, coinsMined: "BTC", monthlyProfit: 100, description: "d" },
    { _id: oid(21), user: O.a, machine: oid(77), assignedDate: days(5), status: "active", machineName: "Deleted model", hashrate: "1", powerConsumption: 1, priceRange: 500, coinsMined: "BTC", monthlyProfit: 50, description: "d" }, // machine no longer exists
    { _id: oid(22), user: O.orphan, machine: oid(10), machineName: "S19", hashrate: "1", powerConsumption: 1, priceRange: 1, coinsMined: "BTC", monthlyProfit: 1, description: "d" },       // user does not exist
  ],
  sharepurchases: [
    { _id: oid(30), user: O.b, machine: oid(11), numberOfShares: 10, pricePerShare: 50, profitPerShare: 9.21, totalInvestment: 500, purchaseDate: days(40), lastProfitUpdate: days(40), status: "active", totalProfitEarned: 0 },
  ],
  transactions: [
    { _id: oid(40), user: O.a, amount: 100, type: "ADMIN_ADD", status: "approved", details: "Admin balance add", transactionDate: days(60) },
    { _id: oid(41), user: O.a, amount: 25, type: "withdrawal", status: "pending", walletAddress: "TXYZ", network: "TRC20", balanceBefore: 120, balanceAfter: 95 },
    { _id: oid(42), user: O.a, amount: 5, type: "SOMETHING_OLD", status: "completed" },  // unknown type
    { _id: oid(43), user: O.orphan, amount: 5, type: "ADMIN_ADD", status: "approved" },   // user does not exist
    { _id: oid(44), user: O.a, amount: 10, type: "profit", status: "weird-status", metadata: { monthsPaid: 1 } },
  ],
  deposits: [
    { _id: oid(50), userId: O.a, amount: 200, transactionId: "np-1", accounttype: "NOWPayments", paymentProvider: "nowpayments", paymentStatus: "finished", nowPaymentsRaw: { a: 1 }, attachment: [] },
    { _id: oid(51), userId: O.b, amount: 50, transactionId: "m-1", accounttype: "Binance", attachment: ["https://res.cloudinary.com/x.png"] },
  ],
  contacts: [{ _id: oid(60), name: "N", email: "n@x.com", phone: "1", country: "US", comment: "hi", status: "read", readBy: O.admin }],
  withdrawals: [{ _id: oid(70), userId: O.a, amount: 10, status: "Pending" }], // legacy flow
};

const fakeMongo = { collection: (n) => ({ find: () => ({ toArray: async () => structuredClone(data[n] ?? []) }) }) };

// ---- fake supabase-js that applies writes to the real schema in PGlite
function fakeSb(db) {
  const val = (v) => (v !== null && typeof v === "object" && !Array.isArray(v) ? JSON.stringify(v) : v);
  return {
    auth: { admin: {
      getUserById: async (id) => ({ data: { user: (await db.query("select id from auth.users where id=$1", [id])).rows[0] || null } }),
      createUser: async ({ id, email }) => {
        try { await db.query("insert into auth.users (id, email) values ($1,$2)", [id, email]); return { error: null }; }
        catch (e) { return { error: { message: e.message } }; }
      },
    } },
    from: (table) => ({
      upsert: async (rows, { onConflict }) => {
        try {
          for (const r of rows) {
            const cols = Object.keys(r);
            const sets = cols.filter((c) => c !== onConflict).map((c) => `${c}=excluded.${c}`).join(",");
            await db.query(
              `insert into public.${table} (${cols.join(",")}) values (${cols.map((_, i) => `$${i + 1}`).join(",")}) on conflict (${onConflict}) do update set ${sets}`,
              cols.map((c) => val(r[c]))
            );
          }
          return { error: null };
        } catch (e) { return { error: { message: e.message } }; }
      },
      update: (obj) => ({ eq: async (col, v) => {
        try {
          const cols = Object.keys(obj);
          await db.query(`update public.${table} set ${cols.map((c, i) => `${c}=$${i + 1}`).join(",")} where ${col}=$${cols.length + 1}`, [...cols.map((c) => val(obj[c])), v]);
          return { error: null };
        } catch (e) { return { error: { message: e.message } }; }
      } }),
    }),
  };
}

const count = async (db, t) => (await db.query(`select count(*)::int c from public.${t}`)).rows[0].c;
let db, result;

before(async () => { db = await createDb(); });

test("dry run reads and validates but writes nothing", async () => {
  const r = await migrate({ db: fakeMongo, sb: fakeSb(db), commit: false });
  assert.equal(await count(db, "profiles"), 0);
  assert.equal(await count(db, "transactions"), 0);
  assert.equal((await db.query("select count(*)::int c from auth.users")).rows[0].c, 0);
  assert.equal(r.report.users.read, 6);
});

test("commit migrates everything, skipping only what cannot be valid", async () => {
  result = await migrate({ db: fakeMongo, sb: fakeSb(db), commit: true });
  assert.equal(await count(db, "profiles"), 4);          // admin, ann, bob, cy (dup + no-email skipped)
  assert.equal(await count(db, "mining_machines"), 2);
  assert.equal(await count(db, "user_machines"), 2);     // orphan user's machine skipped
  assert.equal(await count(db, "share_purchases"), 1);
  assert.equal(await count(db, "transactions"), 3);      // unknown type + orphan skipped
  assert.equal(await count(db, "deposits"), 2);
  assert.equal(await count(db, "contacts"), 1);
  assert.equal(result.report.users.skipped, 2);
  assert.equal(result.report.transactions.skipped, 2);
  assert.equal(result.report.usermachines.skipped, 1);
});

test("users: emails lowercased, roles/flags kept, referral links resolved, auth users confirmed-ready", async () => {
  const { rows } = await db.query(`select email, role, two_factor_enabled t, phone_number p, discount::float d, referral_status s, (select email from public.profiles r where r.id = p.referred_by) as referrer from public.profiles p order by email`);
  const by = Object.fromEntries(rows.map((r) => [r.email, r]));
  assert.equal(by["admin@test.com"].role, "admin");
  assert.equal(by["ann@test.com"].referrer, "admin@test.com");
  assert.equal(by["ann@test.com"].p, "123456789");   // number coerced to text
  assert.equal(by["ann@test.com"].t, true);
  assert.equal(by["ann@test.com"].d, 12.5);
  assert.equal(by["bob@test.com"].referrer, null);   // referrer did not exist
  assert.equal((await db.query("select count(*)::int c from auth.users")).rows[0].c, 4);
});

test("balances: duplicates resolved, negatives clamped, legacy mainBalance folded in, discrepancies reported", async () => {
  const bal = async (email) => (await db.query(`select b.admin_add::float a, b.mining_balance::float m, b.total_balance::float t from public.balances b join public.profiles p on p.id=b.user_id where p.email=$1`, [email])).rows[0];
  assert.deepEqual(await bal("ann@test.com"), { a: 150, m: 20, t: 170 }); // 100 + legacy 50
  assert.deepEqual(await bal("bob@test.com"), { a: 40, m: 10, t: 50 });   // newer duplicate won
  assert.deepEqual(await bal("cy@test.com"), { a: 0, m: 5, t: 5 });       // negative clamped
  assert.equal(await count(db, "balances"), 3);

  const notes = Object.fromEntries(result.discrepancies.map((d) => [d.email, d.note]));
  assert.match(notes["ann@test.com"], /legacy mainBalance 50/);
  assert.match(notes["ann@test.com"], /totalBalance \(150\)/);
  assert.match(notes["cy@test.com"], /negative balance clamped/);
  assert.equal(notes["bob@test.com"], undefined);
  assert.ok(result.warnings.some((w) => /duplicate balance docs/.test(w)));
});

test("machines and assignments: a deleted catalogue machine keeps the user's copy", async () => {
  const { rows } = await db.query(`select machine_name, machine_id from public.user_machines order by machine_name`);
  assert.equal(rows.find((r) => r.machine_name === "Deleted model").machine_id, null);
  assert.ok(rows.find((r) => r.machine_name === "S19").machine_id);
});

test("transactions keep their ids/metadata; unknown status becomes completed; pending withdrawal is flagged", async () => {
  const { rows } = await db.query(`select type, status, metadata from public.transactions order by type`);
  assert.deepEqual(rows.map((r) => `${r.type}:${r.status}`).sort(), ["ADMIN_ADD:approved", "profit:completed", "withdrawal:pending"]);
  assert.ok(result.warnings.some((w) => /pending withdrawal/.test(w)));
  assert.ok(result.warnings.some((w) => /legacy 'withdrawals'.*Pending/.test(w)));
});

test("re-running is idempotent (same rows, no duplicates, no errors)", async () => {
  const before = { p: await count(db, "profiles"), t: await count(db, "transactions"), b: await count(db, "balances"), um: await count(db, "user_machines") };
  await migrate({ db: fakeMongo, sb: fakeSb(db), commit: true });
  assert.deepEqual(before, { p: await count(db, "profiles"), t: await count(db, "transactions"), b: await count(db, "balances"), um: await count(db, "user_machines") });
  assert.equal((await db.query("select count(*)::int c from auth.users")).rows[0].c, 4);
});

test("migrated data works with the money functions", async () => {
  const ann = uuidFor("user", O.a);
  // pending withdrawal of 25 reserves funds: 170 total - 25 pending = 145 available
  const bad = await db.query(`select public.fn_request_withdrawal($1, 150, 'TXYZ', 'TRC20')`, [ann]).catch((e) => e);
  assert.match(bad.message, /exceeds available/);
  await db.query(`select public.fn_request_withdrawal($1, 145, 'TXYZ', 'TRC20')`, [ann]);

  // Ann's S19 was assigned 65 days ago and never paid -> the profit job pays 2 months (200)
  const before = (await db.query(`select mining_balance::float m from public.balances where user_id=$1`, [ann])).rows[0].m;
  await db.query(`select public.fn_run_profit_update()`);
  const after = (await db.query(`select mining_balance::float m from public.balances where user_id=$1`, [ann])).rows[0].m;
  assert.ok(after - before >= 200, `expected >= 200 more, got ${after - before}`);

  // Bob's shares last paid 40 days ago -> one month (10 * 9.21 = 92.1)
  const bob = uuidFor("user", O.b);
  const bobM = (await db.query(`select mining_balance::float m from public.balances where user_id=$1`, [bob])).rows[0].m;
  assert.equal(bobM, 10 + 92.1);
});

import { test, before } from "node:test";
import assert from "node:assert/strict";
import { createDb, makeUser, err } from "./harness.mjs";

let db, admin, ann, bob;
const call = async (fn, ...a) => (await db.query(`select public.${fn}(${a.map((_, i) => `$${i + 1}`).join(",")}) as r`, a)).rows[0].r;
const dep = (user, amount, provider, status, extra = {}) => db.query(
  `insert into public.deposits (user_id, amount, transaction_id, account_type, payment_provider, payment_status, review_note, credited_at, now_payments_payment_id, attachment, created_at)
   values ($1,$2,$3,'x',$4,$5,$6,$7,$8,$9,$10)`,
  [user, amount, extra.ref ?? `ref-${Math.random()}`, provider, status, extra.note ?? null, extra.credited ?? null, extra.payment ?? null, extra.attachment ?? [], extra.at ?? new Date().toISOString()]);

before(async () => {
  db = await createDb();
  admin = await makeUser(db, { role: "admin" });
  ann = await makeUser(db); bob = await makeUser(db);
  await db.query(`update public.profiles set first_name='Ann', last_name='Alpha', email='ann@alpha.com' where id=$1`, [ann]);
  const now = Date.now();
  await dep(ann, 100, "nowpayments", "finished", { credited: new Date().toISOString(), payment: "P-1", at: new Date(now - 4000).toISOString() });
  await dep(ann, 50, "nowpayments", "waiting", { at: new Date(now - 3000).toISOString() });
  await dep(bob, 80, "nowpayments", "partially_paid", { note: "Partially paid: received 20 of 80", payment: "P-3", at: new Date(now - 2000).toISOString() });
  await dep(bob, 500, "manual", "pending", { ref: "TX-HASH-9", attachment: ["deposit-proofs/u/proof.png"], at: new Date(now - 1000).toISOString() });
});

test("only admins", async () => {
  assert.equal((await err(call("fn_admin_deposits", ann))).code, "42501");
});

test("lists newest first with the user, status, proof and review note", async () => {
  const r = await call("fn_admin_deposits", admin);
  assert.equal(r.total, 4);
  assert.deepEqual(r.rows.map((x) => x.provider), ["manual", "nowpayments", "nowpayments", "nowpayments"]);
  assert.equal(r.rows[0].reference, "TX-HASH-9");
  assert.deepEqual(r.rows[0].attachments, ["deposit-proofs/u/proof.png"]);
  assert.match(r.rows[1].reviewNote, /Partially paid/);
  assert.equal(r.rows[3].userName, "Ann Alpha");
  assert.ok(r.rows[3].creditedAt);
});

test("tab counts ignore the filter; filters narrow the list", async () => {
  const all = await call("fn_admin_deposits", admin);
  assert.deepEqual(all.counts, { all: 4, review: 1, inProgress: 1, manual: 1, admin: 0, credited: 1 });
  assert.equal((await call("fn_admin_deposits", admin, "manual")).total, 1);
  assert.equal((await call("fn_admin_deposits", admin, "nowpayments", ["waiting", "confirming"])).total, 1);
  assert.equal((await call("fn_admin_deposits", admin, null, null, true)).total, 1);            // needs review
  assert.equal((await call("fn_admin_deposits", admin, null, null, false, "alpha")).total, 2);   // by user
  assert.equal((await call("fn_admin_deposits", admin, null, null, false, "P-3")).total, 1);     // by payment id
  assert.equal((await call("fn_admin_deposits", admin, null, null, false, "%")).total, 0);        // wildcard is literal
  const page = await call("fn_admin_deposits", admin, null, null, false, null, 2, 2);
  assert.equal(page.rows.length, 2); assert.equal(page.total, 4);
});

test("filtering by user scopes the list, the tab counts and the amounts", async () => {
  const r = await call("fn_admin_deposits", admin, null, null, false, null, 25, 0, bob);
  assert.equal(r.total, 2);
  assert.ok(r.rows.every((x) => x.userId === bob));
  assert.equal(r.counts.all, 2);
  assert.equal(r.sums.requested, 580);
  assert.equal(r.sums.credited, 0);
  const a = await call("fn_admin_deposits", admin, null, null, false, null, 25, 0, ann);
  assert.equal(a.sums.credited, 100);
});

test("admin credits (ADMIN_ADD, the pre-NOWPayments way) are listed too, without duplicating NOWPayments credits", async () => {
  const d = await createDb();
  const adm = await makeUser(d, { role: "admin" }), u = await makeUser(d);
  const np = (await d.query(`insert into public.deposits (user_id, amount, transaction_id, account_type, payment_provider, payment_status, credited_at)
                              values ($1,100,'NP-1','x','nowpayments','finished', now()) returning id`, [u])).rows[0].id;
  const add = (amount, details, meta) => d.query(`insert into public.transactions (user_id, type, amount, status, details, metadata, transaction_date) values ($1,'ADMIN_ADD',$2,'approved',$3,$4, now() - interval '1 day')`, [u, amount, details, JSON.stringify(meta)]);
  await add(100, "NOWPayments deposit", { depositId: np });      // the credit for the deposit above: must not be listed again
  await add(250, "Binance Pay", {});
  await add(40, null, {});
  const all = await d.query(`select public.fn_admin_deposits($1) as r`, [adm]).then((x) => x.rows[0].r);
  assert.equal(all.total, 3);
  assert.equal(all.counts.admin, 2);
  assert.deepEqual(all.rows.filter((x) => x.provider === "admin").map((x) => x.amount).sort((a, b) => a - b), [40, 250]);
  assert.ok(all.rows.some((x) => x.description === "Binance Pay"));
  assert.ok(all.rows.some((x) => x.description === "Admin balance add"));
  const only = await d.query(`select public.fn_admin_deposits($1, 'admin') as r`, [adm]).then((x) => x.rows[0].r);
  assert.equal(only.total, 2);
  assert.equal(only.sums.credited, 290);
  const found = await d.query(`select public.fn_admin_deposits($1, null, null, false, 'binance') as r`, [adm]).then((x) => x.rows[0].r);
  assert.equal(found.total, 1);
});

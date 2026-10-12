import { test, before, describe } from "node:test";
import assert from "node:assert/strict";
import { createDb, makeUser, makeMachine, err } from "./harness.mjs";

let db, a, b, admin;
before(async () => {
  db = await createDb();
  a = await makeUser(db, { adminAdd: 100 });
  b = await makeUser(db, { adminAdd: 500 });
  admin = await makeUser(db, { role: "admin" });
  await makeMachine(db);
  await db.query(`insert into public.contacts (name,email,phone,country,comment) values ('x','x@x.com','1','US','hi')`);
  await db.query(`insert into public.otp_codes (user_id,purpose,code_hash,expires_at) values ($1,'login','h',now())`, [a]);
});

async function as(role, uid, fn) {
  await db.exec(`set role ${role}`);
  if (uid) await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid]);
  try { return await fn(); }
  finally { await db.exec(`reset role`); await db.query(`select set_config('request.jwt.claim.sub', '', false)`); }
}

describe("row level security", () => {
  test("a user sees only their own balance and profile", async () => {
    const rows = await as("authenticated", a, async () => (await db.query(`select user_id from public.balances`)).rows);
    assert.deepEqual(rows.map((r) => r.user_id), [a]);
    const profiles = await as("authenticated", a, async () => (await db.query(`select id from public.profiles`)).rows);
    assert.deepEqual(profiles.map((r) => r.id), [a]);
  });

  test("an admin can read everyone", async () => {
    const rows = await as("authenticated", admin, async () => (await db.query(`select user_id from public.balances`)).rows);
    assert.equal(rows.length, 3);
  });

  test("clients cannot write balances, profiles or roles", async () => {
    for (const sql of [
      `update public.balances set admin_add = 1e9`,
      `update public.profiles set role = 'admin'`,
      `insert into public.balances (user_id) values (gen_random_uuid())`,
      `delete from public.transactions`,
    ]) {
      const e = await as("authenticated", a, () => err(db.query(sql)));
      assert.equal(e?.code, "42501", sql);
    }
  });

  test("anonymous visitors see the machine catalogue but nothing else", async () => {
    assert.equal((await as("anon", null, async () => (await db.query(`select 1 from public.mining_machines`)).rows)).length, 1);
    assert.equal((await as("anon", null, () => err(db.query(`select * from public.balances`))))?.code, "42501");
    assert.equal((await as("anon", null, () => err(db.query(`select * from public.profiles`))))?.code, "42501");
  });

  test("otp codes and contacts are invisible to client roles; service role can read them", async () => {
    for (const t of ["otp_codes", "contacts", "password_resets"]) {
      const rows = await as("authenticated", admin, async () => (await db.query(`select * from public.${t}`)).rows).catch((e) => e);
      assert.ok(rows instanceof Error || rows.length === 0, t);
    }
    const svc = await as("service_role", null, async () => (await db.query(`select * from public.otp_codes`)).rows);
    assert.equal(svc.length, 1);
  });

  test("money functions are not callable by client roles", async () => {
    for (const role of ["anon", "authenticated"]) {
      const e = await as(role, a, () => err(db.query(`select public.fn_admin_add_balance($1,$1,1000)`, [a])));
      assert.equal(e?.code, "42501", role);
    }
    const ok = await as("service_role", null, () => err(db.query(`select public.fn_admin_add_balance($1,$2,5)`, [admin, a])));
    assert.equal(ok, null);
  });
});

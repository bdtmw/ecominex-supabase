import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createDb, makeUser } from "./harness.mjs";

test("seed creates the share machine exactly once and shares can be bought from it", async () => {
  const db = await createDb();
  const seed = readFileSync(new URL("../../supabase/seed.sql", import.meta.url), "utf8");
  await db.exec(seed);
  await db.exec(seed); // idempotent
  const { rows } = await db.query(`select count(*)::int c from public.mining_machines where is_share_based`);
  assert.equal(rows[0].c, 1);

  const u = await makeUser(db, { adminAdd: 1000 });
  const r = (await db.query(`select public.fn_purchase_shares($1, 4) as r`, [u])).rows[0].r;
  assert.equal(r.expectedMonthlyProfit, 4 * 9.21);
});

test("migration ids are deterministic valid UUIDs", async () => {
  // Re-implement the same function the script uses (kept in sync by this test).
  const crypto = await import("node:crypto");
  const src = readFileSync(new URL("../../scripts/migrate-from-mongo.mjs", import.meta.url), "utf8");
  const body = src.match(/function uuidFor[\s\S]*?\n}\n/)[0];
  const NS = "6ba7b811-9dad-11d1-80b4-00c04fd430c8";
  const uuidFor = new Function("crypto", "NS", `${body}; return uuidFor;`)(crypto.default, NS);
  const a = uuidFor("user", "507f1f77bcf86cd799439011");
  assert.match(a, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.equal(a, uuidFor("user", "507f1f77bcf86cd799439011"));
  assert.notEqual(a, uuidFor("machine", "507f1f77bcf86cd799439011"));
  assert.notEqual(a, uuidFor("user", "507f1f77bcf86cd799439012"));
});

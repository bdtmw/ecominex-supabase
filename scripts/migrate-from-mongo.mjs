#!/usr/bin/env node
/**
 * MongoDB (old Express backend) -> Supabase one-off migration.
 *
 *   npm i --no-save mongodb
 *   node --env-file=.env.local scripts/migrate-from-mongo.mjs            # DRY RUN: reads + validates, writes nothing
 *   node --env-file=.env.local scripts/migrate-from-mongo.mjs --commit   # writes to Supabase
 *
 * Needs in the environment (put MONGO_URI in .env.local only on the machine that runs this):
 *   MONGO_URI, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY)
 *
 * Safe to re-run: every row gets a deterministic uuid derived from its Mongo _id (upsert).
 * Users get a random password (bcrypt hashes cannot be imported) and sign in via "Forgot password".
 * Writes migration-report.json and migration-discrepancies.csv next to where you run it.
 */
import { writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { migrate } from "./lib/migrate.mjs";

const COMMIT = process.argv.includes("--commit");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const mongoUri = process.env.MONGO_URI;
for (const [k, v] of Object.entries({ MONGO_URI: mongoUri, NEXT_PUBLIC_SUPABASE_URL: url, "SUPABASE_SECRET_KEY": key })) {
  if (!v) { console.error(`Missing ${k}`); process.exit(1); }
}

let MongoClient;
try { ({ MongoClient } = await import("mongodb")); }
catch { console.error("The 'mongodb' package is missing. Run:  npm i --no-save mongodb"); process.exit(1); }

const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const mongo = await MongoClient.connect(mongoUri);
console.log(COMMIT ? "== COMMIT MODE: writing to Supabase ==" : "== DRY RUN: nothing is written (add --commit) ==");

try {
  const { report, discrepancies, warnings } = await migrate({ db: mongo.db(), sb, commit: COMMIT });
  console.table(report);
  if (COMMIT) { const { data, error } = await sb.rpc("fn_rebuild_transaction_balances"); console.log(error ? `Could not fill running balances (run migration 0009 first): ${error.message}` : `Filled running balances on ${data} transaction(s).`); }
  if (warnings.length) { console.log("\nWarnings:"); warnings.slice(0, 50).forEach((w) => console.log(" -", w)); if (warnings.length > 50) console.log(` ... and ${warnings.length - 50} more (see migration-report.json)`); }

  writeFileSync("migration-report.json", JSON.stringify({ commit: COMMIT, at: new Date().toISOString(), report, warnings, discrepancies }, null, 2));
  const header = ["email", "mongo_adminAdd", "mongo_miningBalance", "mongo_totalBalance", "new_admin_add", "new_mining_balance", "note"];
  writeFileSync("migration-discrepancies.csv", [header.join(","), ...discrepancies.map((d) => header.map((h) => JSON.stringify(d[h] ?? "")).join(","))].join("\n"));
  console.log(`\nWrote migration-report.json and migration-discrepancies.csv (${discrepancies.length} balance note(s) to review).`);
  console.log(COMMIT ? "Done. Tell users to use 'Forgot password' to set a new password." : "Dry run only. Re-run with --commit to write.");
} finally {
  await mongo.close();
}

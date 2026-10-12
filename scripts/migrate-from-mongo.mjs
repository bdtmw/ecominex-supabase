#!/usr/bin/env node
/**
 * One-off migration: MongoDB (old Express backend) -> Supabase (this app).
 *
 *   MONGO_URI=... NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   node scripts/migrate-from-mongo.mjs            # dry run (default): reads, validates, prints a report
 *   node scripts/migrate-from-mongo.mjs --commit   # actually writes
 *
 * Requires:  npm i mongodb   (not a runtime dependency of the app; install it only to run this script)
 *
 * What it does
 *  - Users: creates a Supabase Auth user for each Mongo user (email confirmed) with a RANDOM password
 *    (bcrypt hashes cannot be imported), then inserts the profile. Users sign in with "Forgot password".
 *  - Balances, machines, user machines, share purchases, transactions, deposits, contacts are copied
 *    with their original ids preserved in a mapping (Mongo ObjectId -> new uuid).
 *  - Safe to re-run: rows are matched by a deterministic uuid derived from the Mongo _id (uuid v5 style).
 *  - Legacy `mainBalance` (old withdrawal flow) is added into balances.admin_add so no money is lost.
 *  - Passwords reset tokens / OTPs are NOT migrated.
 */
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { MongoClient } from "mongodb";

const COMMIT = process.argv.includes("--commit");
const { MONGO_URI, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
for (const [k, v] of Object.entries({ MONGO_URI, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY })) {
  if (!v) { console.error(`Missing ${k}`); process.exit(1); }
}

const sb = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const NS = "6ba7b811-9dad-11d1-80b4-00c04fd430c8"; // any fixed namespace

// Deterministic uuid (RFC 4122 v5) from a Mongo ObjectId so re-runs hit the same rows.
function uuidFor(kind, oid) {
  const ns = Buffer.from(NS.replace(/-/g, ""), "hex");
  const h = crypto.createHash("sha1").update(Buffer.concat([ns, Buffer.from(`${kind}:${String(oid)}`)])).digest();
  h[6] = (h[6] & 0x0f) | 0x50; h[8] = (h[8] & 0x3f) | 0x80;
  const x = h.subarray(0, 16).toString("hex");
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
}
const U = (kind, oid) => (oid ? uuidFor(kind, oid) : null);
const num = (v, d = 0) => (v === undefined || v === null || Number.isNaN(Number(v)) ? d : Number(v));
const date = (v) => (v ? new Date(v).toISOString() : null);
const report = {};
const note = (k, n = 1) => (report[k] = (report[k] || 0) + n);

async function upsert(table, rows, onConflict = "id") {
  if (!rows.length) return;
  note(`${table}`, rows.length);
  if (!COMMIT) return;
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await sb.from(table).upsert(rows.slice(i, i + 500), { onConflict });
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

const mongo = await MongoClient.connect(MONGO_URI);
const db = mongo.db();
const all = (c) => db.collection(c).find({}).toArray();

console.log(COMMIT ? "== COMMIT MODE ==" : "== DRY RUN (add --commit to write) ==");

// ---------------------------------------------------------------- users
const users = await all("users");
const seen = new Set();
const profiles = [];
for (const u of users) {
  const email = String(u.email || "").trim().toLowerCase();
  if (!email || seen.has(email)) { note("users skipped (no/duplicate email)"); continue; }
  seen.add(email);
  const id = uuidFor("user", u._id);

  if (COMMIT) {
    const { data: existing } = await sb.auth.admin.getUserById(id);
    if (!existing?.user) {
      const { error } = await sb.auth.admin.createUser({
        id, email, email_confirm: true, password: crypto.randomBytes(24).toString("base64url"),
      });
      if (error) { console.error(`  ! ${email}: ${error.message}`); note("users failed"); continue; }
    }
  }
  profiles.push({
    id, first_name: u.firstName || "-", last_name: u.lastName || "-", email, phone_number: u.phoneNumber || "000000",
    country: u.country || "-", role: u.role === "admin" ? "admin" : "user",
    referral_code: u.referralCode || null, referred_by: null, // set in a second pass (self-reference)
    referral_status: u.referralStatus || null, deposit_count: u.deposit_count ?? null, discount: num(u.discount),
    two_factor_enabled: !!u.twoFactorEnabled, created_at: date(u.createdAt) || new Date().toISOString(),
  });
}
await upsert("profiles", profiles);
const userIds = new Set(profiles.map((p) => p.id));
// second pass: referrals
const refs = users.filter((u) => u.referralId && userIds.has(uuidFor("user", u._id)) && userIds.has(uuidFor("user", u.referralId)))
  .map((u) => ({ id: uuidFor("user", u._id), ref: uuidFor("user", u.referralId) }));
if (COMMIT) for (const r of refs) await sb.from("profiles").update({ referred_by: r.ref }).eq("id", r.id);
note("referral links", refs.length);

// ------------------------------------------------------------- balances
// legacy mainBalance (old withdrawal flow) is folded into admin_add
const balances = new Map();
for (const b of await all("balances")) {
  const uid = U("user", b.user);
  if (userIds.has(uid)) balances.set(uid, { user_id: uid, admin_add: num(b.adminAdd), mining_balance: num(b.miningBalance) });
}
for (const u of users) {
  const uid = uuidFor("user", u._id);
  if (!userIds.has(uid) || !num(u.mainBalance)) continue;
  const b = balances.get(uid) || { user_id: uid, admin_add: 0, mining_balance: 0 };
  b.admin_add += Math.max(0, num(u.mainBalance));
  balances.set(uid, b);
  note("legacy mainBalance folded into admin_add");
}
await upsert("balances", [...balances.values()].map((b) => ({ ...b, admin_add: Math.max(0, b.admin_add), mining_balance: Math.max(0, b.mining_balance) })), "user_id");

// ------------------------------------------------------------- machines
const machines = (await all("miningmachines")).map((m) => ({
  id: uuidFor("machine", m._id), machine_name: m.machineName, hashrate: String(m.hashrate ?? ""), power_consumption: num(m.powerConsumption),
  price_range: num(m.priceRange), coins_mined: m.coinsMined || "", monthly_profit: num(m.monthlyProfit), description: m.description || "",
  images: m.images || [], is_share_based: !!m.isShareBased, share_price: num(m.sharePrice, 50), total_shares: num(m.totalShares, 380),
  available_shares: num(m.availableShares, 380), profit_per_share: num(m.profitPerShare, 9.21), created_at: date(m.createdAt) || new Date().toISOString(),
}));
await upsert("mining_machines", machines);
const machineIds = new Set(machines.map((m) => m.id));

const userMachines = (await all("usermachines")).filter((um) => userIds.has(U("user", um.user))).map((um) => ({
  id: uuidFor("usermachine", um._id), user_id: uuidFor("user", um.user),
  machine_id: machineIds.has(U("machine", um.machine)) ? uuidFor("machine", um.machine) : null,
  assigned_date: date(um.assignedDate) || new Date().toISOString(), status: um.status === "inactive" ? "inactive" : "active",
  monthly_profit_accumulated: num(um.monthlyProfitAccumulated), last_profit_update: date(um.lastProfitUpdate),
  machine_name: um.machineName || "-", hashrate: String(um.hashrate ?? ""), power_consumption: num(um.powerConsumption),
  price_range: num(um.priceRange), coins_mined: um.coinsMined || "", monthly_profit: num(um.monthlyProfit),
  description: um.description || "", images: um.images || [], created_at: date(um.createdAt) || new Date().toISOString(),
}));
await upsert("user_machines", userMachines);

const shares = (await all("sharepurchases")).filter((s) => userIds.has(U("user", s.user)) && machineIds.has(U("machine", s.machine))).map((s) => ({
  id: uuidFor("share", s._id), user_id: uuidFor("user", s.user), machine_id: uuidFor("machine", s.machine),
  number_of_shares: Math.max(1, num(s.numberOfShares, 1)), price_per_share: num(s.pricePerShare), profit_per_share: num(s.profitPerShare),
  total_investment: num(s.totalInvestment), purchase_date: date(s.purchaseDate) || new Date().toISOString(),
  last_profit_update: date(s.lastProfitUpdate) || date(s.purchaseDate) || new Date().toISOString(),
  status: s.status === "inactive" ? "inactive" : "active", total_profit_earned: num(s.totalProfitEarned),
}));
await upsert("share_purchases", shares);

// --------------------------------------------------------- transactions
const TYPES = new Set(["withdrawal", "profit", "MACHINE_PURCHASE", "MACHINE_SALE", "SHARE_PURCHASE", "SHARE_PROFIT", "SHARE_SALE", "ADMIN_ADD"]);
const STATUS = new Set(["pending", "approved", "rejected", "completed"]);
const txs = (await all("transactions")).filter((t) => userIds.has(U("user", t.user)) && TYPES.has(t.type)).map((t) => ({
  id: uuidFor("tx", t._id), user_id: uuidFor("user", t.user), amount: num(t.amount), type: t.type, status: STATUS.has(t.status) ? t.status : "completed",
  wallet_address: t.walletAddress || null, network: t.network || null, balance_before: t.balanceBefore ?? null, balance_after: t.balanceAfter ?? null,
  admin_comment: t.adminComment || null, processed_by: userIds.has(U("user", t.processedBy)) ? uuidFor("user", t.processedBy) : null,
  processed_at: date(t.processedAt), details: t.details || null, metadata: t.metadata || {}, transaction_date: date(t.transactionDate) || new Date().toISOString(),
}));
await upsert("transactions", txs);

// ------------------------------------------------------------- deposits
await upsert("deposits", (await all("deposits")).filter((d) => userIds.has(U("user", d.userId))).map((d) => ({
  id: uuidFor("deposit", d._id), user_id: uuidFor("user", d.userId), amount: num(d.amount), transaction_id: d.transactionId || "-",
  account_type: d.accounttype || "-", attachment: d.attachment || [], date_time: date(d.dateTime) || new Date().toISOString(),
  payment_provider: d.paymentProvider === "nowpayments" ? "nowpayments" : "manual", payment_status: d.paymentStatus || "pending",
  pay_currency: d.payCurrency || null, actually_paid: d.actuallyPaid ?? null, now_payments_invoice_id: d.nowPaymentsInvoiceId || null,
  now_payments_payment_id: d.nowPaymentsPaymentId || null, invoice_url: d.invoiceUrl || null, now_payments_raw: d.nowPaymentsRaw || null,
  created_at: date(d.createdAt) || new Date().toISOString(),
})));

// ------------------------------------------------------------- contacts
await upsert("contacts", (await all("contacts")).map((c) => ({
  id: uuidFor("contact", c._id), name: c.name || "-", email: c.email || "-", phone: c.phone || "-", country: c.country || "-",
  comment: c.comment || "-", status: ["pending", "read", "archived"].includes(c.status) ? c.status : "pending",
  read_by: userIds.has(U("user", c.readBy)) ? uuidFor("user", c.readBy) : null, read_at: date(c.readAt),
  created_at: date(c.createdAt) || new Date().toISOString(),
})));

console.log("\nReport (rows read / written):");
console.table(report);
if (!COMMIT) console.log("Dry run only. Re-run with --commit to write to Supabase.");
else console.log("Done. Tell users to use 'Forgot password' to set a new password (old hashes cannot be imported).");
await mongo.close();

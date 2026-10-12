/**
 * MongoDB -> Supabase migration logic (dependency-injected so it can be tested).
 *   db: a Mongo Db  (needs .collection(name).find({}).toArray())
 *   sb: a supabase-js client (service role)
 */
import crypto from "node:crypto";

const NS = "6ba7b811-9dad-11d1-80b4-00c04fd430c8";

// Deterministic uuid (RFC 4122 v5) from a Mongo ObjectId so re-runs hit the same rows.
export function uuidFor(kind, oid) {
  const ns = Buffer.from(NS.replace(/-/g, ""), "hex");
  const h = crypto.createHash("sha1").update(Buffer.concat([ns, Buffer.from(`${kind}:${String(oid)}`)])).digest();
  h[6] = (h[6] & 0x0f) | 0x50;
  h[8] = (h[8] & 0x3f) | 0x80;
  const x = h.subarray(0, 16).toString("hex");
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
}

const num = (v, d = 0) => (v === undefined || v === null || Number.isNaN(Number(v)) ? d : Number(v));
const date = (v) => (v ? new Date(v).toISOString() : null);
const nowIso = () => new Date().toISOString();
const round4 = (n) => Math.round(n * 1e4) / 1e4;

const TX_TYPES = new Set(["withdrawal", "profit", "MACHINE_PURCHASE", "MACHINE_SALE", "SHARE_PURCHASE", "SHARE_PROFIT", "SHARE_SALE", "ADMIN_ADD"]);
const TX_STATUS = new Set(["pending", "approved", "rejected", "completed"]);

export async function migrate({ db, sb, commit = false, log = () => {} }) {
  const report = {};
  const bump = (name, key, n = 1) => ((report[name] ||= { read: 0, written: 0, skipped: 0 })[key] += n);
  const discrepancies = [];
  const warnings = [];

  const all = async (c) => {
    const rows = await db.collection(c).find({}).toArray();
    bump(c, "read", rows.length);
    return rows;
  };
  const write = async (table, rows, onConflict = "id", source = table) => {
    bump(source, "written", rows.length);
    if (!commit || !rows.length) return;
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await sb.from(table).upsert(rows.slice(i, i + 500), { onConflict });
      if (error) throw new Error(`${table}: ${error.message}`);
    }
  };

  // ---------------------------------------------------------------- users
  const users = await all("users");
  const seen = new Set();
  const profiles = [];
  const mongoUserById = new Map(); // uuid -> mongo user (for balances/reporting)
  for (const u of users) {
    const email = String(u.email || "").trim().toLowerCase();
    if (!email || seen.has(email)) { bump("users", "skipped"); warnings.push(`user skipped (missing/duplicate email): ${u._id}`); continue; }
    seen.add(email);
    const id = uuidFor("user", u._id);

    if (commit) {
      const { data: existing } = await sb.auth.admin.getUserById(id);
      if (!existing?.user) {
        const { error } = await sb.auth.admin.createUser({
          id, email, email_confirm: true, password: crypto.randomBytes(24).toString("base64url"),
        });
        if (error) { bump("users", "skipped"); warnings.push(`auth user failed for ${email}: ${error.message}`); continue; }
      }
    }
    mongoUserById.set(id, u);
    profiles.push({
      id, first_name: u.firstName || "-", last_name: u.lastName || "-", email, phone_number: String(u.phoneNumber || "000000"),
      country: u.country || "-", role: u.role === "admin" ? "admin" : "user", referral_code: u.referralCode || null, referred_by: null,
      referral_status: u.referralStatus || null, deposit_count: u.deposit_count ?? null, discount: num(u.discount),
      two_factor_enabled: !!u.twoFactorEnabled, created_at: date(u.createdAt) || nowIso(),
    });
  }
  await write("profiles", profiles, "id", "users");
  const userIds = new Set(profiles.map((p) => p.id));
  const uid = (oid) => (oid ? uuidFor("user", oid) : null);

  const refs = users
    .filter((u) => u.referralId && userIds.has(uid(u._id)) && userIds.has(uid(u.referralId)))
    .map((u) => ({ id: uid(u._id), ref: uid(u.referralId) }));
  if (commit) {
    for (const r of refs) {
      const { error } = await sb.from("profiles").update({ referred_by: r.ref }).eq("id", r.id);
      if (error) throw new Error(`referral link: ${error.message}`);
    }
  }
  report["referral links"] = { read: refs.length, written: refs.length, skipped: 0 };

  // ------------------------------------------------------------- balances
  // Mongo had no unique index on Balance.user, so keep the most recently updated doc per user.
  const latest = new Map();
  for (const b of await all("balances")) {
    const id = uid(b.user);
    if (!userIds.has(id)) { bump("balances", "skipped"); continue; }
    const prev = latest.get(id);
    if (prev) warnings.push(`duplicate balance docs for user ${id}; keeping the most recently updated`);
    if (!prev || new Date(b.lastUpdated || 0) >= new Date(prev.lastUpdated || 0)) latest.set(id, b);
  }
  const balances = new Map();
  for (const [id, b] of latest) {
    balances.set(id, { user_id: id, admin_add: num(b.adminAdd), mining_balance: num(b.miningBalance), _mongoTotal: num(b.totalBalance, NaN) });
  }
  // legacy User.mainBalance (old withdrawal flow, deducted up-front) is folded into deposited funds
  for (const u of users) {
    const id = uid(u._id);
    if (!userIds.has(id) || !num(u.mainBalance)) continue;
    const b = balances.get(id) || { user_id: id, admin_add: 0, mining_balance: 0, _mongoTotal: NaN };
    b.admin_add += num(u.mainBalance);
    b._legacy = num(u.mainBalance);
    balances.set(id, b);
  }
  const balanceRows = [];
  for (const b of balances.values()) {
    const row = { user_id: b.user_id, admin_add: round4(Math.max(0, b.admin_add)), mining_balance: round4(Math.max(0, b.mining_balance)) };
    const email = mongoUserById.get(b.user_id)?.email;
    const notes = [];
    if (b.admin_add < 0 || b.mining_balance < 0) notes.push("negative balance clamped to 0");
    if (b._legacy) notes.push(`legacy mainBalance ${b._legacy} added to admin_add`);
    if (Number.isFinite(b._mongoTotal) && Math.abs(b._mongoTotal - (b.admin_add + b.mining_balance - (b._legacy || 0))) > 0.005) {
      notes.push(`Mongo totalBalance (${b._mongoTotal}) differed from adminAdd+miningBalance (e.g. unbooked referral bonus)`);
    }
    if (notes.length) {
      discrepancies.push({
        email, mongo_adminAdd: b.admin_add - (b._legacy || 0), mongo_miningBalance: b.mining_balance, mongo_totalBalance: b._mongoTotal,
        new_admin_add: row.admin_add, new_mining_balance: row.mining_balance, note: notes.join("; "),
      });
    }
    balanceRows.push(row);
  }
  await write("balances", balanceRows, "user_id");

  // ------------------------------------------------------------- machines
  const machines = (await all("miningmachines")).map((m) => ({
    id: uuidFor("machine", m._id), machine_name: m.machineName || "-", hashrate: String(m.hashrate ?? ""), power_consumption: num(m.powerConsumption),
    price_range: Math.max(0, num(m.priceRange)), coins_mined: m.coinsMined || "", monthly_profit: Math.max(0, num(m.monthlyProfit)),
    description: m.description || "", images: m.images || [], is_share_based: !!m.isShareBased, share_price: num(m.sharePrice, 50),
    total_shares: num(m.totalShares, 380), available_shares: num(m.availableShares, 380), profit_per_share: num(m.profitPerShare, 9.21),
    created_at: date(m.createdAt) || nowIso(),
  }));
  await write("mining_machines", machines, "id", "miningmachines");
  const machineIds = new Set(machines.map((m) => m.id));

  const userMachines = [];
  for (const um of await all("usermachines")) {
    if (!userIds.has(uid(um.user))) { bump("usermachines", "skipped"); continue; }
    const mid = uuidFor("machine", um.machine);
    userMachines.push({
      id: uuidFor("usermachine", um._id), user_id: uid(um.user), machine_id: machineIds.has(mid) ? mid : null,
      assigned_date: date(um.assignedDate) || nowIso(), status: um.status === "inactive" ? "inactive" : "active",
      monthly_profit_accumulated: num(um.monthlyProfitAccumulated), last_profit_update: date(um.lastProfitUpdate),
      machine_name: um.machineName || "-", hashrate: String(um.hashrate ?? ""), power_consumption: num(um.powerConsumption),
      price_range: num(um.priceRange), coins_mined: um.coinsMined || "", monthly_profit: num(um.monthlyProfit),
      description: um.description || "", images: um.images || [], created_at: date(um.createdAt) || nowIso(),
    });
  }
  await write("user_machines", userMachines, "id", "usermachines");

  const shares = [];
  for (const s of await all("sharepurchases")) {
    if (!userIds.has(uid(s.user)) || !machineIds.has(uuidFor("machine", s.machine))) { bump("sharepurchases", "skipped"); continue; }
    shares.push({
      id: uuidFor("share", s._id), user_id: uid(s.user), machine_id: uuidFor("machine", s.machine),
      number_of_shares: Math.max(1, num(s.numberOfShares, 1)), price_per_share: num(s.pricePerShare), profit_per_share: num(s.profitPerShare),
      total_investment: num(s.totalInvestment), purchase_date: date(s.purchaseDate) || nowIso(),
      last_profit_update: date(s.lastProfitUpdate) || date(s.purchaseDate) || nowIso(),
      status: s.status === "inactive" ? "inactive" : "active", total_profit_earned: num(s.totalProfitEarned),
    });
  }
  await write("share_purchases", shares, "id", "sharepurchases");

  // --------------------------------------------------------- transactions
  const txs = [];
  for (const t of await all("transactions")) {
    if (!userIds.has(uid(t.user)) || !TX_TYPES.has(t.type)) { bump("transactions", "skipped"); continue; }
    txs.push({
      id: uuidFor("tx", t._id), user_id: uid(t.user), amount: num(t.amount), type: t.type, status: TX_STATUS.has(t.status) ? t.status : "completed",
      wallet_address: t.walletAddress || null, network: t.network || null, balance_before: t.balanceBefore ?? null, balance_after: t.balanceAfter ?? null,
      admin_comment: t.adminComment || null, processed_by: userIds.has(uid(t.processedBy)) ? uid(t.processedBy) : null,
      processed_at: date(t.processedAt), details: t.details || null, metadata: t.metadata || {}, transaction_date: date(t.transactionDate) || nowIso(),
    });
  }
  await write("transactions", txs, "id");
  const pendingWd = txs.filter((t) => t.type === "withdrawal" && t.status === "pending").length;
  if (pendingWd) warnings.push(`${pendingWd} pending withdrawal(s) migrated: they remain pending and reserve funds; process them in the admin panel.`);

  // ------------------------------------------------------------- deposits
  const deposits = [];
  for (const d of await all("deposits")) {
    if (!userIds.has(uid(d.userId))) { bump("deposits", "skipped"); continue; }
    deposits.push({
      id: uuidFor("deposit", d._id), user_id: uid(d.userId), amount: num(d.amount), transaction_id: d.transactionId || "-",
      account_type: d.accounttype || "-", attachment: d.attachment || [], date_time: date(d.dateTime) || nowIso(),
      payment_provider: d.paymentProvider === "nowpayments" ? "nowpayments" : "manual", payment_status: d.paymentStatus || "pending",
      pay_currency: d.payCurrency || null, actually_paid: d.actuallyPaid ?? null, now_payments_invoice_id: d.nowPaymentsInvoiceId || null,
      now_payments_payment_id: d.nowPaymentsPaymentId || null, invoice_url: d.invoiceUrl || null, now_payments_raw: d.nowPaymentsRaw || null,
      created_at: date(d.createdAt) || nowIso(),
    });
  }
  await write("deposits", deposits, "id");

  // ------------------------------------------------------------- contacts
  await write("contacts", (await all("contacts")).map((c) => ({
    id: uuidFor("contact", c._id), name: c.name || "-", email: c.email || "-", phone: c.phone || "-", country: c.country || "-",
    comment: c.comment || "-", status: ["pending", "read", "archived"].includes(c.status) ? c.status : "pending",
    read_by: userIds.has(uid(c.readBy)) ? uid(c.readBy) : null, read_at: date(c.readAt), created_at: date(c.createdAt) || nowIso(),
  })), "id");

  // legacy collection that is intentionally not migrated
  const legacy = await db.collection("withdrawals").find({}).toArray();
  if (legacy.length) {
    const pending = legacy.filter((w) => w.status === "Pending").length;
    warnings.push(`${legacy.length} legacy 'withdrawals' document(s) not migrated${pending ? ` (${pending} still Pending — handle manually)` : ""}.`);
  }

  log(commit ? "committed" : "dry run");
  return { report, discrepancies, warnings };
}

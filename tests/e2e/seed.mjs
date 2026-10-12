// Deterministic demo data: ~40 users over ~110 days with deposits, purchases, profits, payouts and a
// few pending withdrawals of different ages, so every dashboard state (including "overdue") is exercised.
const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const R = rng(20261014);
const pick = (a) => a[Math.floor(R() * a.length)];
const int = (a, b) => a + Math.floor(R() * (b - a + 1));
const DAY = 86400000, HOUR = 3600000;
const iso = (ms) => new Date(ms).toISOString();

const FIRST = ["Ayesha", "Bilal", "Carlos", "Dina", "Elena", "Farhan", "Grace", "Hamza", "Ines", "Jamal", "Khadija", "Liam", "Maya", "Nadir", "Omar", "Priya", "Qasim", "Rania", "Sana", "Tariq", "Uzma", "Victor", "Wafa", "Yusuf", "Zara"];
const LAST = ["Khan", "Ahmed", "Silva", "Haddad", "Petrova", "Malik", "Okafor", "Sheikh", "Rossi", "Nasser", "Ali", "Tan", "Rahman", "Qureshi", "Costa", "Iqbal"];
const COUNTRIES = ["PK", "AE", "US", "GB", "IL", "VE", "DE", "SA", "IN", "BR"];

export async function seedDemo(db) {
  const now = Date.now();
  const q = (sql, p = []) => db.query(sql, p);

  const adminId = (await q(`insert into auth.users (email) values ('sara@admin.test') returning id`)).rows[0].id;
  await q(`insert into public.profiles (id, first_name, last_name, email, phone_number, country, role, referral_code, created_at) values ($1,'Sara','Admin','sara@admin.test','+971500000000','AE','admin','sara-1',$2)`, [adminId, iso(now - 200 * DAY)]);

  const users = [];
  for (let i = 0; i < 40; i++) {
    const first = FIRST[i % FIRST.length], last = LAST[(i * 3) % LAST.length];
    const email = `${first}.${last}${i}@mail.test`.toLowerCase();
    const age = i < 6 ? int(0, 5) * DAY + int(1, 20) * HOUR : int(8, 110) * DAY;   // 6 brand-new users
    const id = (await q(`insert into auth.users (email) values ($1) returning id`, [email])).rows[0].id;
    await q(`insert into public.profiles (id, first_name, last_name, email, phone_number, country, referral_code, created_at, two_factor_enabled, referred_by) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [id, first, last, email, `+${int(100, 999)}${int(1000000, 9999999)}`, pick(COUNTRIES), `ref-${i}`, iso(now - age), R() < 0.2, i > 10 && R() < 0.3 ? users[int(0, 9)]?.id ?? null : null]);
    users.push({ id, first, last, email, age, i });
  }

  const machine = (await q(`insert into public.mining_machines (machine_name, hashrate, power_consumption, price_range, coins_mined, monthly_profit, description) values ('Antminer S19 Pro','110 TH/s',3250,1200,'Bitcoin',140,'demo') returning id`)).rows[0].id;

  const tx = (user, type, amount, status, whenMs, extra = {}) => q(
    `insert into public.transactions (user_id, amount, type, status, transaction_date, processed_at, details, metadata, wallet_address, network, balance_after)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [user, amount, type, status, iso(whenMs), status === "pending" ? null : iso(extra.processedMs ?? whenMs), extra.details ?? null, JSON.stringify(extra.metadata ?? {}), extra.wallet ?? null, extra.network ?? null, extra.balanceAfter ?? null]);

  let pendingIdx = 0;
  const pendingAges = [20, 30, 60, 100];                         // hours: the oldest is "overdue" (> 72h)
  for (const u of users) {
    const joined = now - u.age;
    const active = u.i % 5 !== 4;                                  // 20% never deposit
    const dormant = u.i % 7 === 3 && u.age > 50 * DAY;             // funds but nothing in 30+ days
    let adminAdd = 0, mining = 0;
    if (active) {
      const deposits = int(1, 4);
      for (let d = 0; d < deposits; d++) {
        const when = dormant ? joined + int(0, 10) * DAY : Math.max(joined + HOUR, now - int(0, Math.min(60, Math.floor(u.age / DAY))) * DAY - int(0, 20) * HOUR);
        const amt = pick([100, 250, 500, 1000, 1500, 2500, 4000]);
        adminAdd += amt;
        await tx(u.id, "ADMIN_ADD", amt, "approved", when, { details: pick(["USDT TRC20 deposit", "Bank transfer", "Binance Pay", "NOWPayments deposit"]) });
      }
      if (!dormant && R() < 0.7) {
        const when = now - int(1, 40) * DAY;
        if (when > joined) {
          await tx(u.id, "MACHINE_PURCHASE", 1200, "completed", when, { metadata: { quantity: 1, machineName: "Antminer S19 Pro" } });
          adminAdd = Math.max(0, adminAdd - 1200);
          await q(`insert into public.user_machines (user_id, machine_id, machine_name, hashrate, power_consumption, price_range, coins_mined, monthly_profit, description, assigned_date) values ($1,$2,'Antminer S19 Pro','110 TH/s',3250,1200,'Bitcoin',140,'demo',$3)`, [u.id, machine, iso(when)]);
          for (let m = 1; when + m * 30 * DAY < now; m++) { mining += 140; await tx(u.id, "profit", 140, "completed", when + m * 30 * DAY, { details: "Monthly profit from Antminer S19 Pro" }); }
        }
      }
      if (!dormant && R() < 0.35) { const w = pick([100, 200, 300, 500]); mining = Math.max(0, mining - w); await tx(u.id, "withdrawal", w, "approved", now - int(2, 30) * DAY, { processedMs: now - int(1, 25) * DAY, wallet: `T${u.id.slice(0, 12)}`, network: "TRC20" }); }
      if (!dormant && R() < 0.1) await tx(u.id, "withdrawal", 150, "rejected", now - int(3, 20) * DAY, { processedMs: now - int(1, 2) * DAY, wallet: `T${u.id.slice(0, 12)}`, network: "TRC20" });
      if (!dormant && pendingIdx < pendingAges.length && adminAdd + mining > 400 && u.i > 6) {
        await tx(u.id, "withdrawal", pick([120, 250, 400]), "pending", now - pendingAges[pendingIdx++] * HOUR, { wallet: `TPEND${u.id.slice(0, 8)}`, network: "TRC20" });
      }
      await q(`insert into public.balances (user_id, admin_add, mining_balance) values ($1,$2,$3)`, [u.id, adminAdd, mining]);
    }
  }
  const contacts = [["Nora", "pending"], ["Idris", "pending"], ["Lina", "pending"], ["Omar", "pending"], ["Tess", "read"], ["Vik", "read"]];
  for (const [name, status] of contacts) await q(`insert into public.contacts (name,email,phone,country,comment,status,created_at) values ($1,$2,'1','US','Question about withdrawals',$3,$4)`, [name, `${name.toLowerCase()}@x.test`, status, iso(now - int(0, 6) * DAY)]);

  return { adminId, users };
}

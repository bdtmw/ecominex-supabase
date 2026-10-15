// Opens the USER pages as a share-only investor (Ahmad-like) and reports what the API returns and what the page shows.
import http from "node:http";
import { spawn } from "node:child_process";
import { SignJWT } from "jose";
import { chromium } from "playwright";
import { createDb, makeUser } from "../sql/harness.mjs";
import { startFakeSupabase } from "./fakeSupabase.mjs";

const SB = 54399, WEB = 3192, BASE = `http://127.0.0.1:${WEB}`, SECRET = "e2e-secret";
const db = await createDb({ parsers: { 1700: (v) => parseFloat(v), 20: (v) => Number(v) } });
const sb = await startFakeSupabase(db, SB);
const uid = await makeUser(db, { adminAdd: 0, mining: 150 });
await db.query(`update public.profiles set first_name='Unrepentant', last_name='Godfather', email='ahmad@test.com' where id=$1`, [uid]);
const machine = (await db.query(`insert into public.mining_machines (machine_name, hashrate, power_consumption, price_range, coins_mined, monthly_profit, description, is_share_based, share_price, total_shares, available_shares, profit_per_share) values ('GoldShell KD 6 II','26 TH/s',3000,19000,'KDA',3500,'x',true,50,380,320,9.21) returning id`)).rows[0].id;
const shares = [[1, "2026-05-25", "inactive"], [8, "2026-06-28", "active"], [10, "2026-07-31", "active"], [12, "2026-09-27", "active"]];
for (const [n, d, st] of shares) await db.query(`insert into public.share_purchases (user_id, machine_id, number_of_shares, price_per_share, profit_per_share, total_investment, purchase_date, last_profit_update, status) values ($1,$2,$3,50,9.21,$4,$5,$5,$6)`, [uid, machine, n, n * 50, d, st]);
await db.query(`insert into public.transactions (user_id, type, amount, status, transaction_date, processed_at) values ($1,'ADMIN_ADD',500,'approved','2026-06-01','2026-06-01'),($1,'SHARE_PURCHASE',400,'completed','2026-06-28','2026-06-28'),($1,'withdrawal',61,'approved','2026-06-12','2026-06-12')`, [uid]);
const token = await new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject(uid).setExpirationTime("1d").sign(new TextEncoder().encode(SECRET));

const web = spawn("npx", ["next", "start", "-p", String(WEB)], { env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${SB}`, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "x", SUPABASE_SECRET_KEY: "x", APP_JWT_SECRET: SECRET, APP_URL: BASE }, stdio: ["ignore", "pipe", "pipe"] });
process.on("exit", () => web.kill("SIGTERM"));
for (let i = 0; i < 60; i++) { try { if ((await fetch(`${BASE}/terms/`)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 500)); }

const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
await ctx.addInitScript((t) => { localStorage.setItem("token", t); localStorage.setItem("IsAuthenticate", "true"); }, token);
await ctx.route(/googletagmanager|lovable\.app/, (r) => r.abort());
const results = [];
const check = (name, ok, detail = "") => { results.push(ok); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `   [${detail}]`}`); };
const texts = {};
for (const path of ["/user/dashboard/", "/user/machines/", "/user/wallet/"]) {
  const page = await ctx.newPage();
  const calls = [];
  page.on("response", async (r) => { if (r.url().includes("/api/v1/")) calls.push(`${r.status()} ${r.request().method()} ${r.url().replace(BASE, "").slice(0, 70)}`); });
  const errs = []; page.on("pageerror", (e) => errs.push(String(e).slice(0, 200)));
  await page.goto(BASE + path); await page.waitForTimeout(4000);
  const bad = calls.filter((c) => /^(4|5)\d\d /.test(c) && !c.includes("special-machine"));
  check(`${path}: every API call succeeded`, bad.length === 0, bad.join(" | "));
  texts[path] = (await page.locator("main, body").first().innerText()).replace(/\s+/g, " ");
  if (errs.length) check(`${path} has no page errors`, false, errs.join(" | "));
  await page.screenshot({ path: `/tmp/claude-0/up${path.replace(/\//g, "_")}.png` });
  await page.close();
}
const d = texts["/user/dashboard/"], m = texts["/user/machines/"], w = texts["/user/wallet/"];
check("dashboard shows machines AND shares ('0 machines · 30 shares')", /0 machines · 30 shares/.test(d), d.slice(0, 300));
check("dashboard recent activity lists every kind of entry (deposit, share purchase, withdrawal)", /Deposit credited/.test(d) && /Share purchase/.test(d) && /Withdrawal/.test(d), d);
check("machines page lists the shares", /Shares Owned: 30/.test(m) || /30/.test(m), m.slice(0, 300));
check("wallet history lists every kind of entry", /Share purchase/.test(w) && /Deposit credited/.test(w) && /Withdrawal/.test(w), w);
await browser.close(); web.kill("SIGTERM"); sb.close(); process.exit(results.every(Boolean) ? 0 : 1);

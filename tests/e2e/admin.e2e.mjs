// End-to-end: real browser -> real Next.js pages + API handlers -> fake Supabase REST -> real Postgres SQL.
// Expected numbers are computed straight from the database, independent of the UI code.
//   npm run build && npm run test:e2e        (set PW_CHROMIUM=/path/to/chrome if Playwright's browser isn't installed)
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { SignJWT } from "jose";
import { chromium } from "playwright";
import { createDb } from "../sql/harness.mjs";
import { seedDemo } from "./seed.mjs";
import { startFakeSupabase } from "./fakeSupabase.mjs";

const SB_PORT = 54399, WEB_PORT = 3190, BASE = `http://127.0.0.1:${WEB_PORT}`;
const OUT = process.env.E2E_OUT || "tests/e2e/out";
mkdirSync(OUT, { recursive: true });
const SECRET = "e2e-secret";
const DAY = 86400000;

const results = [];
const check = (name, ok, detail = "") => { results.push({ ok: !!ok, name, detail }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `   [${detail}]`}`); };

// --- same formatting as the app (so expected text can be compared exactly)
const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const money = (n) => usd.format(Number(n));
const usd2 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

const db = await createDb({ parsers: { 1700: (v) => parseFloat(v), 20: (v) => Number(v) } });
const { adminId, users } = await seedDemo(db);
const sb = await startFakeSupabase(db, SB_PORT);
const token = await new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject(adminId).setExpirationTime("1d").sign(new TextEncoder().encode(SECRET));

const web = spawn("npx", ["next", "start", "-p", String(WEB_PORT)], {
  env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${SB_PORT}`, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "x", SUPABASE_SECRET_KEY: "x", APP_JWT_SECRET: SECRET, APP_URL: BASE },
  stdio: ["ignore", "pipe", "pipe"],
});
let webLog = ""; web.stdout.on("data", (d) => (webLog += d)); web.stderr.on("data", (d) => (webLog += d));
const cleanup = async () => { web.kill("SIGTERM"); sb.close(); };
process.on("exit", () => web.kill("SIGTERM"));

for (let i = 0; i < 60; i++) { try { if ((await fetch(`${BASE}/terms/`)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 500)); if (i === 59) { console.error("Next did not start:\n" + webLog); process.exit(2); } }

// ---------- expected values from SQL
const startOfDay = (d) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
const windowFor = (days) => { const to = startOfDay(new Date()) + DAY; return { from: new Date(to - days * DAY).toISOString(), to: new Date(to).toISOString() }; };
const rpc = async (fn, ...a) => (await db.query(`select public.${fn}(${a.map((_, i) => `$${i + 1}`).join(",")}) as r`, a)).rows[0].r;
const kpis = (days) => { const w = windowFor(days); return rpc("fn_admin_kpis", adminId, w.from, w.to); };
const ledger = (days, cats = null, statuses = null, user = null, limit = 50, offset = 0) => { const w = days ? windowFor(days) : { from: null, to: null }; return rpc("fn_admin_ledger", adminId, w.from, w.to, cats, statuses, user, null, null, null, limit, offset); };
const users_ = (seg = "all", sort = "joined", dir = "desc", limit = 25, offset = 0, search = null) => rpc("fn_admin_users_overview", adminId, search, seg, sort, dir, limit, offset);

const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const mk = async (viewport) => {
  const ctx = await browser.newContext({ viewport, acceptDownloads: true });
  await ctx.addInitScript((t) => { localStorage.setItem("token", t); localStorage.setItem("IsAuthenticate", "true"); }, token);
  await ctx.route(/googletagmanager|lovable\.app/, (r) => r.abort());
  const page = await ctx.newPage();
  const errors = []; page.on("pageerror", (e) => errors.push(String(e)));
  return { ctx, page, errors };
};
const { page, errors } = await mk({ width: 1360, height: 900 });
const text = async (loc) => (await loc.first().innerText()).replace(/\s+/g, " ").trim();
const tileValue = async (label) => text(page.locator("div.rounded-2xl", { has: page.getByText(label, { exact: true }) }).locator("p").nth(1));

// =====================================================================  OVERVIEW
await page.goto(`${BASE}/Dashboard/`);
await page.getByText("Needs attention").waitFor();
await page.waitForFunction(() => !document.body.innerText.includes("Loading…"), null, { timeout: 15000 });
await page.waitForTimeout(500);
const k30 = await kpis(30);

check("overview: hero 'Net cash flow' equals deposits − withdrawals from SQL", (await tileValue("Net cash flow")) === money(k30.current.deposits - k30.current.withdrawals), `${await tileValue("Net cash flow")} vs ${money(k30.current.deposits - k30.current.withdrawals)}`);
check("overview: 'Deposits credited' tile matches SQL", (await tileValue("Deposits credited")) === money(k30.current.deposits));
check("overview: 'Withdrawals paid' tile matches SQL", (await tileValue("Withdrawals paid")) === money(k30.current.withdrawals));
check("overview: 'New users' tile matches SQL", (await tileValue("New users")) === String(k30.current.newUsers), await tileValue("New users"));
check("overview: 'Machine investments' and 'Mining profit paid' match SQL", (await tileValue("Machine investments")) === money(k30.current.investments) && (await tileValue("Mining profit paid")) === money(k30.current.profitPaid));
const pw = k30.attention.pendingWithdrawals;
check("overview: attention card shows the pending count and amount", (await page.getByText(`${pw.count} pending withdrawal`).count()) === 1 && (await page.getByText(money(pw.amount), { exact: true }).count()) >= 1, `count=${pw.count} amount=${pw.amount}`);
check("overview: the oldest pending request (100h) is flagged Overdue with an icon + label", (await page.getByText("Overdue", { exact: true }).count()) === 1);
check("overview: 'Funds held' equals the sum of balances", (await page.getByText(money(k30.snapshot.fundsHeld), { exact: true }).count()) >= 1, money(k30.snapshot.fundsHeld));
const top = k30.attention.topUsers[0];
check("overview: largest balance listed first", (await text(page.locator("section", { hasText: "Largest balances" }).locator("ol li").first())).includes(money(top.totalBalance)), top.name);

// no charts on the overview
check("overview: no charts are rendered", (await page.locator('svg[role="img"][aria-label*="arrow keys"]').count()) === 0);
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/1-overview-top.png` });
await page.evaluate(() => window.scrollTo(0, 0));

// range filter scopes everything
await page.getByRole("button", { name: /Last 30 days/ }).click();
await page.getByRole("option", { name: "Last 7 days" }).click();
await page.waitForURL(/range=7d/);
const k7 = await kpis(7);
await page.waitForFunction((v) => document.body.innerText.includes(v), money(k7.current.deposits - k7.current.withdrawals), { timeout: 10000 }).catch(() => {});
check("overview: switching to 'Last 7 days' updates the URL and every figure", (await tileValue("Net cash flow")) === money(k7.current.deposits - k7.current.withdrawals) && (await tileValue("Deposits credited")) === money(k7.current.deposits), `${await tileValue("Net cash flow")} vs ${money(k7.current.deposits - k7.current.withdrawals)}`);

// =====================================================================  USERS
const u0 = await users_();
await page.goto(`${BASE}/Dashboard/AllUser/`);
await page.getByRole("tab", { name: /All/ }).first().waitFor();
await page.waitForFunction(() => document.querySelectorAll("tbody tr").length > 1, null, { timeout: 15000 });
const tabCount = async (name) => Number((await text(page.getByRole("tab", { name: new RegExp(`^${name}`) }))).match(/(\d+)\s*$/)?.[1]);
check("users: segment tab counts equal SQL", (await tabCount("All")) === u0.segmentCounts.all && (await tabCount("New this week")) === u0.segmentCounts.new && (await tabCount("Pending withdrawal")) === u0.segmentCounts.pending_withdrawal && (await tabCount("Dormant with funds")) === u0.segmentCounts.dormant, JSON.stringify(u0.segmentCounts));
check("users: first page has 25 rows and says 'Page 1 of 2'", (await page.locator("tbody tr").count()) === 25 && (await page.getByText(/Page 1 of 2/).count()) === 1);
await page.getByRole("button", { name: /Next/ }).click();
await page.waitForURL(/page=2/);
await page.waitForFunction((n) => document.querySelectorAll("tbody tr").length === n, u0.total - 25, { timeout: 10000 }).catch(() => {});
check("users: page 2 shows the remaining users", (await page.locator("tbody tr").count()) === u0.total - 25, `${await page.locator("tbody tr").count()} vs ${u0.total - 25}`);

await page.getByRole("tab", { name: /^Pending withdrawal/ }).click();
await page.waitForURL(/segment=pending_withdrawal/);
await page.waitForFunction((n) => document.querySelectorAll("tbody tr").length === n, u0.segmentCounts.pending_withdrawal, { timeout: 10000 }).catch(() => {});
check("users: 'Pending withdrawal' segment lists exactly those users, each with the amount flagged", (await page.locator("tbody tr").count()) === u0.segmentCounts.pending_withdrawal && (await page.locator("tbody tr", { hasText: "withdrawing" }).count()) === u0.segmentCounts.pending_withdrawal);
await page.evaluate(() => window.scrollTo(0, 0));
await page.screenshot({ path: `${OUT}/2-users-pending.png`, fullPage: true });

await page.goto(`${BASE}/Dashboard/AllUser/?sort=balance&dir=desc`);
await page.waitForFunction(() => document.querySelectorAll("tbody tr").length > 1);
const topBal = (await users_("all", "balance", "desc", 1)).rows[0];
check("users: sorting by Balance puts the richest user first", (await text(page.locator("tbody tr").first())).includes(topBal.email) && (await text(page.locator("tbody tr").first())).includes(money(topBal.totalBalance)), topBal.email);
check("users: the sorted column announces its direction (aria-sort)", (await page.locator('th[aria-sort="descending"]').count()) === 1);

const needle = users[7].first + "." + users[7].last;
await page.getByPlaceholder(/Search name, email/).fill(users[7].email.slice(0, 14));
await page.waitForURL(/search=/);
await page.waitForFunction(() => document.querySelectorAll("tbody tr").length <= 3, null, { timeout: 10000 });
check("users: search narrows the list and keeps the segment/sort in the URL", (await page.locator("tbody tr", { hasText: users[7].email }).count()) === 1 && /sort=balance/.test(page.url()), page.url());
await page.getByRole("button", { name: "Clear search" }).click();

await page.goto(`${BASE}/Dashboard/AllUser/`);
await page.waitForFunction(() => document.querySelectorAll("tbody tr").length > 1);
const dl = page.waitForEvent("download");
await page.getByRole("button", { name: "Export CSV" }).click();
const file = await dl; const csv = readFileSync(await file.path(), "utf8");
check("users: CSV export has a header and one line per user", csv.startsWith("﻿Name,Email") && csv.trim().split("\r\n").length === u0.total + 1, `${csv.trim().split("\r\n").length} lines vs ${u0.total + 1}`);

const richRow = page.locator("tbody tr", { hasText: topBal.email });
await page.goto(`${BASE}/Dashboard/AllUser/?sort=balance&dir=desc`);
await page.waitForFunction(() => document.querySelectorAll("tbody tr").length > 1);
check("users: every row links to that user's ledger", (await page.locator("tbody tr").first().locator('a[href*="/Dashboard/Ledger?user="]').count()) >= 1);
await page.locator("tbody tr").first().getByRole("button", { name: /More actions/ }).click();
await page.getByRole("menuitem", { name: "Delete user…" }).click();
await page.locator(".swal2-input").waitFor();
check("users: deleting someone with money requires typing their email", (await page.locator(".swal2-html-container").innerText()).includes("permanently erases") && (await page.locator(".swal2-input").count()) === 1);
await page.click(".swal2-cancel");

// =====================================================================  LEDGER
const L30 = await ledger(30);
await page.goto(`${BASE}/Dashboard/Ledger/`);
await page.getByText("Money in").waitFor();
await page.waitForFunction(() => document.querySelectorAll("tbody tr").length > 1, null, { timeout: 15000 });
const lt = async (label) => text(page.locator("[data-stat]", { has: page.getByText(label, { exact: true }) }).locator("dd"));
check("ledger: totals tiles equal SQL (money in / out / on hold)", (await lt("Money in")) === money(L30.totals.credits) && (await lt("Money out")) === money(L30.totals.debits) && (await lt("On hold (pending withdrawals)")) === money(L30.totals.pendingHold), `${await lt("Money in")} ${await lt("Money out")}`);
check("ledger: shows 50 rows per page and the right entry count", (await page.locator("tbody tr").count()) === Math.min(50, L30.total) && (await page.getByText(new RegExp(`${L30.total} entr`)).count()) >= 1, `${L30.total}`);
await page.evaluate(() => window.scrollTo(0, 0));
await page.screenshot({ path: `${OUT}/3-ledger.png` });

await page.locator('select[aria-label="Type"]').selectOption("withdrawal");
await page.waitForURL(/category=withdrawal/);
const Lw = await ledger(30, ["withdrawal"]);
await page.waitForFunction((n) => document.querySelectorAll("tbody tr").length === n, Math.min(50, Lw.total), { timeout: 10000 }).catch(() => {});
const types = await page.locator("tbody tr td:nth-child(3)").allInnerTexts();
check("ledger: the Withdrawals filter shows only withdrawals", types.length === Math.min(50, Lw.total) && types.every((t) => t.includes("Withdrawal")), `${types.length} rows`);

await page.locator('select[aria-label="Status"]').selectOption("pending");
await page.waitForURL(/status=pending/);
const Lp = await ledger(30, ["withdrawal"], ["pending"]);
await page.waitForFunction((n) => document.querySelectorAll("tbody tr").length === n, Lp.total, { timeout: 10000 }).catch(() => {});
check("ledger: category + status combine (pending withdrawals only)", (await page.locator("tbody tr").count()) === Lp.total && (await page.locator("tbody tr", { hasText: "Pending" }).count()) === Lp.total, `${Lp.total}`);

const target = users[12];
await page.goto(`${BASE}/Dashboard/Ledger/?user=${target.id}&range=all`);
await page.getByText(/^Only /).waitFor();
const Lu = await ledger(null, null, null, target.id);
await page.waitForFunction((n) => document.querySelectorAll("tbody tr").length === n || document.body.innerText.includes("No ledger entries"), Lu.total, { timeout: 10000 }).catch(() => {});
check("ledger: ?user= shows only that user's entries and a removable chip", (Lu.total === 0 ? (await page.getByText("No ledger entries").count()) === 1 : (await page.locator("tbody tr").count()) === Lu.total) && (await page.getByRole("button", { name: "Show all users" }).count()) === 1, `${Lu.total}`);

await page.goto(`${BASE}/Dashboard/Ledger/?range=all`);
await page.waitForFunction(() => document.querySelectorAll("tbody tr").length > 1);
const Lall = await ledger(null);
const dl2 = page.waitForEvent("download");
await page.getByRole("button", { name: "Export CSV" }).click();
const csv2 = readFileSync(await (await dl2).path(), "utf8");
check("ledger: CSV export covers every filtered entry (not just the visible page)", csv2.trim().split("\r\n").length === Lall.total + 1 && csv2.includes("Effect on balance"), `${csv2.trim().split("\r\n").length} vs ${Lall.total + 1}`);
if (Lall.total > 50) {
  await page.getByRole("button", { name: /Next/ }).click(); await page.waitForURL(/page=2/);
  await page.getByText(/Page 2 of/).waitFor({ timeout: 10000 }).catch(() => {});
  check("ledger: pagination reaches page 2", (await page.getByText(/Page 2 of/).count()) === 1);
}

// =====================================================================  NAVIGATION + CROSS-LINKS
await page.goto(`${BASE}/Dashboard/`);
await page.getByText("Needs attention").waitFor();
await page.waitForFunction(() => !document.body.innerText.includes("Loading…"));
await page.getByRole("link", { name: /See these users/ }).click();
await page.waitForURL(/AllUser\/?\?segment=dormant/);
await page.waitForFunction(() => document.querySelectorAll("tbody tr").length >= 1);
check("cross-link: 'See these users' opens Users on the Dormant segment", (await page.getByRole("tab", { name: /^Dormant with funds/ }).getAttribute("aria-selected")) === "true");
check("sidebar: has Ledger under Finance and highlights it on the ledger page", await (async () => { await page.goto(`${BASE}/Dashboard/Ledger/`); await page.waitForSelector('nav[aria-label="Admin navigation"]'); return (await text(page.locator('nav[aria-label="Admin navigation"] a[aria-current="page"]'))).startsWith("Ledger"); })());
await page.keyboard.press("Control+k");
await page.getByRole("dialog", { name: "Jump to" }).waitFor();
await page.keyboard.type("ledg");
check("search: 'ledg' finds the Ledger page", (await page.getByRole("option", { name: /Ledger/ }).count()) >= 1);
await page.keyboard.press("Escape");
check("support chat widget is not loaded inside the admin area", (await page.locator("#lovable-widget-script").count()) === 0);

// short laptop screen (like a 1366x624 viewport): everything reachable, nothing covered
const short = await mk({ width: 1366, height: 624 });
await short.page.goto(`${BASE}/Dashboard/AllUser/`); await short.page.waitForSelector('nav[aria-label="Admin navigation"]'); await short.page.waitForTimeout(600);
const nav = short.page.locator('nav[aria-label="Admin navigation"]');
const scrolls = await nav.evaluate((n) => n.scrollHeight > n.clientHeight);
await short.page.locator('nav[aria-label="Admin navigation"] a', { hasText: "Settings" }).scrollIntoViewIfNeeded();
const sBox = await short.page.locator('nav[aria-label="Admin navigation"] a', { hasText: "Settings" }).boundingBox();
const footer = await short.page.getByRole("button", { name: "Log out" }).boundingBox();
check("short screen: the menu scrolls (no clipped items) and Settings stays above the account footer", scrolls && sBox.y + sBox.height <= footer.y + 2, JSON.stringify({ scrolls, sBox, footer }));
await short.page.screenshot({ path: `${OUT}/4-short-screen.png` });
await short.ctx.close();

// mobile: no sideways scrolling on the new pages
const mob = await mk({ width: 390, height: 800 });
for (const path of ["/Dashboard/", "/Dashboard/AllUser/", "/Dashboard/Ledger/"]) {
  await mob.page.goto(`${BASE}${path}`); await mob.page.waitForSelector('button[aria-label="Open menu"]'); await mob.page.waitForTimeout(1500);
  const over = await mob.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(`mobile ${path}: no horizontal page scroll`, over <= 1, `overflow ${over}px`);
}
await mob.page.goto(`${BASE}/Dashboard/`); await mob.page.waitForTimeout(2000);
await mob.page.screenshot({ path: `${OUT}/5-overview-mobile.png`, fullPage: true });
await mob.ctx.close();

check("no uncaught page errors in any of the above", errors.length === 0, errors.slice(0, 2).join(" | "));

await browser.close(); await cleanup();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);

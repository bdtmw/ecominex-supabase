// End-to-end NOWPayments: real Next handlers + real SQL + a fake NOWPayments provider (invoice API) and signed IPN calls.
//   npm run build && npm run test:e2e:np        (set PW_CHROMIUM=/path/to/chrome if needed)
import http from "node:http";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { SignJWT } from "jose";
import { chromium } from "playwright";
import { createDb } from "../sql/harness.mjs";
import { seedDemo } from "./seed.mjs";
import { startFakeSupabase } from "./fakeSupabase.mjs";

const SB = 54399, NP = 54400, WEB = 3191, BASE = `http://127.0.0.1:${WEB}`, SECRET = "e2e-secret", IPN_SECRET = "ipn-secret";
const results = [];
const check = (name, ok, detail = "") => { results.push({ ok: !!ok, name, detail }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `   [${detail}]`}`); };

const db = await createDb({ parsers: { 1700: (v) => parseFloat(v), 20: (v) => Number(v) } });
const { adminId, users } = await seedDemo(db);
const user = users[0], other = users[1];
const sb = await startFakeSupabase(db, SB);
const jwt = (id) => new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject(id).setExpirationTime("1d").sign(new TextEncoder().encode(SECRET));
const [adminTok, userTok, otherTok] = await Promise.all([jwt(adminId), jwt(user.id), jwt(other.id)]);

// ---- fake NOWPayments: behaviour switchable per test
let npMode = "ok", npCalls = [];
const np = http.createServer(async (req, res) => {
  const chunks = []; for await (const c of req) chunks.push(c);
  const body = JSON.parse(Buffer.concat(chunks).toString() || "{}");
  npCalls.push({ url: req.url, key: req.headers["x-api-key"], body });
  if (npMode === "500") { res.writeHead(500, { "content-type": "application/json" }); return res.end(JSON.stringify({ message: "boom" })); }
  if (npMode === "hang") return;
  if (npMode === "badurl") { res.writeHead(200, { "content-type": "application/json" }); return res.end(JSON.stringify({ id: "9", invoice_url: "javascript:alert(1)" })); }
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify({ id: "inv-" + body.order_id.slice(0, 6), invoice_url: `http://127.0.0.1:${NP}/pay/${body.order_id}`, order_id: body.order_id }));
}).listen(NP, "127.0.0.1");

const web = spawn("npx", ["next", "start", "-p", String(WEB)], {
  env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${SB}`, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "x", SUPABASE_SECRET_KEY: "x", APP_JWT_SECRET: SECRET, APP_URL: BASE,
    NOWPAYMENTS_API_KEY: "np-key", NOWPAYMENTS_IPN_SECRET: IPN_SECRET, NOWPAYMENTS_BASE_URL: `http://127.0.0.1:${NP}` },
  stdio: ["ignore", "pipe", "pipe"],
});
let webLog = ""; web.stdout.on("data", (d) => (webLog += d)); web.stderr.on("data", (d) => (webLog += d));
process.on("exit", () => web.kill("SIGTERM"));
for (let i = 0; i < 60; i++) { try { if ((await fetch(`${BASE}/terms/`)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 500)); if (i === 59) { console.error("Next did not start:\n" + webLog); process.exit(2); } }

const sortObject = (o) => o === null || typeof o !== "object" ? o : Array.isArray(o) ? o.map(sortObject) : Object.keys(o).sort().reduce((a, k) => ((a[k] = sortObject(o[k])), a), {});
const sign = (body, secret = IPN_SECRET) => crypto.createHmac("sha512", secret).update(JSON.stringify(sortObject(body))).digest("hex");
const api = async (path, { token, method = "GET", body, headers = {} } = {}) => {
  const r = await fetch(`${BASE}/api/v1/${path}`, { method, headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers }, body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body) });
  return { status: r.status, json: await r.json().catch(() => ({})) };
};
const create = (amount = 100, extra = {}, token = userTok) => api("deposit/nowpayments", { token, method: "POST", body: { amount, ...extra } });
const ipn = (b, sig) => api("nowpayments/ipn", { method: "POST", body: b, headers: sig === null ? {} : { "x-nowpayments-sig": sig ?? sign(b) } });
const balanceOf = async (id) => Number((await db.query(`select coalesce(admin_add,0)+coalesce(mining_balance,0) as b from public.balances where user_id=$1`, [id])).rows[0]?.b ?? 0);
const credits = async (depId) => Number((await db.query(`select count(*) c from public.transactions where metadata->>'depositId'=$1 and type='ADMIN_ADD'`, [depId])).rows[0].c);
const evt = (dep, status, extra = {}) => ({ payment_id: 5550001, invoice_id: "inv", order_id: dep, payment_status: status, price_amount: 100, price_currency: "usd", pay_currency: "usdttrc20", actually_paid: status === "waiting" ? 0 : 100, ...extra });

// ---------- creating invoices
check("create requires login", (await create(100, {}, null)).status === 401);
let r = await create(100);
check("invoice created, returns provider URL", r.status === 201 && /\/pay\//.test(r.json.data.invoiceUrl), JSON.stringify(r.json));
const dep = r.json.data.depositId;
const call = npCalls.at(-1);
check("provider got api key, order id, callback and return URLs", call.key === "np-key" && call.body.order_id === dep && call.body.ipn_callback_url === `${BASE}/api/v1/nowpayments/ipn` && call.body.success_url === `${BASE}/deposit/success?depositId=${dep}` && call.body.cancel_url.includes("/deposit/cancel"), JSON.stringify(call));
check("deposit stored as waiting, nothing credited", (await db.query(`select payment_status s from public.deposits where id=$1`, [dep])).rows[0].s === "waiting" && (await credits(dep)) === 0);

check("below minimum rejected", (await create(5)).status === 400);
check("above maximum rejected", (await create(1e7)).status === 400);
check("string amount rejected", (await create("100")).status === 400);
check("unsupported currency rejected", (await create(100, { payCurrency: "doge" })).status === 400);
const before = npCalls.length;
check("rejected requests never reach the provider", npCalls.length === before);

npMode = "500"; r = await create(100);
check("provider error -> 502 and deposit marked failed", r.status === 502 && (await db.query(`select payment_status s from public.deposits where payment_status='failed'`)).rows.length === 1, JSON.stringify(r));
npMode = "badurl"; r = await create(100);
check("invalid invoice URL from provider refused (502)", r.status === 502, JSON.stringify(r));
npMode = "ok";

// ---------- status endpoint
r = await api(`deposit/status/${dep}`, { token: userTok });
check("owner sees status waiting + payment link", r.status === 200 && r.json.status === "waiting" && !r.json.credited && !!r.json.invoiceUrl, JSON.stringify(r));
check("another user gets 404", (await api(`deposit/status/${dep}`, { token: otherTok })).status === 404);
check("admin can read any deposit", (await api(`deposit/status/${dep}`, { token: adminTok })).status === 200);
check("anonymous gets 401", (await api(`deposit/status/${dep}`)).status === 401);

// ---------- IPN security
const bal0 = await balanceOf(user.id);
check("missing signature -> 401", (await ipn(evt(dep, "finished"), null)).status === 401);
check("wrong secret -> 401", (await ipn(evt(dep, "finished"), sign(evt(dep, "finished"), "nope"))).status === 401);
const tampered = evt(dep, "finished"); const goodSig = sign(tampered); tampered.price_amount = 1;
check("tampered body -> 401", (await ipn(tampered, goodSig)).status === 401);
check("none of these credited", (await balanceOf(user.id)) === bal0 && (await credits(dep)) === 0);
check("unknown order id with valid signature -> 404", (await ipn(evt(crypto.randomUUID(), "finished"))).status === 404);

// ---------- payment lifecycle
check("waiting accepted", (await ipn(evt(dep, "waiting"))).status === 200);
check("confirming accepted", (await ipn(evt(dep, "confirming"))).status === 200);
check("still not credited while confirming", (await balanceOf(user.id)) === bal0);
check("finished credits once", (await ipn(evt(dep, "finished"))).status === 200 && (await balanceOf(user.id)) === bal0 + 100 && (await credits(dep)) === 1);
for (let i = 0; i < 3; i++) await ipn(evt(dep, "finished"));
await ipn(evt(dep, "confirming"));                   // late, out-of-order delivery
check("replays and late events never credit again", (await balanceOf(user.id)) === bal0 + 100 && (await credits(dep)) === 1);
r = await api(`deposit/status/${dep}`, { token: userTok });
check("status endpoint now says credited", r.json.credited === true && r.json.status === "finished", JSON.stringify(r.json));
check("credit is in the ledger", Number((await db.query(`select count(*) c from public.v_ledger where user_id=$1 and category='deposit' and signed_amount=100 and direction='credit'`, [user.id])).rows[0].c) >= 1);

// partial payment -> flagged, no credit
r = await create(200); const dep2 = r.json.data.depositId; const bal1 = await balanceOf(user.id);
await ipn(evt(dep2, "partially_paid", { price_amount: 200, actually_paid: 120, payment_id: 5550002 }));
r = await api(`deposit/status/${dep2}`, { token: userTok });
check("partial payment flagged for review, not credited", r.json.needsReview === true && !r.json.credited && (await balanceOf(user.id)) === bal1, JSON.stringify(r.json));
// price mismatch on "finished" -> review, not credited
r = await create(300); const dep3 = r.json.data.depositId;
await ipn(evt(dep3, "finished", { price_amount: 150, payment_id: 5550003 }));
check("amount mismatch on finished is held for review", (await balanceOf(user.id)) === bal1 && (await api(`deposit/status/${dep3}`, { token: userTok })).json.needsReview === true);
// expired / failed never credit
r = await create(50); const dep4 = r.json.data.depositId;
await ipn(evt(dep4, "expired", { price_amount: 50, payment_id: 5550004 })); await ipn(evt(dep4, "failed", { price_amount: 50, payment_id: 5550004 }));
check("expired/failed never credit", (await balanceOf(user.id)) === bal1 && (await credits(dep4)) === 0);

// ---------- admin API
r = await api("admin/deposits?review=1", { token: adminTok });
check("admin list: review tab shows the 2 flagged deposits", r.status === 200 && r.json.total === 2 && r.json.counts.review === 2, JSON.stringify(r.json.counts));
check("non-admin cannot list", (await api("admin/deposits", { token: userTok })).status === 403);
r = await api("admin/analytics?range=30d", { token: adminTok });
check("overview reports deposits needing review", r.json.attention?.depositsNeedingReview === 2, JSON.stringify(r.json.attention));

// ---------- browser: return pages, wallet, admin page
const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const seen = (loc) => loc.first().waitFor({ state: "visible", timeout: 15000 }).then(() => true, () => false);
const mk = async (token) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript((t) => { localStorage.setItem("token", t); localStorage.setItem("IsAuthenticate", "true"); }, token);
  await ctx.route(/googletagmanager|lovable\.app/, (x) => x.abort());
  const page = await ctx.newPage(); const errs = []; page.on("pageerror", (e) => errs.push(String(e)));
  return { page, errs };
};
{
  const { page, errs } = await mk(userTok);
  await page.goto(`${BASE}/deposit/success/?depositId=${dep}`);
  check("success page: credited confirmation", await seen(page.getByText(/credited/i)));
  await page.goto(`${BASE}/deposit/success/?depositId=${dep2}`);
  check("success page: partial payment tells user to contact support", await seen(page.getByText(/support/i)));
  r = await create(75); const dep5 = r.json.data.depositId;
  await page.goto(`${BASE}/deposit/success/?depositId=${dep5}`);
  check("success page: still waiting offers the payment link", await seen(page.locator(`a[href*="/pay/${dep5}"]`)));
  await page.goto(`${BASE}/deposit/cancel/?depositId=${dep5}`);
  check("cancel page: can resume payment", await seen(page.locator(`a[href*="/pay/${dep5}"]`)));
  await page.goto(`${BASE}/deposit/success/?depositId=${crypto.randomUUID()}`);
  check("success page: unknown deposit says not found", await seen(page.getByText(/couldn.t find that deposit/i)));
  check("no uncaught page errors (user)", errs.length === 0, errs.join(" | "));
}
{
  const { page, errs } = await mk(adminTok);
  await page.goto(`${BASE}/Dashboard/Deposits/?tab=review`);
  await page.getByText("Needs review").first().waitFor({ timeout: 20000 });
  await page.waitForSelector("tbody tr", { timeout: 15000 });
  const rowsTxt = (await page.locator("tbody").innerText());
  check("admin Deposits page lists flagged deposits with reasons", (await page.locator("tbody tr").count()) === 2 && /\$200\.00/.test(rowsTxt) && /\$300\.00/.test(rowsTxt), rowsTxt);
  await page.goto(`${BASE}/Dashboard/Deposits/`);
  await page.waitForSelector("tbody tr button", { timeout: 15000 });
  const listed = (where, p = []) => db.query(`select ((select count(*) from public.deposits d where ${where.replace(/\bX\b/g, 'd.user_id')}) + (select count(*) from public.transactions t where t.type = 'ADMIN_ADD' and not (t.metadata ? 'depositId') and ${where.replace(/\bX\b/g, 't.user_id')}))::int c`, p).then((x) => x.rows[0].c);
  const total = await listed("true");
  check("admin Deposits: footer shows 'Showing 1–N of N' and a page-size picker", await seen(page.getByText(new RegExp(`Showing 1–${Math.min(50, total)} of ${total} deposits`))) && (await page.locator('select[aria-label="Per page"]').count()) === 1, String(total));
  await page.locator("tbody tr button").first().click();
  await page.waitForURL(/user=/);
  const uid = new URL(page.url()).searchParams.get("user");
  const mine = await listed("X = $1", [uid]);
  await page.getByText(/^Only /).waitFor({ timeout: 10000 });
  await page.waitForFunction((n) => document.querySelectorAll("tbody tr").length === n, mine, { timeout: 10000 }).catch(() => {});
  check("admin Deposits: clicking a user shows only that user's deposits with a removable chip", (await page.locator("tbody tr").count()) === mine && (await page.getByRole("button", { name: "Show all users" }).count()) === 1, `${mine}`);
  await page.getByRole("button", { name: "Show all users" }).click();
  await page.waitForFunction((n) => document.querySelectorAll("tbody tr").length === Math.min(50, n), total, { timeout: 10000 }).catch(() => {});
  // ---- admin adds balance through the dialog
  await page.goto(`${BASE}/Dashboard/Deposits/`);
  const target = users[5];
  const balBefore = await balanceOf(target.id);
  await page.getByRole("button", { name: "Add balance" }).first().click();
  await page.getByPlaceholder("Search name or email…").fill(target.email.slice(0, 12));
  await page.getByRole("button", { name: new RegExp(target.email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) }).first().click();
  await page.locator("#ab-amount").fill("75.25");
  await page.locator("#ab-note").fill("E2E test credit");
  await page.getByRole("button", { name: "Review" }).click();
  check("add balance: asks for confirmation showing old and new balance", await seen(page.getByText(/Their balance will go from/)));
  await page.getByRole("button", { name: "Confirm and add" }).click();
  await page.waitForFunction(() => !document.body.innerText.includes("Confirm and add"), null, { timeout: 10000 }).catch(() => {});
  check("add balance: balance went up by exactly the amount and the ledger entry carries the note", Math.abs((await balanceOf(target.id)) - (balBefore + 75.25)) < 0.001 && Number((await db.query(`select count(*) c from public.transactions where user_id=$1 and type='ADMIN_ADD' and details like '%E2E test credit%' and balance_after = $2`, [target.id, balBefore + 75.25])).rows[0].c) === 1);
  await page.goto(`${BASE}/Dashboard/Deposits/?tab=admin`);
  check("add balance: the credit shows under Deposits → Admin credits", await seen(page.getByText("E2E test credit")));
  await page.goto(`${BASE}/Dashboard/`);
  check("Overview shows the deposits-needing-review card", await seen(page.getByText(/2 deposits need review/)));
  check("no uncaught page errors (admin)", errs.length === 0, errs.join(" | "));
}
await browser.close(); web.kill("SIGTERM"); sb.close(); np.close();
const failed = results.filter((x) => !x.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);

// Sends a signed NOWPayments IPN callback, to test a deposit without paying real crypto.
//   PowerShell:  $env:IPN_SECRET="..."; node scripts/simulate-nowpayments-ipn.mjs <depositId> <status> <amount> [baseUrl]
//   bash:        IPN_SECRET=... node scripts/simulate-nowpayments-ipn.mjs <depositId> <status> <amount> [baseUrl]
// status: waiting | confirming | finished | partially_paid | failed | expired.  amount must equal the invoiced amount.
import crypto from "node:crypto";

const [, , depositId, status = "finished", amount = "20", baseUrl = "https://ecominex-supabase.vercel.app"] = process.argv;
const secret = process.env.IPN_SECRET;
if (!depositId || !secret) { console.error("Usage: set IPN_SECRET, then: node scripts/simulate-nowpayments-ipn.mjs <depositId> <status> <amount> [baseUrl]"); process.exit(1); }

const sort = (o) => (o && typeof o === "object" ? (Array.isArray(o) ? o.map(sort) : Object.keys(o).sort().reduce((a, k) => ((a[k] = sort(o[k])), a), {})) : o);
const body = {
  payment_id: 123456, invoice_id: "test", order_id: depositId, payment_status: status,
  price_amount: Number(amount), price_currency: "usd", pay_currency: "usdttrc20", actually_paid: status === "waiting" ? 0 : Number(amount),
};
const sig = crypto.createHmac("sha512", secret).update(JSON.stringify(sort(body))).digest("hex");
const r = await fetch(`${baseUrl.replace(/\/$/, "")}/api/v1/nowpayments/ipn`, {
  method: "POST", headers: { "content-type": "application/json", "x-nowpayments-sig": sig }, body: JSON.stringify(body),
});
console.log(r.status, await r.text());

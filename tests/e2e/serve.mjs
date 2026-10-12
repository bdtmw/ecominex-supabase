// Dev helper: seeds demo data and serves the built app against the fake Supabase so you can click around.
//   npm run build && node --experimental-strip-types --no-warnings tests/e2e/serve.mjs
// then open http://127.0.0.1:3190/  and run in the browser console:  localStorage.token = "<printed token>"; localStorage.IsAuthenticate = "true"
import { spawn } from "node:child_process";
import { SignJWT } from "jose";
import { createDb } from "../sql/harness.mjs";
import { seedDemo } from "./seed.mjs";
import { startFakeSupabase } from "./fakeSupabase.mjs";

const SB = 54399, WEB = Number(process.env.PORT || 3190), SECRET = "e2e-secret";
const db = await createDb({ parsers: { 1700: (v) => parseFloat(v), 20: (v) => Number(v) } });
const { adminId } = await seedDemo(db);
await startFakeSupabase(db, SB);
const token = await new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject(adminId).setExpirationTime("1d").sign(new TextEncoder().encode(SECRET));
spawn("npx", ["next", "start", "-p", String(WEB)], { stdio: "inherit", env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${SB}`, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "x", SUPABASE_SECRET_KEY: "x", APP_JWT_SECRET: SECRET, APP_URL: `http://127.0.0.1:${WEB}` } });
console.log(`\nAdmin token (paste into localStorage.token):\n${token}\n`);

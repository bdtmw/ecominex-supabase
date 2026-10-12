# Ecominex — Next.js + Supabase

Full-stack port of the original *Express + MongoDB* backend and *Next.js* frontend into **one Next.js app on Supabase**
(Postgres, Auth, Storage, Row Level Security). The UI and the URL contract of the API (`/api/v1/*`) are unchanged, so the
existing screens work as before — the data layer underneath is new.

```
Browser ──► Next.js pages (src/app)
        └─► Next.js API routes /api/v1/*  (src/server/handlers)  ──► Supabase Postgres (service role)
                                                                  ├─► Supabase Auth (credentials)
                                                                  └─► Supabase Storage (images)
```

## Setup

1. **Create a Supabase project**, then in the SQL editor paste and run **`supabase/setup.sql`** once. It is the three
   migrations plus the seed in the right order. (Running `seed.sql` alone fails with *relation "mining_machines" does not
   exist* because the tables come from the migrations.) Or use `supabase db push` with the Supabase CLI.
2. **Auth settings** (Authentication → Providers → Email): keep *Confirm email* **on**; you can turn off Supabase's own emails —
   this app sends its own OTP and reset emails (see *Email* below).
3. `cp .env.example .env.local` and fill it in (Supabase URL/keys, `APP_URL`, `APP_JWT_SECRET`, `CRON_SECRET`, email).
4. `npm ci && npm run dev`.
5. **First admin:** sign up in the app, verify the email, then in the SQL editor:
   `update public.profiles set role = 'admin' where email = 'you@example.com';`

### Deploy (Vercel)
Set the same environment variables in the project settings and deploy. `vercel.json` schedules the daily profit job;
Vercel Cron automatically sends `Authorization: Bearer $CRON_SECRET`. (cron-job.org also works: send header `x-cron-secret`.)

## What changed from the old stack
| Old | New |
|---|---|
| Express routes + controllers | Next.js route handlers (`src/app/api/v1/**/route.ts` → `src/server/handlers/*`) |
| MongoDB + Mongoose transactions | Postgres; every money operation is a single SQL function (`supabase/migrations/0002_functions.sql`) with row locks |
| bcrypt + own JWT | Supabase Auth stores/verifies passwords; the API issues 1-day session tokens (`APP_JWT_SECRET`) |
| Cloudinary | Supabase Storage (`machine-images` public, `deposit-proofs` private) |
| `User.mainBalance` + `Balance` (two systems) | One `balances` table (`admin_add` = deposited funds, `mining_balance` = profits) |
| node-cron + cron-job.org | Vercel Cron (or any caller) → `/api/v1/cron/profit-update` |

Removed because the UI never used them: the legacy `/withdrawals/create`, `/withdrawals/show`, `/withdrawal/:id` flow.

## Security model
* The browser never talks to Postgres. All reads/writes go through the API, which authorises each request, then uses the
  **service role** key (server-only). RLS is still enabled everywhere as defence in depth: clients using the anon key can
  only read the public machine catalogue; authenticated clients can only read their own rows; nobody can write.
* Money functions are `SECURITY DEFINER`, executable **only** by `service_role`, and enforce: no negative balances (CHECK),
  purchases paid from deposited funds only, pending withdrawals reserved, withdrawals processable once, deposit callbacks
  credited once, share cap enforced under a row lock.
* Codes and reset tokens are stored hashed; OTPs are limited to 5 attempts; responses never reveal whether an email exists.
* Machine/deposit uploads are validated (image types, 5 MB).

## Tests
```bash
npm test          # 27 SQL tests on an in-memory Postgres (PGlite): money logic + RLS. No Supabase account needed.
npm run typecheck
```

## Migrating existing MongoDB data
```bash
npm i --no-save mongodb
MONGO_URI=... NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run migrate:mongo            # dry run
MONGO_URI=... NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run migrate:mongo -- --commit
```
Users are created with a random password (bcrypt hashes can't be imported) — they sign in via **Forgot password**.
Balances, machines, assignments, shares, transactions, deposits and contacts are copied; ids are deterministic so re-running is safe.

## Email
`MAIL_EMAIL`/`MAIL_PASSWORD` (Gmail app password) or any SMTP server (`SMTP_*`). Used for signup OTP, 2FA login codes,
password reset, machine assignment and withdrawal notifications.

## Known limitations
* API handlers are verified by build + typecheck and by the SQL tests, but have **not** been exercised against a live
  Supabase project in CI — run through signup, login, deposit, purchase and withdrawal once on a staging project.
* Login tokens still live in `localStorage` (as before). A same-origin cookie session is now possible and recommended as a follow-up.
* In-memory rate limiting is per server instance; use an external store (e.g. Upstash) for strict limits.

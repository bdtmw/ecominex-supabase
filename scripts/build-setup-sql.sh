#!/bin/sh
# Rebuilds supabase/setup.sql from the migrations and seed (run after changing any of them).
cd "$(dirname "$0")/.." || exit 1
{ echo "-- One-shot setup: paste this whole file into the Supabase SQL editor and run it ONCE on a new project."
  echo "-- (It is 0001 + 0002 + 0003 + seed.sql concatenated; regenerate with scripts/build-setup-sql.sh)"
  for f in supabase/migrations/0001_schema.sql supabase/migrations/0002_functions.sql supabase/migrations/0003_rls.sql supabase/migrations/0004_analytics_and_ledger.sql supabase/migrations/0005_nowpayments_hardening.sql supabase/seed.sql; do
    echo; echo "-- ======== $f ========"; cat "$f"; done; } > supabase/setup.sql

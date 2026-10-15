#!/bin/sh
# Rebuilds supabase/setup.sql from the migrations and seed (run after changing any of them).
cd "$(dirname "$0")/.." || exit 1
{ echo "-- One-shot setup: paste this whole file into the Supabase SQL editor and run it ONCE on a new project."
  echo "-- (It is 0001 + 0002 + 0003 + seed.sql concatenated; regenerate with scripts/build-setup-sql.sh)"
  for f in supabase/migrations/0001_schema.sql supabase/migrations/0002_functions.sql supabase/migrations/0003_rls.sql supabase/migrations/0004_analytics_and_ledger.sql supabase/migrations/0005_nowpayments_hardening.sql supabase/migrations/0006_backfill_balances.sql supabase/migrations/0007_ledger_running_balance.sql supabase/migrations/0008_user_ledger.sql supabase/migrations/0009_rebuild_balances.sql supabase/migrations/0010_deposits_by_user.sql supabase/migrations/0011_deposits_include_admin_credits.sql supabase/migrations/0012_add_balance_note.sql supabase/migrations/0013_reconcile_unrecorded_balances.sql supabase/migrations/0014_balance_correction_entries.sql supabase/migrations/0015_fix_balances.sql supabase/migrations/0016_reversal_and_correction_date.sql supabase/migrations/0017_void_unfunded_purchases.sql supabase/seed.sql; do
    echo; echo "-- ======== $f ========"; cat "$f"; done; } > supabase/setup.sql

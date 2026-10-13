-- Fills in "balance before / after" for every transaction that has none (migrated history, older rows).
--
-- Method: walk each user's money-moving entries in the order the money moved (v_ledger.effective_at) and anchor the
-- chain to the user's CURRENT balance, so the newest entry always ends exactly at today's balance and every earlier
-- entry is today's balance minus everything that happened after it. Pending/rejected entries move no money, so they
-- carry the running balance unchanged. Rows that already have a balance are never touched.
-- Idempotent: run it again any time (e.g. after a data import); it only fills what is still empty.
create or replace function public.fn_backfill_transaction_balances()
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  with chain as (
    select l.id, l.user_id, l.signed_amount,
           sum(l.signed_amount) over (partition by l.user_id order by l.effective_at, l.id) as cum,
           sum(l.signed_amount) over (partition by l.user_id) as tot
      from public.v_ledger l
  ), calc as (
    select c.id, c.signed_amount,
           coalesce(b.total_balance, 0) - c.tot + c.cum as after_bal
      from chain c
      left join public.balances b on b.user_id = c.user_id
  )
  update public.transactions t
     set balance_after  = calc.after_bal,
         balance_before = coalesce(t.balance_before, calc.after_bal - calc.signed_amount)
    from calc
   where t.id = calc.id and t.balance_after is null;
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function public.fn_backfill_transaction_balances() from public, anon, authenticated;
grant execute on function public.fn_backfill_transaction_balances() to service_role;

select public.fn_backfill_transaction_balances();

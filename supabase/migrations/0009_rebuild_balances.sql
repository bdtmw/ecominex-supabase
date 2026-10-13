-- Rebuilds "balance before / after" on EVERY transaction so each user's history is one consistent chain that ends
-- exactly at their current balance. Unlike fn_backfill_transaction_balances (which only fills empty values), this
-- overwrites stale or inconsistent ones too. It never touches public.balances, i.e. nobody's actual money changes.
--
-- Method: order each user's entries as they appear in the ledger (transaction_date, id); only approved/completed
-- entries move money (pending = hold, rejected = no effect, so they carry the running balance unchanged);
-- balance_after(entry) = current balance - (net effect of everything after it); balance_before = after - effect.
-- Idempotent. Returns how many rows it touched.
create or replace function public.fn_rebuild_transaction_balances()
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  with chain as (
    select l.id, l.user_id, l.signed_amount,
           sum(l.signed_amount) over (partition by l.user_id order by l.transaction_date, l.id) as cum,
           sum(l.signed_amount) over (partition by l.user_id) as tot
      from public.v_ledger l
  ), calc as (
    select c.id, c.signed_amount, coalesce(b.total_balance, 0) - c.tot + c.cum as after_bal
      from chain c left join public.balances b on b.user_id = c.user_id
  )
  update public.transactions t
     set balance_after = calc.after_bal, balance_before = calc.after_bal - calc.signed_amount
    from calc
   where t.id = calc.id
     and (t.balance_after is distinct from calc.after_bal or t.balance_before is distinct from calc.after_bal - calc.signed_amount);
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function public.fn_rebuild_transaction_balances() from public, anon, authenticated;
grant execute on function public.fn_rebuild_transaction_balances() to service_role;

select public.fn_rebuild_transaction_balances() as rows_fixed;

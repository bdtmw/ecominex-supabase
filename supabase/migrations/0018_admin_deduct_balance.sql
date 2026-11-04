-- "Admin deduction": a visible ledger debit for money an admin removes from a user's balance (for example zeroing a test
-- account). It is NOT a withdrawal (nothing was paid out) and NOT counted in the dashboard's deposits/withdrawals/cash-flow.
--   select public.fn_admin_deduct_balance('<admin uuid>', '<user uuid>', null, 'why');      -- null amount = the whole balance
--   select public.fn_admin_deduct_balance('<admin uuid>', '<user uuid>', 250, 'why');       -- or a specific amount
-- Money is taken from the mining/profit balance first (the same order withdrawals use), then from deposited funds.
-- A pending withdrawal is a hold: you can only deduct what is not on hold, so approve or reject it first.
alter table public.transactions drop constraint if exists transactions_type_check;
alter table public.transactions add constraint transactions_type_check check (type in (
  'withdrawal', 'profit', 'MACHINE_PURCHASE', 'MACHINE_SALE',
  'SHARE_PURCHASE', 'SHARE_PROFIT', 'SHARE_SALE', 'ADMIN_ADD', 'REFERRAL_BONUS', 'ADJUSTMENT', 'ADMIN_DEDUCT'));

create or replace view public.v_ledger as
select
  t.id, t.user_id, t.type, t.status, t.amount, t.transaction_date, t.processed_at,
  t.balance_before, t.balance_after, t.wallet_address, t.network, t.admin_comment, t.metadata,
  case when t.type = 'SHARE_PROFIT' and t.details ilike '[REVERSAL]%' then 'debit'
       when t.type in ('ADMIN_ADD', 'profit', 'SHARE_PROFIT', 'MACHINE_SALE', 'SHARE_SALE', 'REFERRAL_BONUS', 'ADJUSTMENT') then 'credit'
       else 'debit' end as direction,
  case when t.status in ('approved', 'completed') then
         case when t.type = 'SHARE_PROFIT' and t.details ilike '[REVERSAL]%' then -t.amount
              when t.type in ('ADMIN_ADD', 'profit', 'SHARE_PROFIT', 'MACHINE_SALE', 'SHARE_SALE', 'REFERRAL_BONUS', 'ADJUSTMENT') then t.amount
              else -t.amount end
       else 0 end as signed_amount,
  case t.type
    when 'ADMIN_ADD' then 'deposit' when 'withdrawal' then 'withdrawal'
    when 'MACHINE_PURCHASE' then 'purchase' when 'SHARE_PURCHASE' then 'purchase'
    when 'profit' then 'profit' when 'SHARE_PROFIT' then 'profit'
    when 'MACHINE_SALE' then 'sale' when 'SHARE_SALE' then 'sale'
    when 'ADJUSTMENT' then 'adjustment' when 'ADMIN_DEDUCT' then 'adjustment'
    else 'referral' end as category,
  case t.type
    when 'ADMIN_ADD' then 'Deposit credited' when 'withdrawal' then 'Withdrawal'
    when 'MACHINE_PURCHASE' then 'Machine purchase' when 'SHARE_PURCHASE' then 'Share purchase'
    when 'profit' then 'Mining profit' when 'SHARE_PROFIT' then (case when t.details ilike '[REVERSAL]%' then 'Profit reversal' else 'Share profit' end)
    when 'MACHINE_SALE' then 'Machine sale' when 'SHARE_SALE' then 'Share sale'
    when 'ADJUSTMENT' then 'Balance correction' when 'ADMIN_DEDUCT' then 'Admin deduction'
    else 'Referral bonus' end as type_label,
  coalesce(
    nullif(t.details, ''),
    case t.type
      when 'MACHINE_PURCHASE' then format('%s × %s', t.metadata->>'quantity', t.metadata->>'machineName')
      when 'MACHINE_SALE' then format('Sold %s', t.metadata->>'machineName')
      else null end,
    '') as description,
  case when t.type = 'withdrawal' and t.status = 'approved' then coalesce(t.processed_at, t.transaction_date)
       else t.transaction_date end as effective_at
from public.transactions t;

revoke all on public.v_ledger from public, anon, authenticated;
grant select on public.v_ledger to service_role;

create or replace function public.fn_admin_deduct_balance(p_admin uuid, p_user uuid, p_amount numeric default null, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare b public.balances; held numeric; amt numeric; from_mining numeric; from_admin numeric; tx public.transactions;
begin
  if not public._is_admin_user(p_admin) then raise exception 'Only admins can do this!' using errcode = '42501'; end if;
  if not exists (select 1 from public.profiles where id = p_user) then raise exception 'User not found' using errcode = 'P0002'; end if;
  perform 1 from public.balances where user_id = p_user for update;
  b := public._ensure_balance(p_user);
  select coalesce(sum(amount), 0) into held from public.transactions where user_id = p_user and type = 'withdrawal' and status = 'pending';
  amt := coalesce(p_amount, b.total_balance);
  if amt is null or amt <= 0 then raise exception 'Nothing to deduct (balance is %)', b.total_balance using errcode = 'P0001'; end if;
  if amt > b.total_balance - held + 0.00005 then
    raise exception 'Cannot deduct % : balance is % and % is held by pending withdrawals', amt, b.total_balance, held using errcode = 'P0001';
  end if;
  from_mining := least(b.mining_balance, amt);
  from_admin := amt - from_mining;
  update public.balances set mining_balance = mining_balance - from_mining, admin_add = admin_add - from_admin, last_updated = now()
   where user_id = p_user;
  insert into public.transactions (user_id, amount, type, status, details, admin_comment, processed_by, processed_at, balance_before, balance_after, metadata)
  values (p_user, amt, 'ADMIN_DEDUCT', 'completed', coalesce(nullif(trim(p_note), ''), 'Balance removed by admin'),
          nullif(trim(p_note), ''), p_admin, now(), b.total_balance, b.total_balance - amt,
          jsonb_build_object('fromMining', from_mining, 'fromDeposited', from_admin))
  returning * into tx;
  return to_jsonb(tx);
end $$;
revoke all on function public.fn_admin_deduct_balance(uuid, uuid, numeric, text) from public, anon, authenticated;
grant execute on function public.fn_admin_deduct_balance(uuid, uuid, numeric, text) to service_role;

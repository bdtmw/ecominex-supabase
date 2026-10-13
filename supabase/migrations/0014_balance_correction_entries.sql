-- A "Balance correction" ledger entry: a credit that explains money the old system put in an account without recording it
-- (for example the balance Ahmad-type users carried over from the old backend, where deposits/profits and share purchases
-- did not add up). It is a visible, dated, labelled entry, not a hidden number, and it is NOT counted as a deposit,
-- profit or withdrawal in the dashboard figures (those only count their own transaction types).
alter table public.transactions drop constraint if exists transactions_type_check;
alter table public.transactions add constraint transactions_type_check check (type in (
  'withdrawal', 'profit', 'MACHINE_PURCHASE', 'MACHINE_SALE',
  'SHARE_PURCHASE', 'SHARE_PROFIT', 'SHARE_SALE', 'ADMIN_ADD', 'REFERRAL_BONUS', 'ADJUSTMENT'));

create or replace view public.v_ledger as
select
  t.id, t.user_id, t.type, t.status, t.amount, t.transaction_date, t.processed_at,
  t.balance_before, t.balance_after, t.wallet_address, t.network, t.admin_comment, t.metadata,
  case when t.type in ('ADMIN_ADD', 'profit', 'SHARE_PROFIT', 'MACHINE_SALE', 'SHARE_SALE', 'REFERRAL_BONUS', 'ADJUSTMENT') then 'credit'
       else 'debit' end as direction,
  case when t.status in ('approved', 'completed') then
         case when t.type in ('ADMIN_ADD', 'profit', 'SHARE_PROFIT', 'MACHINE_SALE', 'SHARE_SALE', 'REFERRAL_BONUS', 'ADJUSTMENT') then t.amount
              else -t.amount end
       else 0 end as signed_amount,
  case t.type
    when 'ADMIN_ADD' then 'deposit' when 'withdrawal' then 'withdrawal'
    when 'MACHINE_PURCHASE' then 'purchase' when 'SHARE_PURCHASE' then 'purchase'
    when 'profit' then 'profit' when 'SHARE_PROFIT' then 'profit'
    when 'MACHINE_SALE' then 'sale' when 'SHARE_SALE' then 'sale'
    when 'ADJUSTMENT' then 'adjustment'
    else 'referral' end as category,
  case t.type
    when 'ADMIN_ADD' then 'Deposit credited' when 'withdrawal' then 'Withdrawal'
    when 'MACHINE_PURCHASE' then 'Machine purchase' when 'SHARE_PURCHASE' then 'Share purchase'
    when 'profit' then 'Mining profit' when 'SHARE_PROFIT' then 'Share profit'
    when 'MACHINE_SALE' then 'Machine sale' when 'SHARE_SALE' then 'Share sale'
    when 'ADJUSTMENT' then 'Balance correction'
    else 'Referral bonus' end as type_label,
  coalesce(
    nullif(t.details, ''),
    case t.type
      when 'MACHINE_PURCHASE' then format('%s × %s', t.metadata->>'quantity', t.metadata->>'machineName')
      when 'MACHINE_SALE' then format('Sold %s', t.metadata->>'machineName')
      else null end,
    '') as description,
  -- when the money actually moved: the payout time for an approved withdrawal, otherwise the event time
  case when t.type = 'withdrawal' and t.status = 'approved' then coalesce(t.processed_at, t.transaction_date)
       else t.transaction_date end as effective_at
from public.transactions t;

-- Records a correction for every user whose balance has no record behind it, instead of removing the money.
-- The entry is dated one second before the user's first ledger entry, so their history starts from zero, never goes
-- negative, and the records add up to the balance exactly. Earned-but-unrecorded referral bonuses are written first.
--   select * from public.fn_record_unexplained_balances(false);      -- preview
--   select * from public.fn_record_unexplained_balances(true);       -- apply
create or replace function public.fn_record_unexplained_balances(p_apply boolean default false, p_exclude uuid[] default '{}')
returns table (user_id uuid, email text, balance numeric, ledger_net numeric, referral_unrecorded numeric, correction numeric, action text)
language plpgsql security definer set search_path = public as $$
declare r record; first_at timestamptz;
begin
  create temp table _p on commit drop as
    select f.user_id as uid, f.email as mail, f.balance as bal, f.ledger_net as net, f.referral_unrecorded as ref, f.unexplained as diff, f.action as act
      from public.fn_reconcile_unrecorded_balances(false, p_exclude) f;

  if p_apply then
    -- referral bonuses that were earned but never recorded
    insert into public.transactions (user_id, amount, type, status, details, metadata, transaction_date, processed_at)
    select o.referrer, o.bonus, 'REFERRAL_BONUS', 'completed',
           format('Referral bonus (%s%%) on a purchase by %s (rebuilt from purchase history)', (o.rate * 100)::int,
                  (select trim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')) from public.profiles where id = o.buyer)),
           jsonb_build_object('referredUser', o.buyer, 'purchaseTransactionId', o.purchase_id, 'rate', o.rate, 'rebuilt', true),
           o.transaction_date, o.transaction_date
      from (
        with buy as (
          select t.id, t.user_id as buyer, t.amount, t.transaction_date,
                 row_number() over (partition by t.user_id order by t.transaction_date, t.id) as rn
            from public.transactions t where t.type = 'MACHINE_PURCHASE' and t.status = 'completed')
        select p.referred_by as referrer, b2.id as purchase_id, b2.buyer, b2.transaction_date,
               case when b2.rn = 1 then 0.10 else 0.02 end as rate,
               round(b2.amount * (case when b2.rn = 1 then 0.10 else 0.02 end), 2) as bonus
          from buy b2 join public.profiles p on p.id = b2.buyer
         where p.referred_by is not null
           and not exists (select 1 from public.transactions x where x.type = 'REFERRAL_BONUS' and x.user_id = p.referred_by
                            and x.metadata ->> 'purchaseTransactionId' = b2.id::text)
      ) o
      join _p on _p.uid = o.referrer
     where o.bonus > 0 and _p.act in ('reduce', 'ok');

    for r in select * from _p where act = 'reduce' and diff > 0.005 loop
      select min(t.transaction_date) into first_at from public.transactions t where t.user_id = r.uid;
      insert into public.transactions (user_id, amount, type, status, details, metadata, transaction_date, processed_at)
      values (r.uid, r.diff, 'ADJUSTMENT', 'completed',
              'Balance correction: money carried over from the old system that had no transaction record',
              jsonb_build_object('correction', true, 'reason', 'unrecorded balance from the old system'),
              coalesce(first_at, now()) - interval '1 second', coalesce(first_at, now()) - interval '1 second');
    end loop;

    perform public.fn_rebuild_transaction_balances();
  end if;

  return query
    select _p.uid, _p.mail, _p.bal::numeric, _p.net::numeric, _p.ref::numeric,
           case when _p.act = 'reduce' then _p.diff else 0 end::numeric,
           case when _p.act = 'reduce' then 'record a correction of ' || _p.diff else _p.act end
      from _p where _p.act <> 'ok' or _p.ref > 0
     order by _p.diff desc;
end $$;

revoke all on function public.fn_record_unexplained_balances(boolean, uuid[]) from public, anon, authenticated;
grant execute on function public.fn_record_unexplained_balances(boolean, uuid[]) to service_role;

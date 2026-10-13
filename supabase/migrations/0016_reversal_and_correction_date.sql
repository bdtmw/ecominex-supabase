-- Two fixes found while tracing Ahmad's balance against MongoDB:
--  1. The old backend wrote a profit REVERSAL as a SHARE_PROFIT entry with a positive amount and details starting
--     with "[REVERSAL]". It took money OUT of the account, so the ledger now treats it as a debit ("Profit reversal").
--  2. fn_fix_balances places a "Balance correction" just before the entry where the history would otherwise first go
--     below zero (for Ahmad: just before his 27 Sep share purchases, when the unrecorded money must already have been
--     there), instead of at the very start.

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
    when 'ADJUSTMENT' then 'adjustment'
    else 'referral' end as category,
  case t.type
    when 'ADMIN_ADD' then 'Deposit credited' when 'withdrawal' then 'Withdrawal'
    when 'MACHINE_PURCHASE' then 'Machine purchase' when 'SHARE_PURCHASE' then 'Share purchase'
    when 'profit' then 'Mining profit' when 'SHARE_PROFIT' then (case when t.details ilike '[REVERSAL]%' then 'Profit reversal' else 'Share profit' end)
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

-- One function that puts every user's balance and records in agreement.  Preview first, then apply:
--   select * from public.fn_fix_balances(false);
--   select * from public.fn_fix_balances(true);
--   select * from public.fn_fix_balances(true, array['<user uuid>']::uuid[]);     -- apply, leaving these users alone
--
-- For each user:  records = net of all ledger entries + referral bonuses earned but never recorded.
--   1. Balance ABOVE what the records support (and above zero): money the import created (the old backend let `adminAdd`
--      go negative and the import clamped it to 0). The balance is reduced to max(0, records), mining balance first.
--   2. Records still BELOW the (corrected) balance: money that entered the account in the old system without any
--      transaction. A dated, labelled "Balance correction" entry is written one second before the user's first entry,
--      so the history starts at zero, never goes minus, and adds up to the balance.
--   3. Earned-but-unrecorded referral bonuses are written to the ledger (10% of a referred user's first machine
--      purchase, 2% of later ones: the old backend's rule).
--   4. Balance BELOW the records: reported as 'review', never changed.
-- Every balance reduction is logged in public.balance_reconciliation_log; corrections are ordinary ledger entries.

create or replace function public._balance_plan()
returns table (uid uuid, mail text, bal numeric, adm numeric, mine numeric, net numeric, ref_unrec numeric)
language sql stable security definer set search_path = public as $$
  with buy as (
    select t.id, t.user_id as buyer, t.amount,
           row_number() over (partition by t.user_id order by t.transaction_date, t.id) as rn
      from public.transactions t where t.type = 'MACHINE_PURCHASE' and t.status = 'completed'
  ), owed as (
    select p.referred_by as referrer,
           round(b2.amount * (case when b2.rn = 1 then 0.10 else 0.02 end), 2) as bonus
      from buy b2 join public.profiles p on p.id = b2.buyer
     where p.referred_by is not null
       and not exists (select 1 from public.transactions x where x.type = 'REFERRAL_BONUS' and x.user_id = p.referred_by
                        and x.metadata ->> 'purchaseTransactionId' = b2.id::text)
  )
  select bl.user_id, p.email, bl.total_balance, bl.admin_add, bl.mining_balance,
         coalesce((select sum(l.signed_amount) from public.v_ledger l where l.user_id = bl.user_id), 0),
         coalesce((select sum(o.bonus) from owed o where o.referrer = bl.user_id), 0)
    from public.balances bl join public.profiles p on p.id = bl.user_id;
$$;
revoke all on function public._balance_plan() from public, anon, authenticated;
grant execute on function public._balance_plan() to service_role;

drop function if exists public.fn_fix_balances(boolean, uuid[]);
create or replace function public.fn_fix_balances(p_apply boolean default false, p_exclude uuid[] default '{}')
returns table (user_id uuid, email text, balance_before numeric, balance_after numeric, balance_reduced numeric,
               correction_added numeric, referral_added numeric, action text)
language plpgsql security definer set search_path = public as $$
declare r record; cut numeric; from_mining numeric; from_admin numeric; first_at timestamptz; out_rows jsonb := '[]'::jsonb;
        newbal numeric; corr numeric;
begin
  for r in select * from public._balance_plan() loop
    cut := 0; corr := 0; newbal := r.bal;
    if p_exclude is not null and r.uid = any (p_exclude) then
      out_rows := out_rows || jsonb_build_array(jsonb_build_object('u', r.uid, 'e', r.mail, 'b0', r.bal, 'b1', r.bal, 'cut', 0, 'corr', 0, 'ref', 0, 'a', 'skipped (excluded)'));
      continue;
    end if;
    if r.bal < r.net + r.ref_unrec - 0.005 then
      out_rows := out_rows || jsonb_build_array(jsonb_build_object('u', r.uid, 'e', r.mail, 'b0', r.bal, 'b1', r.bal, 'cut', 0, 'corr', 0, 'ref', 0, 'a', 'review (balance is lower than the records)'));
      continue;
    end if;
    -- 1. balance above what the records support
    if r.bal - greatest(0, r.net + r.ref_unrec) > 0.005 then cut := r.bal - greatest(0, r.net + r.ref_unrec); newbal := r.bal - cut; end if;
    -- 2. records still below the corrected balance
    if newbal - (r.net + r.ref_unrec) > 0.005 then corr := newbal - (r.net + r.ref_unrec); end if;
    if cut > 0 or corr > 0 or r.ref_unrec > 0 then
      out_rows := out_rows || jsonb_build_array(jsonb_build_object('u', r.uid, 'e', r.mail, 'b0', r.bal, 'b1', newbal, 'cut', cut, 'corr', corr, 'ref', r.ref_unrec,
        'a', case when cut > 0 and corr > 0 then 'reduce balance and add correction' when cut > 0 then 'reduce balance'
                  when corr > 0 then 'add correction' else 'record referral bonuses' end));
    end if;

    if p_apply and (cut > 0 or corr > 0 or r.ref_unrec > 0) then
      if r.ref_unrec > 0 then
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
             where p.referred_by = r.uid
               and not exists (select 1 from public.transactions x where x.type = 'REFERRAL_BONUS' and x.user_id = p.referred_by
                                and x.metadata ->> 'purchaseTransactionId' = b2.id::text)
          ) o where o.bonus > 0;
      end if;

      if cut > 0 then
        from_mining := least(r.mine, cut);
        from_admin := least(r.adm, cut - from_mining);
        update public.balances set mining_balance = mining_balance - from_mining, admin_add = admin_add - from_admin, last_updated = now()
         where public.balances.user_id = r.uid;
        insert into public.balance_reconciliation_log (user_id, admin_add_before, mining_before, admin_add_after, mining_after, ledger_net, referral_recorded, unexplained)
        values (r.uid, r.adm, r.mine, r.adm - from_admin, r.mine - from_mining, r.net, r.ref_unrec, cut);
      end if;

      if corr > 0 then
        -- put the correction just before the first entry at which the history would otherwise go below zero
        -- (that is when the unrecorded money must already have been in the account); else before the first entry
        select x.transaction_date into first_at from (
          select l.transaction_date, l.id, sum(l.signed_amount) over (order by l.transaction_date, l.id) as cum
            from public.v_ledger l where l.user_id = r.uid
        ) x where x.cum < -0.005 order by x.transaction_date, x.id limit 1;
        if first_at is null then select min(t.transaction_date) into first_at from public.transactions t where t.user_id = r.uid; end if;
        insert into public.transactions (user_id, amount, type, status, details, metadata, transaction_date, processed_at)
        values (r.uid, corr, 'ADJUSTMENT', 'completed',
                'Balance correction: money that entered the account in the old system without any transaction record',
                jsonb_build_object('correction', true, 'reason', 'unrecorded balance from the old system'),
                coalesce(first_at, now()) - interval '1 second', coalesce(first_at, now()) - interval '1 second');
      end if;
    end if;
  end loop;

  if p_apply then perform public.fn_rebuild_transaction_balances(); end if;

  return query
    select (e ->> 'u')::uuid, e ->> 'e', (e ->> 'b0')::numeric, (e ->> 'b1')::numeric, (e ->> 'cut')::numeric,
           (e ->> 'corr')::numeric, (e ->> 'ref')::numeric, e ->> 'a'
      from jsonb_array_elements(out_rows) e
     order by (e ->> 'cut')::numeric + (e ->> 'corr')::numeric desc;
end $$;

revoke all on function public.fn_fix_balances(boolean, uuid[]) from public, anon, authenticated;
grant execute on function public.fn_fix_balances(boolean, uuid[]) to service_role;

-- Finds (and, on request, fixes) balance that has no record behind it.
--
-- Background: the old backend let a user pay for shares from their mining profit while deducting everything from
-- `adminAdd`, so `adminAdd` went negative in MongoDB. The import clamped that negative to 0 (the new table forbids
-- negatives), which created money out of nothing. Separately, old referral bonuses were credited without any transaction.
--
-- For every user:   unexplained = balance - (net of all ledger entries + referral bonuses that were earned but never recorded)
--   * unexplained > 0  -> money with no record behind it: the balance is reduced to what the records support (never below 0).
--                         Mining balance is reduced first, then the deposited balance.
--   * referral bonuses earned but never recorded (10% of a referred user's first machine purchase, 2% of later ones, the
--     same rule the old backend used) are written to the ledger as REFERRAL_BONUS entries, so they are explained, not removed.
--   * unexplained < 0  -> the balance is LOWER than the records: reported as 'review', never changed.
--
-- Usage (Supabase SQL editor):
--   select * from public.fn_reconcile_unrecorded_balances(false);          -- preview only, changes nothing
--   select * from public.fn_reconcile_unrecorded_balances(true);           -- apply
--   select * from public.fn_reconcile_unrecorded_balances(true, array['<user uuid>']::uuid[]);   -- apply, but skip these users
-- Every change is written to public.balance_reconciliation_log (before / after) so it can be audited or reverted.

create table if not exists public.balance_reconciliation_log (
  id              bigserial primary key,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  applied_at      timestamptz not null default now(),
  admin_add_before numeric(20, 4) not null, mining_before numeric(20, 4) not null,
  admin_add_after  numeric(20, 4) not null, mining_after  numeric(20, 4) not null,
  ledger_net      numeric(20, 4) not null, referral_recorded numeric(20, 4) not null default 0,
  unexplained     numeric(20, 4) not null
);
alter table public.balance_reconciliation_log enable row level security;
revoke all on public.balance_reconciliation_log from public, anon, authenticated;
grant all on public.balance_reconciliation_log to service_role;
grant usage, select on sequence public.balance_reconciliation_log_id_seq to service_role;

drop function if exists public.fn_reconcile_unrecorded_balances(boolean, uuid[]);
create or replace function public.fn_reconcile_unrecorded_balances(p_apply boolean default false, p_exclude uuid[] default '{}')
returns table (user_id uuid, email text, balance numeric, ledger_net numeric, referral_unrecorded numeric,
               unexplained numeric, new_balance numeric, action text)
language plpgsql security definer set search_path = public as $$
declare r record; cut numeric; from_mining numeric; from_admin numeric; b public.balances;
begin
  create temp table _owed on commit drop as
    with buy as (
      select t.id, t.user_id as buyer, t.amount, t.transaction_date,
             row_number() over (partition by t.user_id order by t.transaction_date, t.id) as rn
        from public.transactions t where t.type = 'MACHINE_PURCHASE' and t.status = 'completed'
    )
    select p.referred_by as referrer, b2.id as purchase_id, b2.buyer, b2.transaction_date,
           case when b2.rn = 1 then 0.10 else 0.02 end as rate,
           round(b2.amount * (case when b2.rn = 1 then 0.10 else 0.02 end), 2) as bonus
      from buy b2 join public.profiles p on p.id = b2.buyer
     where p.referred_by is not null
       and not exists (select 1 from public.transactions x
                        where x.type = 'REFERRAL_BONUS' and x.user_id = p.referred_by
                          and x.metadata ->> 'purchaseTransactionId' = b2.id::text);

  create temp table _calc on commit drop as
    select bl.user_id as uid, p.email as mail,
           bl.total_balance as bal, bl.admin_add as adm, bl.mining_balance as mine,
           coalesce((select sum(l.signed_amount) from public.v_ledger l where l.user_id = bl.user_id), 0) as net,
           coalesce((select sum(o.bonus) from _owed o where o.referrer = bl.user_id), 0) as ref_unrec
      from public.balances bl join public.profiles p on p.id = bl.user_id;

  -- what each user's records support, and what to do about the difference
  create temp table _plan on commit drop as
    select c.*, c.bal - (c.net + c.ref_unrec) as diff,
           greatest(0, c.net + c.ref_unrec) as target,
           case when p_exclude is not null and c.uid = any (p_exclude) then 'skipped (excluded)'
                when c.bal - greatest(0, c.net + c.ref_unrec) > 0.005 then 'reduce'
                when c.bal - (c.net + c.ref_unrec) < -0.005 then 'review (balance is lower than the records)'
                else 'ok' end as act
      from _calc c;

  if p_apply then
    -- 1. earned-but-unrecorded referral bonuses become ledger entries (only where the balance already contains them)
    insert into public.transactions (user_id, amount, type, status, details, metadata, transaction_date, processed_at)
    select o.referrer, o.bonus, 'REFERRAL_BONUS', 'completed',
           format('Referral bonus (%s%%) on a purchase by %s (rebuilt from purchase history)', (o.rate * 100)::int,
                  (select trim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')) from public.profiles where id = o.buyer)),
           jsonb_build_object('referredUser', o.buyer, 'purchaseTransactionId', o.purchase_id, 'rate', o.rate, 'rebuilt', true),
           o.transaction_date, o.transaction_date
      from _owed o join _plan pl on pl.uid = o.referrer
     where o.bonus > 0 and pl.act in ('reduce', 'ok');

    -- 2. take away money that has no record behind it
    for r in select * from _plan where act = 'reduce' loop
      select * into b from public.balances where public.balances.user_id = r.uid for update;
      cut := b.total_balance - r.target;
      continue when cut <= 0;
      from_mining := least(b.mining_balance, cut);
      from_admin := least(b.admin_add, cut - from_mining);
      update public.balances set mining_balance = mining_balance - from_mining, admin_add = admin_add - from_admin, last_updated = now()
       where public.balances.user_id = r.uid;
      insert into public.balance_reconciliation_log (user_id, admin_add_before, mining_before, admin_add_after, mining_after, ledger_net, referral_recorded, unexplained)
      values (r.uid, b.admin_add, b.mining_balance, b.admin_add - from_admin, b.mining_balance - from_mining, r.net, r.ref_unrec, r.diff);
    end loop;

    -- 3. running balances on every entry now follow the corrected balances
    perform public.fn_rebuild_transaction_balances();
  end if;

  return query
    select pl.uid, pl.mail, pl.bal::numeric, pl.net::numeric, pl.ref_unrec::numeric,
           pl.diff::numeric,
           case when pl.act = 'reduce' then pl.target else pl.bal end::numeric,
           pl.act
      from _plan pl
     where pl.act <> 'ok' or pl.ref_unrec > 0
     order by pl.diff desc;
end $$;

revoke all on function public.fn_reconcile_unrecorded_balances(boolean, uuid[]) from public, anon, authenticated;
grant execute on function public.fn_reconcile_unrecorded_balances(boolean, uuid[]) to service_role;

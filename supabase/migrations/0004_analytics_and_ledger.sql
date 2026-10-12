-- Admin analytics, user overview and the money ledger.
-- Everything here is read-only for the app (service role, called from /api/v1/admin/*),
-- except that referral bonuses now leave a ledger entry (REFERRAL_BONUS) so the ledger is complete.

-- ------------------------------------------------------------------ referral bonus is a ledger entry
alter table public.transactions drop constraint if exists transactions_type_check;
alter table public.transactions add constraint transactions_type_check check (type in (
  'withdrawal', 'profit', 'MACHINE_PURCHASE', 'MACHINE_SALE',
  'SHARE_PURCHASE', 'SHARE_PROFIT', 'SHARE_SALE', 'ADMIN_ADD', 'REFERRAL_BONUS'));

create index if not exists transactions_type_status_date_idx on public.transactions (type, status, transaction_date);
create index if not exists transactions_processed_idx on public.transactions (processed_at) where processed_at is not null;

create or replace function public.fn_purchase_machine(p_user uuid, p_machine uuid, p_quantity integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  m public.mining_machines;
  b public.balances;
  rb public.balances;
  cost numeric;
  prev_purchases integer;
  pct numeric;
  bonus numeric;
  tx_id uuid;
  referrer uuid;
  buyer_name text;
  um_ids uuid[] := '{}';
  new_id uuid;
  i integer;
begin
  if p_quantity is null or p_quantity < 1 or p_quantity > 100 then
    raise exception 'Quantity must be a whole number between 1 and 100' using errcode = 'P0001';
  end if;

  select * into m from public.mining_machines where id = p_machine;
  if not found then raise exception 'Machine not found' using errcode = 'P0002'; end if;

  b := public._ensure_balance(p_user);
  cost := m.price_range * p_quantity;
  if b.admin_add < cost then raise exception 'Insufficient balance' using errcode = 'P0001'; end if;

  select count(*) into prev_purchases from public.transactions
   where user_id = p_user and type = 'MACHINE_PURCHASE' and status = 'completed';

  insert into public.transactions (user_id, amount, type, status, balance_before, balance_after, metadata)
  values (p_user, cost, 'MACHINE_PURCHASE', 'completed', b.total_balance, b.total_balance - cost,
          jsonb_build_object('machineId', m.id, 'machineName', m.machine_name,
                             'quantity', p_quantity, 'pricePerUnit', m.price_range))
  returning id into tx_id;

  update public.balances set admin_add = admin_add - cost, last_updated = now() where user_id = p_user;

  pct := case when prev_purchases = 0 then 0.10 else 0.02 end;
  bonus := round(cost * pct, 2);

  update public.profiles
     set referral_status = 'active', discount = discount + bonus, updated_at = now()
   where id = p_user
  returning referred_by, trim(first_name || ' ' || last_name) into referrer, buyer_name;

  if referrer is not null and bonus > 0 then
    rb := public._ensure_balance(referrer);
    update public.balances set admin_add = admin_add + bonus, last_updated = now() where user_id = referrer;
    insert into public.transactions (user_id, amount, type, status, balance_before, balance_after, details, metadata, processed_at)
    values (referrer, bonus, 'REFERRAL_BONUS', 'completed', rb.total_balance, rb.total_balance + bonus,
            format('Referral bonus (%s%%) on a purchase by %s', (pct * 100)::int, buyer_name),
            jsonb_build_object('referredUser', p_user, 'purchaseTransactionId', tx_id, 'rate', pct), now());
  end if;

  for i in 1..p_quantity loop
    insert into public.user_machines (user_id, machine_id, status, machine_name, hashrate, power_consumption,
                                      price_range, coins_mined, monthly_profit, description, images)
    values (p_user, m.id, 'active', m.machine_name, m.hashrate, m.power_consumption,
            m.price_range, m.coins_mined, m.monthly_profit, m.description, m.images)
    returning id into new_id;
    um_ids := um_ids || new_id;
  end loop;

  return jsonb_build_object('transactionId', tx_id, 'totalCost', cost,
                            'newBalance', b.admin_add - cost, 'userMachineIds', to_jsonb(um_ids));
end $$;

-- ------------------------------------------------------------------ the ledger view
-- One row per money event with its direction and its effect on the user's balance.
--   credit  = increases the balance      debit = decreases it
--   signed_amount only counts events that actually moved money (approved / completed);
--   a pending withdrawal is a *hold* (counted separately), a rejected one has no effect.
create or replace view public.v_ledger as
select
  t.id, t.user_id, t.type, t.status, t.amount, t.transaction_date, t.processed_at,
  t.balance_before, t.balance_after, t.wallet_address, t.network, t.admin_comment, t.metadata,
  case when t.type in ('ADMIN_ADD', 'profit', 'SHARE_PROFIT', 'MACHINE_SALE', 'SHARE_SALE', 'REFERRAL_BONUS') then 'credit'
       else 'debit' end as direction,
  case when t.status in ('approved', 'completed') then
         case when t.type in ('ADMIN_ADD', 'profit', 'SHARE_PROFIT', 'MACHINE_SALE', 'SHARE_SALE', 'REFERRAL_BONUS') then t.amount
              else -t.amount end
       else 0 end as signed_amount,
  case t.type
    when 'ADMIN_ADD' then 'deposit' when 'withdrawal' then 'withdrawal'
    when 'MACHINE_PURCHASE' then 'purchase' when 'SHARE_PURCHASE' then 'purchase'
    when 'profit' then 'profit' when 'SHARE_PROFIT' then 'profit'
    when 'MACHINE_SALE' then 'sale' when 'SHARE_SALE' then 'sale'
    else 'referral' end as category,
  case t.type
    when 'ADMIN_ADD' then 'Deposit credited' when 'withdrawal' then 'Withdrawal'
    when 'MACHINE_PURCHASE' then 'Machine purchase' when 'SHARE_PURCHASE' then 'Share purchase'
    when 'profit' then 'Mining profit' when 'SHARE_PROFIT' then 'Share profit'
    when 'MACHINE_SALE' then 'Machine sale' when 'SHARE_SALE' then 'Share sale'
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

-- ------------------------------------------------------------------ per-user metrics view
create or replace view public.v_user_metrics as
select
  p.id, p.first_name, p.last_name, p.email, p.phone_number, p.country, p.role, p.two_factor_enabled,
  p.created_at, p.referred_by,
  coalesce(b.admin_add, 0)      as admin_add,
  coalesce(b.mining_balance, 0) as mining_balance,
  coalesce(b.total_balance, 0)  as total_balance,
  coalesce(tx.deposited, 0)     as deposited,
  coalesce(tx.withdrawn, 0)     as withdrawn,
  coalesce(tx.pending_wd, 0)    as pending_withdrawal,
  tx.last_activity,
  coalesce(um.machines, 0)      as machines,
  coalesce(sh.shares, 0)        as shares,
  coalesce(rf.referrals, 0)     as referrals,
  (p.created_at > now() - interval '7 days' and p.role = 'user')                     as is_new,
  (coalesce(tx.pending_wd, 0) > 0)                                                   as has_pending_withdrawal,
  (coalesce(tx.deposited, 0) = 0 and p.role = 'user')                                as never_deposited,
  (coalesce(b.total_balance, 0) > 0)                                                 as holds_funds,
  (coalesce(b.total_balance, 0) > 0 and p.created_at < now() - interval '30 days'
     and coalesce(tx.last_activity, p.created_at) < now() - interval '30 days')      as dormant,
  (coalesce(um.machines, 0) + coalesce(sh.shares, 0) = 0 and p.role = 'user')        as no_machines
from public.profiles p
left join public.balances b on b.user_id = p.id
left join (
  select user_id,
         sum(amount) filter (where type = 'ADMIN_ADD' and status = 'approved')      as deposited,
         sum(amount) filter (where type = 'withdrawal' and status = 'approved')     as withdrawn,
         sum(amount) filter (where type = 'withdrawal' and status = 'pending')      as pending_wd,
         max(transaction_date) filter (where status in ('approved', 'completed'))   as last_activity
    from public.transactions group by user_id
) tx on tx.user_id = p.id
left join (select user_id, count(*) as machines from public.user_machines where status = 'active' group by user_id) um on um.user_id = p.id
left join (select user_id, sum(number_of_shares) as shares from public.share_purchases where status = 'active' group by user_id) sh on sh.user_id = p.id
left join (select referred_by, count(*) as referrals from public.profiles where referred_by is not null group by referred_by) rf on rf.referred_by = p.id;

revoke all on public.v_ledger, public.v_user_metrics from public, anon, authenticated;
grant select on public.v_ledger, public.v_user_metrics to service_role;

-- ------------------------------------------------------------------ ledger
create or replace function public.fn_admin_ledger(
  p_admin uuid, p_from timestamptz default null, p_to timestamptz default null,
  p_categories text[] default null, p_statuses text[] default null, p_user uuid default null,
  p_search text default null, p_min numeric default null, p_max numeric default null,
  p_limit integer default 50, p_offset integer default 0)
returns jsonb language plpgsql security definer set search_path = public as $$
declare q text := lower(coalesce(trim(p_search), '')); out jsonb;
begin
  if not public._is_admin_user(p_admin) then raise exception 'Only admins can do this!' using errcode = '42501'; end if;
  p_limit := least(greatest(coalesce(p_limit, 50), 1), 50000);
  p_offset := greatest(coalesce(p_offset, 0), 0);

  with f as (
    select l.*, p.first_name, p.last_name, p.email
      from public.v_ledger l join public.profiles p on p.id = l.user_id
     where (p_from is null or l.transaction_date >= p_from)
       and (p_to is null or l.transaction_date < p_to)
       and (p_categories is null or l.category = any (p_categories))
       and (p_statuses is null or l.status = any (p_statuses))
       and (p_user is null or l.user_id = p_user)
       and (p_min is null or l.amount >= p_min)
       and (p_max is null or l.amount <= p_max)
       and (q = '' or position(q in lower(concat_ws(' ', p.first_name, p.last_name, p.email, l.description, l.wallet_address, l.id::text))) > 0)
  ), page as (
    select * from f order by transaction_date desc, id limit p_limit offset p_offset
  ), tot as (
    select count(*) as n,
           coalesce(sum(signed_amount) filter (where signed_amount > 0), 0) as credits,
           coalesce(-sum(signed_amount) filter (where signed_amount < 0), 0) as debits,
           coalesce(sum(signed_amount), 0) as net,
           coalesce(sum(amount) filter (where type = 'withdrawal' and status = 'pending'), 0) as pending_hold
      from f
  )
  select jsonb_build_object(
    'total', (select n from tot),
    'totals', (select jsonb_build_object('credits', credits, 'debits', debits, 'net', net, 'pendingHold', pending_hold) from tot),
    'rows', coalesce((select jsonb_agg(jsonb_build_object(
        'id', id, 'date', transaction_date, 'processedAt', processed_at, 'userId', user_id,
        'userName', nullif(trim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')), ''), 'userEmail', email,
        'type', type, 'typeLabel', type_label, 'category', category, 'direction', direction, 'status', status,
        'amount', amount, 'signedAmount', signed_amount, 'balanceBefore', balance_before, 'balanceAfter', balance_after,
        'description', description, 'walletAddress', wallet_address, 'network', network, 'adminComment', admin_comment)
        order by transaction_date desc, id) from page), '[]'::jsonb)
  ) into out;
  return out;
end $$;

-- ------------------------------------------------------------------ users overview
create or replace function public.fn_admin_users_overview(
  p_admin uuid, p_search text default null, p_segment text default 'all',
  p_sort text default 'joined', p_dir text default 'desc', p_limit integer default 25, p_offset integer default 0)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  q text := lower(coalesce(trim(p_search), ''));
  sort_col text;
  dir text := case when lower(coalesce(p_dir, 'desc')) = 'asc' then 'asc' else 'desc' end;
  seg_sql text;
  out jsonb;
begin
  if not public._is_admin_user(p_admin) then raise exception 'Only admins can do this!' using errcode = '42501'; end if;
  p_limit := least(greatest(coalesce(p_limit, 25), 1), 1000);
  p_offset := greatest(coalesce(p_offset, 0), 0);

  sort_col := case p_sort
    when 'name' then 'lower(first_name || '' '' || last_name)' when 'balance' then 'total_balance'
    when 'deposited' then 'deposited' when 'withdrawn' then 'withdrawn' when 'machines' then '(machines + shares)'
    when 'referrals' then 'referrals' when 'activity' then 'last_activity' when 'pending' then 'pending_withdrawal'
    else 'created_at' end;

  seg_sql := case p_segment
    when 'new' then 'is_new' when 'pending_withdrawal' then 'has_pending_withdrawal'
    when 'never_deposited' then 'never_deposited' when 'holding' then 'holds_funds'
    when 'dormant' then 'dormant' when 'no_machines' then 'no_machines' when 'admins' then 'role = ''admin'''
    else 'true' end;

  execute format($f$
    with base as (select * from public.v_user_metrics),
    counts as (
      select count(*) as all_n, count(*) filter (where is_new) as new_n,
             count(*) filter (where has_pending_withdrawal) as pending_n, count(*) filter (where never_deposited) as never_n,
             count(*) filter (where holds_funds) as holding_n, count(*) filter (where dormant) as dormant_n,
             count(*) filter (where no_machines) as nomach_n, count(*) filter (where role = 'admin') as admin_n
        from base),
    f as (
      select * from base
       where (%1$s) and (%2$L = '' or position(%2$L in lower(concat_ws(' ', first_name, last_name, email, phone_number, country))) > 0)
    ),
    page as (select * from f order by %3$s %4$s nulls last, id limit %5$s offset %6$s)
    select jsonb_build_object(
      'total', (select count(*) from f),
      'segmentCounts', (select jsonb_build_object('all', all_n, 'new', new_n, 'pending_withdrawal', pending_n,
                          'never_deposited', never_n, 'holding', holding_n, 'dormant', dormant_n,
                          'no_machines', nomach_n, 'admins', admin_n) from counts),
      'rows', coalesce((select jsonb_agg(jsonb_build_object(
          'id', id, 'firstName', first_name, 'lastName', last_name, 'email', email, 'phone', phone_number,
          'country', country, 'role', role, 'twoFactor', two_factor_enabled, 'joinedAt', created_at,
          'lastActivityAt', last_activity, 'depositedBalance', admin_add, 'profitBalance', mining_balance,
          'totalBalance', total_balance, 'totalDeposited', deposited, 'totalWithdrawn', withdrawn,
          'pendingWithdrawal', pending_withdrawal, 'machines', machines, 'shares', shares, 'referrals', referrals,
          'tags', to_jsonb(array_remove(array[
             case when is_new then 'new' end, case when has_pending_withdrawal then 'pending_withdrawal' end,
             case when dormant then 'dormant' end, case when never_deposited then 'never_deposited' end,
             case when role = 'admin' then 'admin' end], null))
        ) order by %3$s %4$s nulls last, id) from page), '[]'::jsonb))
  $f$, seg_sql, q, sort_col, dir, p_limit, p_offset) into out;
  return out;
end $$;

-- ------------------------------------------------------------------ KPIs (current vs previous period + live snapshot)
create or replace function public.fn_admin_kpis(p_admin uuid, p_from timestamptz, p_to timestamptz)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  span interval; prev_from timestamptz;
  cur jsonb; prev jsonb; snap jsonb; attention jsonb;
begin
  if not public._is_admin_user(p_admin) then raise exception 'Only admins can do this!' using errcode = '42501'; end if;
  if p_from is null or p_to is null or p_to <= p_from then raise exception 'Invalid date range' using errcode = 'P0001'; end if;
  span := p_to - p_from; prev_from := p_from - span;

  select jsonb_object_agg(k, v) into cur from (
    select 'deposits' k, coalesce(sum(amount), 0) v from public.v_ledger where type = 'ADMIN_ADD' and status = 'approved' and effective_at >= p_from and effective_at < p_to
    union all select 'depositCount', count(*) from public.v_ledger where type = 'ADMIN_ADD' and status = 'approved' and effective_at >= p_from and effective_at < p_to
    union all select 'withdrawals', coalesce(sum(amount), 0) from public.v_ledger where type = 'withdrawal' and status = 'approved' and effective_at >= p_from and effective_at < p_to
    union all select 'withdrawalCount', count(*) from public.v_ledger where type = 'withdrawal' and status = 'approved' and effective_at >= p_from and effective_at < p_to
    union all select 'investments', coalesce(sum(amount), 0) from public.v_ledger where category = 'purchase' and status = 'completed' and effective_at >= p_from and effective_at < p_to
    union all select 'buybacks', coalesce(sum(amount), 0) from public.v_ledger where category = 'sale' and status = 'completed' and effective_at >= p_from and effective_at < p_to
    union all select 'profitPaid', coalesce(sum(amount), 0) from public.v_ledger where category = 'profit' and status = 'completed' and effective_at >= p_from and effective_at < p_to
    union all select 'referralPaid', coalesce(sum(amount), 0) from public.v_ledger where category = 'referral' and status = 'completed' and effective_at >= p_from and effective_at < p_to
    union all select 'newUsers', count(*) from public.profiles where created_at >= p_from and created_at < p_to
    union all select 'activeUsers', count(distinct user_id) from public.v_ledger where status in ('approved', 'completed') and effective_at >= p_from and effective_at < p_to
    union all select 'newDepositors', count(*) from (
        select user_id from public.v_ledger where type = 'ADMIN_ADD' and status = 'approved'
         group by user_id having min(effective_at) >= p_from and min(effective_at) < p_to) x
  ) s;

  select jsonb_object_agg(k, v) into prev from (
    select 'deposits' k, coalesce(sum(amount), 0) v from public.v_ledger where type = 'ADMIN_ADD' and status = 'approved' and effective_at >= prev_from and effective_at < p_from
    union all select 'depositCount', count(*) from public.v_ledger where type = 'ADMIN_ADD' and status = 'approved' and effective_at >= prev_from and effective_at < p_from
    union all select 'withdrawals', coalesce(sum(amount), 0) from public.v_ledger where type = 'withdrawal' and status = 'approved' and effective_at >= prev_from and effective_at < p_from
    union all select 'withdrawalCount', count(*) from public.v_ledger where type = 'withdrawal' and status = 'approved' and effective_at >= prev_from and effective_at < p_from
    union all select 'investments', coalesce(sum(amount), 0) from public.v_ledger where category = 'purchase' and status = 'completed' and effective_at >= prev_from and effective_at < p_from
    union all select 'buybacks', coalesce(sum(amount), 0) from public.v_ledger where category = 'sale' and status = 'completed' and effective_at >= prev_from and effective_at < p_from
    union all select 'profitPaid', coalesce(sum(amount), 0) from public.v_ledger where category = 'profit' and status = 'completed' and effective_at >= prev_from and effective_at < p_from
    union all select 'referralPaid', coalesce(sum(amount), 0) from public.v_ledger where category = 'referral' and status = 'completed' and effective_at >= prev_from and effective_at < p_from
    union all select 'newUsers', count(*) from public.profiles where created_at >= prev_from and created_at < p_from
    union all select 'activeUsers', count(distinct user_id) from public.v_ledger where status in ('approved', 'completed') and effective_at >= prev_from and effective_at < p_from
    union all select 'newDepositors', count(*) from (
        select user_id from public.v_ledger where type = 'ADMIN_ADD' and status = 'approved'
         group by user_id having min(effective_at) >= prev_from and min(effective_at) < p_from) x
  ) s;

  -- live snapshot (not period-bound)
  select jsonb_build_object(
    'users', (select count(*) from public.profiles where role = 'user'),
    'usersWithBalance', (select count(*) from public.balances where total_balance > 0),
    'fundsHeld', coalesce((select sum(total_balance) from public.balances), 0),
    'fundsDeposited', coalesce((select sum(admin_add) from public.balances), 0),
    'fundsProfit', coalesce((select sum(mining_balance) from public.balances), 0),
    'top5Share', coalesce((select sum(total_balance) from (select total_balance from public.balances order by total_balance desc limit 5) t)
                          / nullif((select sum(total_balance) from public.balances), 0), 0),
    'activeMachines', (select count(*) from public.user_machines where status = 'active'),
    'activeShares', coalesce((select sum(number_of_shares) from public.share_purchases where status = 'active'), 0),
    'unreadContacts', (select count(*) from public.contacts where status = 'pending')
  ) into snap;

  select jsonb_build_object(
    'pendingWithdrawals', jsonb_build_object(
      'count', (select count(*) from public.transactions where type = 'withdrawal' and status = 'pending'),
      'amount', coalesce((select sum(amount) from public.transactions where type = 'withdrawal' and status = 'pending'), 0),
      'oldestAt', (select min(transaction_date) from public.transactions where type = 'withdrawal' and status = 'pending')),
    'oldestPending', coalesce((select jsonb_agg(jsonb_build_object(
        'id', t.id, 'userId', t.user_id, 'userName', nullif(trim(p.first_name || ' ' || p.last_name), ''), 'userEmail', p.email,
        'amount', t.amount, 'requestedAt', t.transaction_date, 'network', t.network) order by t.transaction_date)
        from (select * from public.transactions where type = 'withdrawal' and status = 'pending' order by transaction_date limit 5) t
        join public.profiles p on p.id = t.user_id), '[]'::jsonb),
    'dormantWithFunds', (select count(*) from public.v_user_metrics where dormant),
    'topUsers', coalesce((select jsonb_agg(jsonb_build_object(
        'id', id, 'name', nullif(trim(first_name || ' ' || last_name), ''), 'email', email, 'totalBalance', total_balance,
        'totalDeposited', deposited) order by total_balance desc)
        from (select * from public.v_user_metrics where total_balance > 0 order by total_balance desc limit 5) u), '[]'::jsonb)
  ) into attention;

  return jsonb_build_object('range', jsonb_build_object('from', p_from, 'to', p_to, 'prevFrom', prev_from),
                            'current', cur, 'previous', prev, 'snapshot', snap, 'attention', attention);
end $$;

-- ------------------------------------------------------------------ time series (zero-filled)
create or replace function public.fn_admin_timeseries(p_admin uuid, p_from timestamptz, p_to timestamptz, p_bucket text default 'day')
returns jsonb language plpgsql security definer set search_path = public as $$
declare bucket text := case when p_bucket = 'week' then 'week' else 'day' end; out jsonb;
begin
  if not public._is_admin_user(p_admin) then raise exception 'Only admins can do this!' using errcode = '42501'; end if;
  if p_from is null or p_to is null or p_to <= p_from then raise exception 'Invalid date range' using errcode = 'P0001'; end if;
  if p_to - p_from > interval '800 days' then raise exception 'Range too large' using errcode = 'P0001'; end if;

  with buckets as (
    select generate_series(date_trunc(bucket, p_from at time zone 'utc'), date_trunc(bucket, (p_to - interval '1 second') at time zone 'utc'),
                           ('1 ' || bucket)::interval) as b
  ), l as (
    select date_trunc(bucket, effective_at at time zone 'utc') as b,
           sum(amount) filter (where type = 'ADMIN_ADD' and status = 'approved') as deposits,
           sum(amount) filter (where type = 'withdrawal' and status = 'approved') as withdrawals,
           sum(amount) filter (where category = 'purchase' and status = 'completed') as investments,
           sum(amount) filter (where category = 'profit' and status = 'completed') as profit_paid
      from public.v_ledger where effective_at >= p_from and effective_at < p_to group by 1
  ), u as (
    select date_trunc(bucket, created_at at time zone 'utc') as b, count(*) as new_users
      from public.profiles where created_at >= p_from and created_at < p_to group by 1
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'date', to_char(buckets.b, 'YYYY-MM-DD'), 'deposits', coalesce(l.deposits, 0), 'withdrawals', coalesce(l.withdrawals, 0),
      'investments', coalesce(l.investments, 0), 'profitPaid', coalesce(l.profit_paid, 0), 'newUsers', coalesce(u.new_users, 0))
      order by buckets.b), '[]'::jsonb)
    into out
    from buckets left join l on l.b = buckets.b left join u on u.b = buckets.b;
  return jsonb_build_object('bucket', bucket, 'points', out);
end $$;

-- ------------------------------------------------------------------ access: service role only
revoke all on function
  public.fn_admin_ledger(uuid, timestamptz, timestamptz, text[], text[], uuid, text, numeric, numeric, integer, integer),
  public.fn_admin_users_overview(uuid, text, text, text, text, integer, integer),
  public.fn_admin_kpis(uuid, timestamptz, timestamptz),
  public.fn_admin_timeseries(uuid, timestamptz, timestamptz, text)
from public, anon, authenticated;
grant execute on function
  public.fn_admin_ledger(uuid, timestamptz, timestamptz, text[], text[], uuid, text, numeric, numeric, integer, integer),
  public.fn_admin_users_overview(uuid, text, text, text, text, integer, integer),
  public.fn_admin_kpis(uuid, timestamptz, timestamptz),
  public.fn_admin_timeseries(uuid, timestamptz, timestamptz, text)
to service_role;

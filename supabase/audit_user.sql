-- Full audit of ONE user's money record. Replace the email on the first line, run it in the Supabase SQL editor.
-- Every line is OK, CHECK (something does not add up) or info (just a figure to read). Nothing is changed.
with p as (select 'ahmadmagharba@hotmail.com'::text as email),
u as (select pr.id, pr.email from public.profiles pr join p on pr.email = p.email),
bal as (select coalesce(b.total_balance, 0) as total, coalesce(b.admin_add, 0) as admin_add, coalesce(b.mining_balance, 0) as mining
          from u left join public.balances b on b.user_id = u.id),
ledger as (select * from public.v_ledger where user_id = (select id from u)),
net as (select coalesce(sum(signed_amount), 0) as n from ledger),
chain as (
  select min(t.balance_after) as lowest,
         (array_agg(t.balance_after order by t.transaction_date desc, t.id desc))[1] as last_after
    from public.transactions t where t.user_id = (select id from u)
),
shares as (select * from public.share_purchases where user_id = (select id from u)),
checks as (
  select 1 as o, 'Balance equals the net of every recorded money movement' as chk,
         (select round(n, 2) from net)::text as expected, (select round(total, 2) from bal)::text as actual,
         case when abs((select n from net) - (select total from bal)) < 0.005 then 'OK' else 'CHECK' end as status
  union all
  select 2, 'No "Balance correction" (unrecorded money) entry left', '0',
         (select count(*) from ledger where type = 'ADJUSTMENT')::text,
         case when (select count(*) from ledger where type = 'ADJUSTMENT') = 0 then 'OK' else 'CHECK' end
  union all
  select 3, 'Running balance never goes below zero', '>= 0', (select round(lowest, 2) from chain)::text,
         case when (select lowest from chain) >= -0.005 then 'OK' else 'CHECK' end
  union all
  select 4, 'The last entry ends exactly at the balance', (select round(total, 2) from bal)::text, (select round(last_after, 2) from chain)::text,
         case when abs(coalesce((select last_after from chain), 0) - (select total from bal)) < 0.005 then 'OK' else 'CHECK' end
  union all
  select 5, 'Completed share purchases (money) = active + sold shares (money)',
         (select coalesce(sum(amount), 0) from ledger where type = 'SHARE_PURCHASE' and status = 'completed')::text,
         (select coalesce(sum(total_investment), 0) from shares where status in ('active', 'inactive'))::text,
         case when (select coalesce(sum(amount), 0) from ledger where type = 'SHARE_PURCHASE' and status = 'completed')
                 = (select coalesce(sum(total_investment), 0) from shares where status in ('active', 'inactive')) then 'OK' else 'CHECK' end
  union all
  select 6, 'Every voided (rejected) share purchase has its shares cancelled',
         (select count(*) from ledger where type = 'SHARE_PURCHASE' and status = 'rejected')::text,
         (select count(*) from shares where status = 'cancelled')::text,
         case when (select count(*) from ledger where type = 'SHARE_PURCHASE' and status = 'rejected')
                 = (select count(*) from shares where status = 'cancelled') then 'OK' else 'CHECK' end
  union all
  select 7, 'No pending withdrawal larger than the balance', '<= balance',
         (select coalesce(sum(amount), 0) from ledger where type = 'withdrawal' and status = 'pending')::text,
         case when (select coalesce(sum(amount), 0) from ledger where type = 'withdrawal' and status = 'pending') <= (select total from bal) + 0.005 then 'OK' else 'CHECK' end
  union all select 20, 'Deposits credited (admin + NOWPayments)', '', (select coalesce(sum(amount), 0) from ledger where type = 'ADMIN_ADD' and status = 'approved')::text, 'info'
  union all select 21, 'Share profit paid (net of reversals)', '', (select coalesce(sum(signed_amount), 0) from ledger where type = 'SHARE_PROFIT')::text, 'info'
  union all select 22, 'Withdrawals paid out', '', (select coalesce(sum(amount), 0) from ledger where type = 'withdrawal' and status = 'approved')::text, 'info'
  union all select 23, 'Money spent on shares (completed purchases)', '', (select coalesce(sum(amount), 0) from ledger where type = 'SHARE_PURCHASE' and status = 'completed')::text, 'info'
  union all select 24, 'Active shares owned', '', (select coalesce(sum(number_of_shares), 0) from shares where status = 'active')::text, 'info'
  union all select 25, 'Monthly profit of those shares', '', (select coalesce(sum(number_of_shares * profit_per_share), 0) from shares where status = 'active')::text, 'info'
  union all select 26, 'Machines owned (user_machines)', '', (select count(*) from public.user_machines where user_id = (select id from u))::text, 'info'
  union all select 27, 'Current balance (deposited + profit)', '', (select round(total, 2) from bal)::text || ' (' || (select round(admin_add, 2) from bal)::text || ' + ' || (select round(mining, 2) from bal)::text || ')', 'info'
)
select chk as "check", expected, actual, status from checks order by o;

-- Ledger running balance counted from a start date with an opening balance of zero.
-- p_start (optional) hides everything before it and recomputes "balance before/after" for each entry as the running
-- total of money-moving entries since that date (pending and rejected entries move no money, so they carry it unchanged).
-- Without p_start the stored balances are returned as before.
drop function if exists public.fn_admin_ledger(uuid, timestamptz, timestamptz, text[], text[], uuid, text, numeric, numeric, integer, integer);

create or replace function public.fn_admin_ledger(
  p_admin uuid, p_from timestamptz default null, p_to timestamptz default null,
  p_categories text[] default null, p_statuses text[] default null, p_user uuid default null,
  p_search text default null, p_min numeric default null, p_max numeric default null,
  p_limit integer default 50, p_offset integer default 0, p_start timestamptz default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare q text := lower(coalesce(trim(p_search), '')); out jsonb;
begin
  if not public._is_admin_user(p_admin) then raise exception 'Only admins can do this!' using errcode = '42501'; end if;
  p_limit := least(greatest(coalesce(p_limit, 50), 1), 50000);
  p_offset := greatest(coalesce(p_offset, 0), 0);

  with chain as (
    -- running balance per user, counted from p_start with an opening balance of zero (before any filter is applied)
    select l.id, sum(l.signed_amount) over (partition by l.user_id order by l.transaction_date, l.id) as run
      from public.v_ledger l
     where p_start is not null and l.transaction_date >= p_start
  ), f as (
    select l.*, p.first_name, p.last_name, p.email, c.run
      from public.v_ledger l join public.profiles p on p.id = l.user_id
      left join chain c on c.id = l.id
     where (p_start is null or l.transaction_date >= p_start)
       and (p_from is null or l.transaction_date >= p_from)
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
        'amount', amount, 'signedAmount', signed_amount,
        'balanceBefore', case when run is not null then run - signed_amount else balance_before end,
        'balanceAfter', case when run is not null then run else balance_after end,
        'description', description, 'walletAddress', wallet_address, 'network', network, 'adminComment', admin_comment)
        order by transaction_date desc, id) from page), '[]'::jsonb)
  ) into out;
  return out;
end $$;

revoke all on function public.fn_admin_ledger(uuid, timestamptz, timestamptz, text[], text[], uuid, text, numeric, numeric, integer, integer, timestamptz) from public, anon, authenticated;
grant execute on function public.fn_admin_ledger(uuid, timestamptz, timestamptz, text[], text[], uuid, text, numeric, numeric, integer, integer, timestamptz) to service_role;

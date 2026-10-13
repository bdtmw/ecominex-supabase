-- A user's own ledger: every money movement on their account, newest first, with the balance after each entry.
-- Only ever returns rows for p_user; the API passes the logged-in user's id, never a client-supplied one.
create or replace function public.fn_user_ledger(
  p_user uuid, p_start timestamptz default null, p_categories text[] default null,
  p_limit integer default 25, p_offset integer default 0)
returns jsonb language plpgsql security definer set search_path = public as $$
declare out jsonb;
begin
  if p_user is null then raise exception 'User required' using errcode = 'P0001'; end if;
  p_limit := least(greatest(coalesce(p_limit, 25), 1), 200);
  p_offset := greatest(coalesce(p_offset, 0), 0);

  with f as (
    select l.* from public.v_ledger l
     where l.user_id = p_user
       and (p_start is null or l.transaction_date >= p_start)
       and (p_categories is null or l.category = any (p_categories))
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
    'balance', coalesce((select total_balance from public.balances where user_id = p_user), 0),
    'rows', coalesce((select jsonb_agg(jsonb_build_object(
        'id', id, 'date', transaction_date, 'type', type, 'typeLabel', type_label, 'category', category,
        'direction', direction, 'status', status, 'amount', amount, 'signedAmount', signed_amount,
        'balanceAfter', balance_after, 'description', description, 'walletAddress', wallet_address, 'network', network)
        order by transaction_date desc, id) from page), '[]'::jsonb)
  ) into out;
  return out;
end $$;

revoke all on function public.fn_user_ledger(uuid, timestamptz, text[], integer, integer) from public, anon, authenticated;
grant execute on function public.fn_user_ledger(uuid, timestamptz, text[], integer, integer) to service_role;

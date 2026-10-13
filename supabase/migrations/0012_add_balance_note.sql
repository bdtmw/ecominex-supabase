-- Admin "Add balance" now takes an optional note (e.g. "Binance Pay, TX 8f2…") that is stored on the ledger entry,
-- and returns the user's new balance. Amount limit: at most 1,000,000 per entry.
drop function if exists public.fn_admin_add_balance(uuid, uuid, numeric);

create or replace function public.fn_admin_add_balance(p_admin uuid, p_user uuid, p_amount numeric, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare b public.balances; tx public.transactions; note text := nullif(left(trim(coalesce(p_note, '')), 200), '');
begin
  if not public._is_admin_user(p_admin) then raise exception 'Only admins can do this!' using errcode = '42501'; end if;
  if p_amount is null or p_amount <= 0 or p_amount > 1000000 then raise exception 'Invalid amount' using errcode = 'P0001'; end if;
  if not exists (select 1 from public.profiles where id = p_user) then
    raise exception 'User not found' using errcode = 'P0002';
  end if;

  b := public._ensure_balance(p_user);
  update public.balances set admin_add = admin_add + p_amount, last_updated = now() where user_id = p_user;
  insert into public.transactions (user_id, amount, type, status, details, processed_by, processed_at,
                                   balance_before, balance_after)
  values (p_user, p_amount, 'ADMIN_ADD', 'approved',
          case when note is null then format('Admin balance add: $%s', p_amount) else format('Admin balance add: $%s · %s', p_amount, note) end,
          p_admin, now(), b.total_balance, b.total_balance + p_amount)
  returning * into tx;
  return to_jsonb(tx) || jsonb_build_object('newBalance', b.total_balance + p_amount);
end $$;

revoke all on function public.fn_admin_add_balance(uuid, uuid, numeric, text) from public, anon, authenticated;
grant execute on function public.fn_admin_add_balance(uuid, uuid, numeric, text) to service_role;

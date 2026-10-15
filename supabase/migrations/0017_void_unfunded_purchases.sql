-- Cancels the purchases that were made with money that has no record behind it, and puts the user's balance back in
-- line with their records. ONE user at a time, preview first:
--   select * from public.fn_void_unfunded_purchases('<user uuid>', false);   -- preview, changes nothing
--   select * from public.fn_void_unfunded_purchases('<user uuid>', true);    -- apply
--
-- Method: walk the user's ledger in date order with a running balance that starts at zero and counts only recorded,
-- money-moving entries. Any "Balance correction" entries are removed first (they were only a record of the unrecorded
-- money); a full copy of every removed row is kept in public.purchase_void_log.snapshot.
-- A share/machine purchase that the running balance could not pay for is VOIDED: its transaction becomes 'rejected'
-- with a note (it stays visible in the ledger but moves no money); the share purchase becomes 'cancelled' and its shares
-- are free again. The user's balance is then set to what their records support.
alter table public.share_purchases drop constraint if exists share_purchases_status_check;
alter table public.share_purchases add constraint share_purchases_status_check check (status in ('active', 'inactive', 'cancelled'));

create table if not exists public.purchase_void_log (
  id                bigserial primary key,
  user_id           uuid not null references public.profiles (id) on delete cascade,
  voided_at         timestamptz not null default now(),
  action            text not null,
  transaction_id    uuid, share_purchase_id uuid,
  amount            numeric(20, 4), shares integer,
  balance_before    numeric(20, 4), balance_after numeric(20, 4),
  note              text,
  snapshot          jsonb
);
alter table public.purchase_void_log enable row level security;
revoke all on public.purchase_void_log from public, anon, authenticated;
grant all on public.purchase_void_log to service_role;
grant usage, select on sequence public.purchase_void_log_id_seq to service_role;

drop function if exists public.fn_void_unfunded_purchases(uuid, boolean);
create or replace function public.fn_void_unfunded_purchases(p_user uuid, p_apply boolean default false)
returns table (step text, detail text, amount numeric, balance_before numeric, balance_after numeric)
language plpgsql security definer set search_path = public as $$
declare
  r record; run numeric := 0; bal_before numeric; final_bal numeric; sp record; n_adj numeric;
  v_ids uuid[] := '{}'; v_amounts numeric[] := '{}'; v_dates timestamptz[] := '{}';
begin
  if p_user is null or not exists (select 1 from public.profiles where id = p_user) then
    raise exception 'User not found' using errcode = 'P0002';
  end if;
  select total_balance into bal_before from public.balances where user_id = p_user;
  bal_before := coalesce(bal_before, 0);

  select coalesce(sum(t.amount), 0) into n_adj from public.transactions t where t.user_id = p_user and t.type = 'ADJUSTMENT';
  if n_adj > 0 then
    return query select 'remove correction'::text, 'Balance correction entries (the record of the unrecorded money)'::text, n_adj, null::numeric, null::numeric;
  end if;

  -- walk the recorded history
  for r in
    select l.id, l.type, l.status, l.amount, l.signed_amount, l.transaction_date, l.description
      from public.v_ledger l where l.user_id = p_user and l.type <> 'ADJUSTMENT'
     order by l.transaction_date, l.id
  loop
    if r.type in ('SHARE_PURCHASE', 'MACHINE_PURCHASE') and r.status = 'completed' and run + r.signed_amount < -0.005 then
      v_ids := v_ids || r.id; v_amounts := v_amounts || r.amount; v_dates := v_dates || r.transaction_date;
      return query select 'void purchase'::text,
                          (coalesce(r.description, r.type) || ' on ' || to_char(r.transaction_date, 'YYYY-MM-DD HH24:MI:SS') || ' (recorded balance then: ' || round(run, 2) || ')')::text,
                          r.amount, run, run;
    else
      run := run + r.signed_amount;
    end if;
  end loop;
  final_bal := greatest(0, run);
  return query select 'new balance'::text,
                      ('what the records support after the voids' || case when run < 0 then ' (negative: floored at 0, review this user)' else '' end)::text,
                      final_bal, bal_before, final_bal;

  if not p_apply then return; end if;

  -- 1. remove the correction entries (a full copy is kept)
  insert into public.purchase_void_log (user_id, action, amount, balance_before, note, snapshot)
  select p_user, 'removed correction', t.amount, bal_before, 'balance correction removed', to_jsonb(t)
    from public.transactions t where t.user_id = p_user and t.type = 'ADJUSTMENT';
  delete from public.transactions where user_id = p_user and type = 'ADJUSTMENT';

  -- 2. void the unfunded purchases
  for r in select u.id, u.amount, u.dt from unnest(v_ids, v_amounts, v_dates) as u(id, amount, dt) loop
    update public.transactions
       set status = 'rejected', admin_comment = 'Voided: this purchase was not funded by any recorded balance',
           details = coalesce(details, '') || ' [cancelled: not funded by a recorded balance]'
     where id = r.id;
    sp := null;
    select s.id, s.number_of_shares into sp from public.share_purchases s
     where s.user_id = p_user and s.status = 'active' and s.total_investment = r.amount
       and abs(extract(epoch from (s.purchase_date - r.dt))) < 5
     order by abs(extract(epoch from (s.purchase_date - r.dt))) limit 1;
    if sp.id is not null then
      update public.share_purchases set status = 'cancelled', updated_at = now() where id = sp.id;
    end if;
    insert into public.purchase_void_log (user_id, action, transaction_id, share_purchase_id, amount, shares, balance_before, balance_after, note)
    values (p_user, 'voided purchase', r.id, sp.id, r.amount, sp.number_of_shares, bal_before, final_bal, 'purchase not funded by a recorded balance');
  end loop;

  -- 3. the balance follows the records (money of profit type sits in the mining balance, which withdrawals use first)
  insert into public.balances (user_id) values (p_user) on conflict (user_id) do nothing;
  update public.balances set admin_add = 0, mining_balance = final_bal, last_updated = now() where user_id = p_user;

  -- 4. running balances on every entry follow
  perform public.fn_rebuild_transaction_balances();
end $$;

revoke all on function public.fn_void_unfunded_purchases(uuid, boolean) from public, anon, authenticated;
grant execute on function public.fn_void_unfunded_purchases(uuid, boolean) to service_role;

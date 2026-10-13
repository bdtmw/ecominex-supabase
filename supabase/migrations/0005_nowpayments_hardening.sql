-- NOWPayments hardening.
--
-- Bug fixed: fn_apply_nowpayments let a *late* 'confirming' notification overwrite an already
-- 'finished' status, after which a *retried* 'finished' credited the same deposit a second time.
-- Providers retry and deliver out of order, so credit-once must not depend on the status column.
--
-- Now: (1) a deposit is credited at most once, recorded in credited_at; (2) the database refuses a
-- second ADMIN_ADD ledger entry for the same deposit; (3) once credited the status is final;
-- (4) the amount credited is what we invoiced, and a provider/invoice mismatch is held for review;
-- (5) partial payments and refunds are flagged for an admin instead of silently ignored.

alter table public.deposits add column if not exists credited_at timestamptz;
alter table public.deposits add column if not exists review_note text;

-- deposits the old function already credited
update public.deposits set credited_at = coalesce(updated_at, now())
 where payment_provider = 'nowpayments' and payment_status = 'finished' and credited_at is null;

-- backstop: one credit entry per deposit, enforced by the database itself
create unique index if not exists transactions_one_credit_per_deposit
  on public.transactions ((metadata->>'depositId'))
  where type = 'ADMIN_ADD' and metadata ? 'depositId';

create index if not exists deposits_review_idx on public.deposits (created_at desc) where review_note is not null;
create index if not exists deposits_status_idx on public.deposits (payment_provider, payment_status, created_at desc);

create or replace function public.fn_apply_nowpayments(
  p_deposit uuid, p_payment_id text, p_invoice_id text, p_status text,
  p_pay_currency text, p_actually_paid numeric, p_amount numeric, p_raw jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  d public.deposits;
  b public.balances;
  st text := lower(coalesce(trim(p_status), ''));
begin
  select * into d from public.deposits where id = p_deposit for update;
  -- a manual deposit can never be driven by a provider callback
  if not found or d.payment_provider <> 'nowpayments' then
    raise exception 'Deposit not found' using errcode = 'P0002';
  end if;

  -- Already credited: the outcome is final. Late or repeated notifications are stored, never re-applied.
  if d.credited_at is not null then
    update public.deposits set now_payments_raw = p_raw, updated_at = now(),
           now_payments_payment_id = coalesce(now_payments_payment_id, p_payment_id)
     where id = d.id;
    if st = 'refunded' then
      update public.deposits set payment_status = 'refunded',
             review_note = 'NOWPayments refunded this payment after it was credited. Check the user''s balance.'
       where id = d.id;
      return jsonb_build_object('credited', false, 'duplicate', true, 'flagged', true);
    end if;
    return jsonb_build_object('credited', false, 'duplicate', true);
  end if;

  update public.deposits set
    now_payments_payment_id = coalesce(p_payment_id, now_payments_payment_id),
    now_payments_invoice_id = coalesce(p_invoice_id, now_payments_invoice_id),
    payment_status = coalesce(nullif(st, ''), payment_status),
    pay_currency = coalesce(p_pay_currency, pay_currency),
    actually_paid = coalesce(p_actually_paid, actually_paid),
    now_payments_raw = p_raw, updated_at = now()
  where id = d.id;

  if st = 'finished' then
    -- the provider's price must equal what we invoiced; otherwise hold for a human
    if p_amount is not null and abs(p_amount - d.amount) > 0.01 then
      update public.deposits set payment_status = 'review',
             review_note = format('Provider reported a price of %s but the invoice was for %s. Not credited.', p_amount, d.amount)
       where id = d.id;
      return jsonb_build_object('credited', false, 'flagged', true);
    end if;

    b := public._ensure_balance(d.user_id);
    update public.balances set admin_add = admin_add + d.amount, last_updated = now() where user_id = d.user_id;
    insert into public.transactions (user_id, amount, type, status, details, balance_before, balance_after, processed_at, metadata)
    values (d.user_id, d.amount, 'ADMIN_ADD', 'approved',
            format('NOWPayments deposit approved. Payment ID: %s', coalesce(p_payment_id, d.now_payments_payment_id)),
            b.total_balance, b.total_balance + d.amount, now(),
            jsonb_build_object('depositId', d.id, 'provider', 'nowpayments', 'paymentId', coalesce(p_payment_id, d.now_payments_payment_id)));
    update public.deposits set credited_at = now(), review_note = null where id = d.id;
    return jsonb_build_object('credited', true, 'amount', d.amount);
  end if;

  if st = 'partially_paid' then
    update public.deposits set
      review_note = format('Partially paid: received %s of %s. Not credited. Contact the user or NOWPayments.', coalesce(p_actually_paid, 0), d.amount)
    where id = d.id;
    return jsonb_build_object('credited', false, 'flagged', true);
  end if;

  return jsonb_build_object('credited', false);
end $$;

revoke all on function public.fn_apply_nowpayments(uuid, text, text, text, text, numeric, numeric, jsonb) from public, anon, authenticated;
grant execute on function public.fn_apply_nowpayments(uuid, text, text, text, text, numeric, numeric, jsonb) to service_role;

-- ------------------------------------------------------------------ admin view of deposits
create or replace function public.fn_admin_deposits(
  p_admin uuid, p_provider text default null, p_statuses text[] default null, p_review boolean default false,
  p_search text default null, p_limit integer default 25, p_offset integer default 0)
returns jsonb language plpgsql security definer set search_path = public as $$
declare q text := lower(coalesce(trim(p_search), '')); out jsonb;
begin
  if not public._is_admin_user(p_admin) then raise exception 'Only admins can do this!' using errcode = '42501'; end if;
  p_limit := least(greatest(coalesce(p_limit, 25), 1), 200);
  p_offset := greatest(coalesce(p_offset, 0), 0);

  with f as (
    select d.*, p.first_name, p.last_name, p.email
      from public.deposits d join public.profiles p on p.id = d.user_id
     where (p_provider is null or d.payment_provider = p_provider)
       and (p_statuses is null or d.payment_status = any (p_statuses))
       and (not coalesce(p_review, false) or d.review_note is not null)
       and (q = '' or position(q in lower(concat_ws(' ', p.first_name, p.last_name, p.email, d.transaction_id,
              d.now_payments_payment_id, d.now_payments_invoice_id, d.id::text))) > 0)
  ), page as (
    select * from f order by created_at desc, id limit p_limit offset p_offset
  ), counts as (
    select count(*) as all_n,
           count(*) filter (where review_note is not null) as review_n,
           count(*) filter (where payment_provider = 'nowpayments' and credited_at is null
                              and payment_status in ('waiting', 'confirming', 'confirmed', 'sending')) as in_progress_n,
           count(*) filter (where payment_provider = 'manual') as manual_n,
           count(*) filter (where credited_at is not null) as credited_n
      from public.deposits
  )
  select jsonb_build_object(
    'total', (select count(*) from f),
    'counts', (select jsonb_build_object('all', all_n, 'review', review_n, 'inProgress', in_progress_n, 'manual', manual_n, 'credited', credited_n) from counts),
    'rows', coalesce((select jsonb_agg(jsonb_build_object(
        'id', id, 'userId', user_id, 'userName', nullif(trim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')), ''), 'userEmail', email,
        'amount', amount, 'provider', payment_provider, 'status', payment_status, 'payCurrency', pay_currency,
        'actuallyPaid', actually_paid, 'invoiceUrl', invoice_url, 'reference', transaction_id,
        'paymentId', now_payments_payment_id, 'createdAt', created_at, 'updatedAt', updated_at,
        'creditedAt', credited_at, 'reviewNote', review_note, 'attachments', to_jsonb(attachment))
        order by created_at desc, id) from page), '[]'::jsonb)
  ) into out;
  return out;
end $$;

revoke all on function public.fn_admin_deposits(uuid, text, text[], boolean, text, integer, integer) from public, anon, authenticated;
grant execute on function public.fn_admin_deposits(uuid, text, text[], boolean, text, integer, integer) to service_role;

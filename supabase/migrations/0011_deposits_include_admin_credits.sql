-- The admin Deposits list now also includes the money admins credited to users directly (transactions of type ADMIN_ADD,
-- which is how every deposit was recorded before NOWPayments). Credits that came from a NOWPayments deposit carry the
-- deposit's id in their metadata and are NOT listed twice. provider = 'admin' for these rows; they are always "approved".
drop function if exists public.fn_admin_deposits(uuid, text, text[], boolean, text, integer, integer, uuid);

create or replace function public.fn_admin_deposits(
  p_admin uuid, p_provider text default null, p_statuses text[] default null, p_review boolean default false,
  p_search text default null, p_limit integer default 25, p_offset integer default 0, p_user uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare q text := lower(coalesce(trim(p_search), '')); out jsonb;
begin
  if not public._is_admin_user(p_admin) then raise exception 'Only admins can do this!' using errcode = '42501'; end if;
  p_limit := least(greatest(coalesce(p_limit, 25), 1), 200);
  p_offset := greatest(coalesce(p_offset, 0), 0);

  with u as (
    select d.id, d.user_id, d.amount, d.payment_provider as provider, d.payment_status as status, d.pay_currency,
           d.actually_paid, d.invoice_url, d.transaction_id as reference, d.now_payments_payment_id as payment_id,
           d.now_payments_invoice_id as invoice_id, d.created_at, d.updated_at, d.credited_at, d.review_note,
           d.attachment, null::text as description
      from public.deposits d
    union all
    select t.id, t.user_id, t.amount, 'admin', 'approved', null::text,
           null::numeric, null::text, null::text, null::text,
           null::text, t.transaction_date, t.transaction_date, t.transaction_date, null::text,
           '{}'::text[], coalesce(nullif(t.details, ''), 'Admin balance add')
      from public.transactions t
     where t.type = 'ADMIN_ADD' and not (t.metadata ? 'depositId')
  ), mine as (
    select * from u where p_user is null or user_id = p_user
  ), f as (
    select m.*, p.first_name, p.last_name, p.email
      from mine m join public.profiles p on p.id = m.user_id
     where (p_provider is null or m.provider = p_provider)
       and (p_statuses is null or m.status = any (p_statuses))
       and (not coalesce(p_review, false) or m.review_note is not null)
       and (q = '' or position(q in lower(concat_ws(' ', p.first_name, p.last_name, p.email, m.reference,
              m.payment_id, m.invoice_id, m.description, m.id::text))) > 0)
  ), page as (
    select * from f order by created_at desc, id limit p_limit offset p_offset
  ), counts as (
    select count(*) as all_n,
           count(*) filter (where review_note is not null) as review_n,
           count(*) filter (where provider = 'nowpayments' and credited_at is null
                              and status in ('waiting', 'confirming', 'confirmed', 'sending')) as in_progress_n,
           count(*) filter (where provider = 'manual') as manual_n,
           count(*) filter (where provider = 'admin') as admin_n,
           count(*) filter (where credited_at is not null) as credited_n
      from mine
  ), sums as (
    select coalesce(sum(amount) filter (where credited_at is not null or status in ('approved', 'finished')), 0) as credited_amount,
           coalesce(sum(amount), 0) as requested_amount
      from f
  )
  select jsonb_build_object(
    'total', (select count(*) from f),
    'counts', (select jsonb_build_object('all', all_n, 'review', review_n, 'inProgress', in_progress_n, 'manual', manual_n, 'admin', admin_n, 'credited', credited_n) from counts),
    'sums', (select jsonb_build_object('credited', credited_amount, 'requested', requested_amount) from sums),
    'rows', coalesce((select jsonb_agg(jsonb_build_object(
        'id', id, 'userId', user_id, 'userName', nullif(trim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')), ''), 'userEmail', email,
        'amount', amount, 'provider', provider, 'status', status, 'payCurrency', pay_currency,
        'actuallyPaid', actually_paid, 'invoiceUrl', invoice_url, 'reference', reference,
        'paymentId', payment_id, 'createdAt', created_at, 'updatedAt', updated_at,
        'creditedAt', credited_at, 'reviewNote', review_note, 'description', description, 'attachments', to_jsonb(attachment))
        order by created_at desc, id) from page), '[]'::jsonb)
  ) into out;
  return out;
end $$;

revoke all on function public.fn_admin_deposits(uuid, text, text[], boolean, text, integer, integer, uuid) from public, anon, authenticated;
grant execute on function public.fn_admin_deposits(uuid, text, text[], boolean, text, integer, integer, uuid) to service_role;

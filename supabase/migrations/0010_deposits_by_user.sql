-- Admin deposits: filter by one user (p_user), tab counts scoped to that user, and the amounts credited / requested in view.
drop function if exists public.fn_admin_deposits(uuid, text, text[], boolean, text, integer, integer);

create or replace function public.fn_admin_deposits(
  p_admin uuid, p_provider text default null, p_statuses text[] default null, p_review boolean default false,
  p_search text default null, p_limit integer default 25, p_offset integer default 0, p_user uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare q text := lower(coalesce(trim(p_search), '')); out jsonb;
begin
  if not public._is_admin_user(p_admin) then raise exception 'Only admins can do this!' using errcode = '42501'; end if;
  p_limit := least(greatest(coalesce(p_limit, 25), 1), 200);
  p_offset := greatest(coalesce(p_offset, 0), 0);

  with f as (
    select d.*, p.first_name, p.last_name, p.email
      from public.deposits d join public.profiles p on p.id = d.user_id
     where (p_user is null or d.user_id = p_user)
       and (p_provider is null or d.payment_provider = p_provider)
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
      from public.deposits where p_user is null or user_id = p_user
  ), sums as (
    select coalesce(sum(amount) filter (where credited_at is not null or payment_status in ('approved', 'finished')), 0) as credited_amount,
           coalesce(sum(amount), 0) as requested_amount
      from f
  )
  select jsonb_build_object(
    'total', (select count(*) from f),
    'counts', (select jsonb_build_object('all', all_n, 'review', review_n, 'inProgress', in_progress_n, 'manual', manual_n, 'credited', credited_n) from counts),
    'sums', (select jsonb_build_object('credited', credited_amount, 'requested', requested_amount) from sums),
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

revoke all on function public.fn_admin_deposits(uuid, text, text[], boolean, text, integer, integer, uuid) from public, anon, authenticated;
grant execute on function public.fn_admin_deposits(uuid, text, text[], boolean, text, integer, integer, uuid) to service_role;

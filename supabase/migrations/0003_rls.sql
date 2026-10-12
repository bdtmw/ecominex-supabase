-- Row Level Security: defence in depth. The API uses the service role (which
-- bypasses RLS) after authorising each request itself; these policies make sure
-- that anything using the anon/authenticated keys directly can only read what
-- it owns and can never write.

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

alter table public.profiles        enable row level security;
alter table public.otp_codes       enable row level security;
alter table public.password_resets enable row level security;
alter table public.mining_machines enable row level security;
alter table public.user_machines   enable row level security;
alter table public.share_purchases enable row level security;
alter table public.balances        enable row level security;
alter table public.transactions    enable row level security;
alter table public.deposits        enable row level security;
alter table public.contacts        enable row level security;

-- otp_codes / password_resets / contacts: no policies => no access except service role.

create policy profiles_select on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());

create policy machines_select_all on public.mining_machines
  for select to anon, authenticated using (true);

create policy user_machines_select on public.user_machines
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

create policy share_purchases_select on public.share_purchases
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

create policy balances_select on public.balances
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

create policy transactions_select on public.transactions
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

create policy deposits_select on public.deposits
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- Never expose write access or the security-definer functions to client roles.
revoke insert, update, delete on all tables in schema public from anon, authenticated;
-- Anonymous visitors may only read the public machine catalogue.
revoke all on all tables in schema public from anon;
grant select on public.mining_machines to anon;
revoke all on all functions in schema public from public, anon, authenticated;
grant execute on function public.is_admin() to authenticated;

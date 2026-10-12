-- One-shot setup: paste this whole file into the Supabase SQL editor and run it ONCE on a new project.
-- (It is 0001 + 0002 + 0003 + seed.sql concatenated; regenerate with scripts/build-setup-sql.sh)

-- ======== supabase/migrations/0001_schema.sql ========
-- Ecominex schema (ported from the MongoDB models).
-- All writes go through the Next.js API using the service role key; the browser
-- never talks to these tables directly (see 0003_rls.sql).

create table public.profiles (
  id                 uuid primary key references auth.users (id) on delete cascade,
  first_name         text not null,
  last_name          text not null,
  email              text not null,
  phone_number       text not null,
  country            text not null,
  role               text not null default 'user' check (role in ('user', 'admin')),
  referral_code      text unique,
  referred_by        uuid references public.profiles (id) on delete set null,
  referral_status    text,
  deposit_count      integer,
  discount           numeric(20, 4) not null default 0,
  two_factor_enabled boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create unique index profiles_email_key on public.profiles (lower(email));
create index profiles_referred_by_idx on public.profiles (referred_by);

-- One-time codes for email verification and 2FA login (stored hashed).
create table public.otp_codes (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  purpose    text not null check (purpose in ('signup', 'login')),
  code_hash  text not null,
  expires_at timestamptz not null,
  attempts   integer not null default 0,
  primary key (user_id, purpose)
);

create table public.password_resets (
  token_hash text primary key,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  expires_at timestamptz not null
);

create table public.mining_machines (
  id                uuid primary key default gen_random_uuid(),
  machine_name      text not null,
  hashrate          text not null,
  power_consumption numeric(20, 4) not null,
  price_range       numeric(20, 4) not null check (price_range >= 0),
  coins_mined       text not null,
  monthly_profit    numeric(20, 4) not null check (monthly_profit >= 0),
  description       text not null,
  images            text[] not null default '{}',
  is_share_based    boolean not null default false,
  share_price       numeric(20, 4) not null default 50,
  total_shares      integer not null default 380,
  available_shares  integer not null default 380,
  profit_per_share  numeric(20, 4) not null default 9.21,
  created_at        timestamptz not null default now()
);

create table public.user_machines (
  id                         uuid primary key default gen_random_uuid(),
  user_id                    uuid not null references public.profiles (id) on delete cascade,
  machine_id                 uuid references public.mining_machines (id) on delete set null,
  assigned_date              timestamptz not null default now(),
  status                     text not null default 'active' check (status in ('active', 'inactive')),
  monthly_profit_accumulated numeric(20, 4) not null default 0,
  last_profit_update         timestamptz,
  -- details copied from the catalog at assignment time
  machine_name               text not null,
  hashrate                   text not null,
  power_consumption          numeric(20, 4) not null,
  price_range                numeric(20, 4) not null,
  coins_mined                text not null,
  monthly_profit             numeric(20, 4) not null,
  description                text not null,
  images                     text[] not null default '{}',
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now()
);
create index user_machines_user_idx on public.user_machines (user_id);

create table public.share_purchases (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles (id) on delete cascade,
  machine_id         uuid not null references public.mining_machines (id) on delete restrict,
  number_of_shares   integer not null check (number_of_shares >= 1),
  price_per_share    numeric(20, 4) not null,
  profit_per_share   numeric(20, 4) not null,
  total_investment   numeric(20, 4) not null,
  purchase_date      timestamptz not null default now(),
  last_profit_update timestamptz not null default now(),
  status             text not null default 'active' check (status in ('active', 'inactive')),
  total_profit_earned numeric(20, 4) not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index share_purchases_user_idx on public.share_purchases (user_id);
create index share_purchases_machine_idx on public.share_purchases (machine_id) where status = 'active';

-- Balances can never go negative.
create table public.balances (
  user_id        uuid primary key references public.profiles (id) on delete cascade,
  admin_add      numeric(20, 4) not null default 0 check (admin_add >= 0),
  mining_balance numeric(20, 4) not null default 0 check (mining_balance >= 0),
  total_balance  numeric(20, 4) generated always as (admin_add + mining_balance) stored,
  last_updated   timestamptz not null default now()
);

create table public.transactions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete cascade,
  amount           numeric(20, 4) not null,
  type             text not null check (type in (
                     'withdrawal', 'profit', 'MACHINE_PURCHASE', 'MACHINE_SALE',
                     'SHARE_PURCHASE', 'SHARE_PROFIT', 'SHARE_SALE', 'ADMIN_ADD')),
  status           text not null default 'pending'
                     check (status in ('pending', 'approved', 'rejected', 'completed')),
  wallet_address   text,
  network          text,
  balance_before   numeric(20, 4),
  balance_after    numeric(20, 4),
  admin_comment    text,
  processed_by     uuid references public.profiles (id) on delete set null,
  processed_at     timestamptz,
  details          text,
  metadata         jsonb not null default '{}'::jsonb,
  transaction_date timestamptz not null default now(),
  created_at       timestamptz not null default now()
);
create index transactions_user_idx on public.transactions (user_id, transaction_date desc);
create index transactions_pending_withdrawals_idx
  on public.transactions (transaction_date desc) where type = 'withdrawal' and status = 'pending';

create table public.deposits (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references public.profiles (id) on delete cascade,
  amount                    numeric(20, 4) not null,
  transaction_id            text not null,
  account_type              text not null,
  attachment                text[] not null default '{}',
  date_time                 timestamptz not null default now(),
  payment_provider          text not null default 'manual' check (payment_provider in ('manual', 'nowpayments')),
  payment_status            text not null default 'pending',
  pay_currency              text,
  actually_paid             numeric(30, 10),
  now_payments_invoice_id   text,
  now_payments_payment_id   text,
  invoice_url               text,
  now_payments_raw          jsonb,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);
create index deposits_user_idx on public.deposits (user_id, created_at desc);

create table public.contacts (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  phone      text not null,
  country    text not null,
  comment    text not null,
  status     text not null default 'pending' check (status in ('pending', 'read', 'archived')),
  read_by    uuid references public.profiles (id) on delete set null,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

-- Public bucket for machine images / deposit proofs are served via signed or public URLs.
insert into storage.buckets (id, name, public)
values ('machine-images', 'machine-images', true)
on conflict (id) do nothing;
insert into storage.buckets (id, name, public)
values ('deposit-proofs', 'deposit-proofs', false)
on conflict (id) do nothing;

-- ======== supabase/migrations/0002_functions.sql ========
-- Atomic money operations. Every function runs in a single transaction, takes row
-- locks on the rows it changes, and raises:
--   P0001  business rule violated (HTTP 400)
--   P0002  not found / not yours   (HTTP 404)
--   42501  forbidden               (HTTP 403)
-- They are SECURITY DEFINER and only executable by the service role.

create or replace function public._ensure_balance(p_user uuid)
returns public.balances language plpgsql as $$
declare b public.balances;
begin
  insert into public.balances (user_id) values (p_user) on conflict (user_id) do nothing;
  select * into b from public.balances where user_id = p_user for update;
  return b;
end $$;

create or replace function public._is_admin_user(p_user uuid)
returns boolean language sql stable as $$
  select exists (select 1 from public.profiles where id = p_user and role = 'admin');
$$;

-- ---------------------------------------------------------------- machines
create or replace function public.fn_purchase_machine(p_user uuid, p_machine uuid, p_quantity integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  m public.mining_machines;
  b public.balances;
  cost numeric;
  prev_purchases integer;
  pct numeric;
  bonus numeric;
  tx_id uuid;
  referrer uuid;
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
  -- purchases are paid from deposited funds only, never from mining profit
  if b.admin_add < cost then raise exception 'Insufficient balance' using errcode = 'P0001'; end if;

  select count(*) into prev_purchases from public.transactions
   where user_id = p_user and type = 'MACHINE_PURCHASE' and status = 'completed';

  insert into public.transactions (user_id, amount, type, status, balance_before, balance_after, metadata)
  values (p_user, cost, 'MACHINE_PURCHASE', 'completed', b.total_balance, b.total_balance - cost,
          jsonb_build_object('machineId', m.id, 'machineName', m.machine_name,
                             'quantity', p_quantity, 'pricePerUnit', m.price_range))
  returning id into tx_id;

  update public.balances set admin_add = admin_add - cost, last_updated = now() where user_id = p_user;

  -- first purchase 10%, afterwards 2%
  pct := case when prev_purchases = 0 then 0.10 else 0.02 end;
  bonus := round(cost * pct, 2);

  update public.profiles
     set referral_status = 'active', discount = discount + bonus, updated_at = now()
   where id = p_user
  returning referred_by into referrer;

  if referrer is not null then
    perform public._ensure_balance(referrer);
    update public.balances set admin_add = admin_add + bonus, last_updated = now() where user_id = referrer;
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

create or replace function public.fn_sell_user_machine(p_actor uuid, p_user_machine uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  um public.user_machines;
  b public.balances;
  original numeric;
  selling numeric;
  deduction numeric;
  tx public.transactions;
begin
  select * into um from public.user_machines where id = p_user_machine for update;
  -- same answer for "missing" and "not yours"
  if not found or (um.user_id <> p_actor and not public._is_admin_user(p_actor)) then
    raise exception 'User machine not found' using errcode = 'P0002';
  end if;
  if um.status <> 'active' then raise exception 'Cannot sell inactive machine' using errcode = 'P0001'; end if;

  -- priced at what was recorded at assignment, not today's catalogue price
  original := um.price_range;
  selling := original * 0.9;
  deduction := original * 0.1;

  b := public._ensure_balance(um.user_id);

  insert into public.transactions (user_id, amount, type, status, balance_before, balance_after, metadata)
  values (um.user_id, selling, 'MACHINE_SALE', 'completed', b.total_balance, b.total_balance + selling,
          jsonb_build_object('machineId', um.machine_id, 'machineName', um.machine_name,
                             'originalPrice', original, 'deduction', deduction, 'sellingPrice', selling))
  returning * into tx;

  update public.balances set admin_add = admin_add + selling, last_updated = now() where user_id = um.user_id;
  update public.user_machines set status = 'inactive', updated_at = now() where id = um.id;

  return jsonb_build_object('originalPrice', original, 'deduction', deduction, 'sellingPrice', selling,
                            'machineName', um.machine_name, 'machineId', um.machine_id,
                            'transaction', to_jsonb(tx),
                            'balance', (select to_jsonb(x) from public.balances x where x.user_id = um.user_id));
end $$;

-- ------------------------------------------------------------------ shares
create or replace function public.fn_purchase_shares(p_user uuid, p_shares integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  m public.mining_machines;
  b public.balances;
  sold integer;
  available integer;
  cost numeric;
  sp public.share_purchases;
  tx public.transactions;
begin
  if p_shares is null or p_shares < 1 then
    raise exception 'A valid number of shares is required' using errcode = 'P0001';
  end if;

  -- the lock serialises concurrent purchases so the cap cannot be oversold
  select * into m from public.mining_machines
   where is_share_based and price_range = 19000 and share_price = 50
   order by created_at limit 1 for update;
  if not found then raise exception 'Special share machine not found' using errcode = 'P0002'; end if;

  select coalesce(sum(number_of_shares), 0) into sold from public.share_purchases
   where machine_id = m.id and status = 'active';
  available := m.total_shares - sold;
  if p_shares > available then
    raise exception 'Only % shares available for purchase', available using errcode = 'P0001';
  end if;

  b := public._ensure_balance(p_user);
  cost := m.share_price * p_shares;
  if b.admin_add < cost then raise exception 'Insufficient balance' using errcode = 'P0001'; end if;

  insert into public.share_purchases (user_id, machine_id, number_of_shares, price_per_share,
                                      profit_per_share, total_investment)
  values (p_user, m.id, p_shares, m.share_price, m.profit_per_share, cost)
  returning * into sp;

  insert into public.transactions (user_id, amount, type, status, balance_before, balance_after, details, metadata)
  values (p_user, cost, 'SHARE_PURCHASE', 'completed', b.total_balance, b.total_balance - cost,
          format('Purchased %s shares of %s', p_shares, m.machine_name),
          jsonb_build_object('machineId', m.id, 'machineName', m.machine_name,
                             'shares', p_shares, 'pricePerShare', m.share_price))
  returning * into tx;

  update public.balances set admin_add = admin_add - cost, last_updated = now() where user_id = p_user;

  return jsonb_build_object('purchase', to_jsonb(sp), 'transaction', to_jsonb(tx),
                            'newBalance', b.total_balance - cost,
                            'expectedMonthlyProfit', m.profit_per_share * p_shares);
end $$;

create or replace function public.fn_sell_shares(p_actor uuid, p_purchase uuid, p_shares integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  sp public.share_purchases;
  m public.mining_machines;
  b public.balances;
  original numeric;
  selling numeric;
  deduction numeric;
  tx public.transactions;
  remaining integer;
begin
  if p_shares is null or p_shares < 1 then
    raise exception 'A valid number of shares to sell is required' using errcode = 'P0001';
  end if;

  select * into sp from public.share_purchases where id = p_purchase for update;
  if not found or (sp.user_id <> p_actor and not public._is_admin_user(p_actor)) then
    raise exception 'Share purchase not found' using errcode = 'P0002';
  end if;
  if sp.status <> 'active' then raise exception 'Cannot sell inactive shares' using errcode = 'P0001'; end if;
  if p_shares > sp.number_of_shares then
    raise exception 'You only own % shares', sp.number_of_shares using errcode = 'P0001';
  end if;

  select * into m from public.mining_machines where id = sp.machine_id;
  original := sp.price_per_share * p_shares;
  selling := original * 0.9;
  deduction := original * 0.1;

  b := public._ensure_balance(sp.user_id);

  insert into public.transactions (user_id, amount, type, status, balance_before, balance_after, details, metadata)
  values (sp.user_id, selling, 'SHARE_SALE', 'completed', b.total_balance, b.total_balance + selling,
          format('Sold %s shares of %s', p_shares, m.machine_name),
          jsonb_build_object('machineId', m.id, 'machineName', m.machine_name, 'shareId', sp.id,
                             'originalShares', sp.number_of_shares, 'soldShares', p_shares,
                             'originalValue', original, 'deduction', deduction, 'sellingPrice', selling))
  returning * into tx;

  update public.balances set admin_add = admin_add + selling, last_updated = now() where user_id = sp.user_id;

  remaining := sp.number_of_shares - p_shares;
  if remaining = 0 then
    update public.share_purchases set status = 'inactive', updated_at = now() where id = sp.id;
  else
    update public.share_purchases
       set number_of_shares = remaining, total_investment = price_per_share * remaining, updated_at = now()
     where id = sp.id;
  end if;

  return jsonb_build_object('originalValue', original, 'deduction', deduction, 'sellingPrice', selling,
                            'soldShares', p_shares, 'remainingShares', remaining,
                            'machineName', m.machine_name, 'machineId', m.id,
                            'transaction', to_jsonb(tx),
                            'balance', (select to_jsonb(x) from public.balances x where x.user_id = sp.user_id));
end $$;

-- ------------------------------------------------------------- withdrawals
create or replace function public.fn_request_withdrawal(p_user uuid, p_amount numeric, p_wallet text, p_network text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  b public.balances;
  pending numeric;
  available numeric;
  tx public.transactions;
begin
  if p_amount is null or p_amount <= 0 then raise exception 'Invalid amount' using errcode = 'P0001'; end if;
  if coalesce(trim(p_wallet), '') = '' or coalesce(trim(p_network), '') = '' then
    raise exception 'Wallet address and network are required' using errcode = 'P0001';
  end if;

  select * into b from public.balances where user_id = p_user for update;
  if not found then raise exception 'Not Enough balance' using errcode = 'P0001'; end if;

  -- funds already committed to other pending withdrawals are not available
  select coalesce(sum(amount), 0) into pending from public.transactions
   where user_id = p_user and type = 'withdrawal' and status = 'pending';
  available := b.total_balance - pending;

  if p_amount > available then
    raise exception 'Withdrawal amount exceeds available balance' using errcode = 'P0001',
      detail = available::text;
  end if;

  insert into public.transactions (user_id, amount, type, status, wallet_address, network,
                                   balance_before, balance_after, details)
  values (p_user, p_amount, 'withdrawal', 'pending', trim(p_wallet), trim(p_network),
          b.total_balance, b.total_balance - p_amount,
          format('Withdrawal request of $%s via %s', p_amount, trim(p_network)))
  returning * into tx;

  return jsonb_build_object('transaction', to_jsonb(tx), 'availableBalance', available - p_amount);
end $$;

create or replace function public.fn_process_withdrawal(p_admin uuid, p_tx uuid, p_action text, p_comment text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  tx public.transactions;
  b public.balances;
  remaining numeric;
  from_mining numeric;
  from_main numeric;
begin
  if p_action not in ('approved', 'rejected') then raise exception 'Invalid action' using errcode = 'P0001'; end if;
  if not public._is_admin_user(p_admin) then raise exception 'Only admins can do this!' using errcode = '42501'; end if;

  select * into tx from public.transactions where id = p_tx for update;
  if not found or tx.type <> 'withdrawal' then
    raise exception 'Transaction not found' using errcode = 'P0002';
  end if;
  if tx.status <> 'pending' then raise exception 'Transaction is no longer pending' using errcode = 'P0001'; end if;

  if p_action = 'approved' then
    b := public._ensure_balance(tx.user_id);
    if tx.amount > b.total_balance then
      raise exception 'Insufficient balance' using errcode = 'P0001', detail = b.total_balance::text;
    end if;
    -- mining profit is used first, then deposited funds
    from_mining := least(b.mining_balance, tx.amount);
    remaining := tx.amount - from_mining;
    from_main := least(b.admin_add, remaining);
    update public.balances
       set mining_balance = mining_balance - from_mining, admin_add = admin_add - from_main, last_updated = now()
     where user_id = tx.user_id;
  end if;

  update public.transactions
     set status = p_action, admin_comment = p_comment, processed_by = p_admin, processed_at = now()
   where id = tx.id returning * into tx;

  return to_jsonb(tx);
end $$;

create or replace function public.fn_admin_add_balance(p_admin uuid, p_user uuid, p_amount numeric)
returns jsonb language plpgsql security definer set search_path = public as $$
declare b public.balances; tx public.transactions;
begin
  if not public._is_admin_user(p_admin) then raise exception 'Only admins can do this!' using errcode = '42501'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Invalid amount' using errcode = 'P0001'; end if;
  if not exists (select 1 from public.profiles where id = p_user) then
    raise exception 'User not found' using errcode = 'P0002';
  end if;

  b := public._ensure_balance(p_user);
  update public.balances set admin_add = admin_add + p_amount, last_updated = now() where user_id = p_user;
  insert into public.transactions (user_id, amount, type, status, details, processed_by, processed_at,
                                   balance_before, balance_after)
  values (p_user, p_amount, 'ADMIN_ADD', 'approved', format('Admin balance add: $%s', p_amount),
          p_admin, now(), b.total_balance, b.total_balance + p_amount)
  returning * into tx;
  return to_jsonb(tx);
end $$;

-- --------------------------------------------------------------- deposits
create or replace function public.fn_apply_nowpayments(
  p_deposit uuid, p_payment_id text, p_invoice_id text, p_status text,
  p_pay_currency text, p_actually_paid numeric, p_amount numeric, p_raw jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare d public.deposits; already boolean; credit numeric; b public.balances;
begin
  select * into d from public.deposits where id = p_deposit for update;
  if not found then raise exception 'Deposit not found' using errcode = 'P0002'; end if;
  already := d.payment_status = 'finished';

  update public.deposits set
    now_payments_payment_id = coalesce(p_payment_id, now_payments_payment_id),
    now_payments_invoice_id = coalesce(p_invoice_id, now_payments_invoice_id),
    payment_status = coalesce(p_status, payment_status),
    pay_currency = coalesce(p_pay_currency, pay_currency),
    actually_paid = coalesce(p_actually_paid, actually_paid),
    now_payments_raw = p_raw, updated_at = now()
  where id = d.id;

  -- credited exactly once, however many times the provider repeats the callback
  if p_status = 'finished' and not already then
    credit := coalesce(p_amount, d.amount);
    b := public._ensure_balance(d.user_id);
    update public.balances set admin_add = admin_add + credit, last_updated = now() where user_id = d.user_id;
    insert into public.transactions (user_id, amount, type, status, details, balance_before, balance_after, processed_at)
    values (d.user_id, credit, 'ADMIN_ADD', 'approved',
            format('NOWPayments deposit approved. Payment ID: %s', p_payment_id),
            b.total_balance, b.total_balance + credit, now());
    return jsonb_build_object('credited', true, 'amount', credit);
  end if;
  return jsonb_build_object('credited', false);
end $$;

-- ------------------------------------------------------------------ profit
-- Pays whole 30-day periods for one machine. Returns the amount paid (0 = nothing due).
create or replace function public._pay_machine_profit(p_um uuid)
returns numeric language plpgsql as $$
declare
  um public.user_machines;
  monthly numeric;
  last_at timestamptz;
  months integer;
  profit numeric;
  b public.balances;
begin
  select * into um from public.user_machines where id = p_um for update;
  if not found or um.status <> 'active' then return 0; end if;

  select coalesce((select monthly_profit from public.mining_machines where id = um.machine_id), um.monthly_profit)
    into monthly;
  if monthly is null or monthly = 0 then return 0; end if;

  last_at := coalesce(um.last_profit_update, um.assigned_date);
  if last_at > now() then return 0; end if;
  months := floor(extract(epoch from (now() - last_at)) / 86400 / 30);
  if months < 1 then return 0; end if;

  profit := round(monthly * months, 4);
  b := public._ensure_balance(um.user_id);

  update public.user_machines
     set monthly_profit_accumulated = monthly_profit_accumulated + profit,
         last_profit_update = last_at + (months * 30) * interval '1 day', updated_at = now()
   where id = um.id;
  update public.balances set mining_balance = mining_balance + profit, last_updated = now() where user_id = um.user_id;
  insert into public.transactions (user_id, amount, type, status, balance_before, balance_after, details, metadata)
  values (um.user_id, profit, 'profit', 'completed', b.total_balance, b.total_balance + profit,
          case when months = 1 then format('Monthly profit from %s', um.machine_name)
               else format('%s months of profit from %s (backfill)', months, um.machine_name) end,
          jsonb_build_object('userMachineId', um.id, 'machineId', um.machine_id, 'monthsPaid', months));
  return profit;
end $$;

create or replace function public._pay_share_profit(p_share uuid)
returns numeric language plpgsql as $$
declare
  sp public.share_purchases;
  months integer;
  profit numeric;
  b public.balances;
  mname text;
begin
  select * into sp from public.share_purchases where id = p_share for update;
  if not found or sp.status <> 'active' or coalesce(sp.profit_per_share, 0) = 0 then return 0; end if;
  if sp.last_profit_update > now() then return 0; end if;
  months := floor(extract(epoch from (now() - sp.last_profit_update)) / 86400 / 30);
  if months < 1 then return 0; end if;

  profit := round(round(sp.profit_per_share * sp.number_of_shares, 4) * months, 4);
  b := public._ensure_balance(sp.user_id);
  select machine_name into mname from public.mining_machines where id = sp.machine_id;

  update public.share_purchases
     set total_profit_earned = total_profit_earned + profit,
         last_profit_update = last_profit_update + (months * 30) * interval '1 day', updated_at = now()
   where id = sp.id;
  update public.balances set mining_balance = mining_balance + profit, last_updated = now() where user_id = sp.user_id;
  insert into public.transactions (user_id, amount, type, status, balance_before, balance_after, details, metadata)
  values (sp.user_id, profit, 'SHARE_PROFIT', 'completed', b.total_balance, b.total_balance + profit,
          format('%s month(s) profit for %s shares of %s', months, sp.number_of_shares, mname),
          jsonb_build_object('shareId', sp.id, 'monthsPaid', months));
  return profit;
end $$;

create or replace function public.fn_run_profit_update()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  r record;
  paid numeric;
  n_proc integer := 0; n_skip integer := 0; s_proc integer := 0; s_skip integer := 0;
  total numeric := 0;
  errs jsonb := '[]'::jsonb;
begin
  -- one subtransaction per row, so one bad record never blocks the rest
  for r in select id from public.user_machines where status = 'active' loop
    begin
      paid := public._pay_machine_profit(r.id);
      if paid > 0 then n_proc := n_proc + 1; total := total + paid; else n_skip := n_skip + 1; end if;
    exception when others then
      errs := errs || jsonb_build_object('userMachineId', r.id, 'error', sqlerrm);
    end;
  end loop;

  for r in select id from public.share_purchases where status = 'active' loop
    begin
      paid := public._pay_share_profit(r.id);
      if paid > 0 then s_proc := s_proc + 1; total := total + paid; else s_skip := s_skip + 1; end if;
    exception when others then
      errs := errs || jsonb_build_object('shareId', r.id, 'error', sqlerrm);
    end;
  end loop;

  return jsonb_build_object('normalProcessed', n_proc, 'normalSkipped', n_skip,
                            'sharesProcessed', s_proc, 'sharesSkipped', s_skip,
                            'totalPaidOut', round(total, 2), 'errors', errs,
                            'finishedAt', now());
end $$;

-- Owner (or admin) asking for their own machine's profit early: only pays if due.
create or replace function public.fn_pay_user_machine_profit(p_actor uuid, p_um uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare um public.user_machines; paid numeric; last_at timestamptz; b public.balances;
begin
  select * into um from public.user_machines where id = p_um;
  if not found or um.status <> 'active' or (um.user_id <> p_actor and not public._is_admin_user(p_actor)) then
    raise exception 'User machine not found' using errcode = 'P0002';
  end if;
  last_at := coalesce(um.last_profit_update, um.assigned_date);
  paid := public._pay_machine_profit(p_um);
  select * into um from public.user_machines where id = p_um;
  select * into b from public.balances where user_id = um.user_id;
  if paid = 0 then
    return jsonb_build_object('paid', false, 'daysUntilNextUpdate',
             greatest(0, ceil(30 - extract(epoch from (now() - last_at)) / 86400)),
             'nextUpdateDate', last_at + interval '30 days');
  end if;
  return jsonb_build_object('paid', true, 'profitAdded', paid, 'newMachineTotal', um.monthly_profit_accumulated,
                            'balance', to_jsonb(b));
end $$;

-- Admin-only manual accrual figure on a machine (does not touch balances, as before).
create or replace function public.fn_manual_profit_accrual(p_admin uuid, p_um uuid, p_amount numeric)
returns jsonb language plpgsql security definer set search_path = public as $$
declare um public.user_machines;
begin
  if not public._is_admin_user(p_admin) then raise exception 'Only admins can do this!' using errcode = '42501'; end if;
  update public.user_machines
     set monthly_profit_accumulated = monthly_profit_accumulated + p_amount,
         last_profit_update = now(), updated_at = now()
   where id = p_um returning * into um;
  if not found then raise exception 'User machine assignment not found' using errcode = 'P0002'; end if;
  return jsonb_build_object('profitAdded', p_amount, 'newTotal', um.monthly_profit_accumulated);
end $$;

-- Only the service role may call these (see 0003_rls.sql for the blanket revoke).
grant execute on function
  public.fn_purchase_machine(uuid, uuid, integer),
  public.fn_sell_user_machine(uuid, uuid),
  public.fn_purchase_shares(uuid, integer),
  public.fn_sell_shares(uuid, uuid, integer),
  public.fn_request_withdrawal(uuid, numeric, text, text),
  public.fn_process_withdrawal(uuid, uuid, text, text),
  public.fn_admin_add_balance(uuid, uuid, numeric),
  public.fn_apply_nowpayments(uuid, text, text, text, text, numeric, numeric, jsonb),
  public.fn_run_profit_update(),
  public.fn_pay_user_machine_profit(uuid, uuid),
  public.fn_manual_profit_accrual(uuid, uuid, numeric)
to service_role;

-- ======== supabase/migrations/0003_rls.sql ========
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

-- ======== supabase/seed.sql ========
-- Idempotent seed: the share-based "special" machine used by /api/v1/special-machine and /purchase.
insert into public.mining_machines
  (machine_name, hashrate, power_consumption, price_range, coins_mined, monthly_profit, description,
   images, is_share_based, share_price, total_shares, available_shares, profit_per_share)
select 'Premium Share Mining Machine', '180 TH/s', 3400, 19000, 'Bitcoin', 3500,
       'Premium mining machine available for share-based investment. Purchase shares and earn proportional profits each month. Each share costs $50 and earns $9.21 monthly.',
       '{}', true, 50, 380, 380, 9.21
where not exists (
  select 1 from public.mining_machines where is_share_based and price_range = 19000 and share_price = 50
);

-- First admin: sign up normally in the app, verify the email, then run (replace the address):
--   update public.profiles set role = 'admin' where email = 'you@example.com';

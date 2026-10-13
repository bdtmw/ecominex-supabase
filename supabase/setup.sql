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

-- ======== supabase/migrations/0004_analytics_and_ledger.sql ========
-- Admin analytics, user overview and the money ledger.
-- Everything here is read-only for the app (service role, called from /api/v1/admin/*),
-- except that referral bonuses now leave a ledger entry (REFERRAL_BONUS) so the ledger is complete.

-- ------------------------------------------------------------------ referral bonus is a ledger entry
alter table public.transactions drop constraint if exists transactions_type_check;
alter table public.transactions add constraint transactions_type_check check (type in (
  'withdrawal', 'profit', 'MACHINE_PURCHASE', 'MACHINE_SALE',
  'SHARE_PURCHASE', 'SHARE_PROFIT', 'SHARE_SALE', 'ADMIN_ADD', 'REFERRAL_BONUS'));

create index if not exists transactions_type_status_date_idx on public.transactions (type, status, transaction_date);
create index if not exists transactions_processed_idx on public.transactions (processed_at) where processed_at is not null;

create or replace function public.fn_purchase_machine(p_user uuid, p_machine uuid, p_quantity integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  m public.mining_machines;
  b public.balances;
  rb public.balances;
  cost numeric;
  prev_purchases integer;
  pct numeric;
  bonus numeric;
  tx_id uuid;
  referrer uuid;
  buyer_name text;
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
  if b.admin_add < cost then raise exception 'Insufficient balance' using errcode = 'P0001'; end if;

  select count(*) into prev_purchases from public.transactions
   where user_id = p_user and type = 'MACHINE_PURCHASE' and status = 'completed';

  insert into public.transactions (user_id, amount, type, status, balance_before, balance_after, metadata)
  values (p_user, cost, 'MACHINE_PURCHASE', 'completed', b.total_balance, b.total_balance - cost,
          jsonb_build_object('machineId', m.id, 'machineName', m.machine_name,
                             'quantity', p_quantity, 'pricePerUnit', m.price_range))
  returning id into tx_id;

  update public.balances set admin_add = admin_add - cost, last_updated = now() where user_id = p_user;

  pct := case when prev_purchases = 0 then 0.10 else 0.02 end;
  bonus := round(cost * pct, 2);

  update public.profiles
     set referral_status = 'active', discount = discount + bonus, updated_at = now()
   where id = p_user
  returning referred_by, trim(first_name || ' ' || last_name) into referrer, buyer_name;

  if referrer is not null and bonus > 0 then
    rb := public._ensure_balance(referrer);
    update public.balances set admin_add = admin_add + bonus, last_updated = now() where user_id = referrer;
    insert into public.transactions (user_id, amount, type, status, balance_before, balance_after, details, metadata, processed_at)
    values (referrer, bonus, 'REFERRAL_BONUS', 'completed', rb.total_balance, rb.total_balance + bonus,
            format('Referral bonus (%s%%) on a purchase by %s', (pct * 100)::int, buyer_name),
            jsonb_build_object('referredUser', p_user, 'purchaseTransactionId', tx_id, 'rate', pct), now());
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

-- ------------------------------------------------------------------ the ledger view
-- One row per money event with its direction and its effect on the user's balance.
--   credit  = increases the balance      debit = decreases it
--   signed_amount only counts events that actually moved money (approved / completed);
--   a pending withdrawal is a *hold* (counted separately), a rejected one has no effect.
create or replace view public.v_ledger as
select
  t.id, t.user_id, t.type, t.status, t.amount, t.transaction_date, t.processed_at,
  t.balance_before, t.balance_after, t.wallet_address, t.network, t.admin_comment, t.metadata,
  case when t.type in ('ADMIN_ADD', 'profit', 'SHARE_PROFIT', 'MACHINE_SALE', 'SHARE_SALE', 'REFERRAL_BONUS') then 'credit'
       else 'debit' end as direction,
  case when t.status in ('approved', 'completed') then
         case when t.type in ('ADMIN_ADD', 'profit', 'SHARE_PROFIT', 'MACHINE_SALE', 'SHARE_SALE', 'REFERRAL_BONUS') then t.amount
              else -t.amount end
       else 0 end as signed_amount,
  case t.type
    when 'ADMIN_ADD' then 'deposit' when 'withdrawal' then 'withdrawal'
    when 'MACHINE_PURCHASE' then 'purchase' when 'SHARE_PURCHASE' then 'purchase'
    when 'profit' then 'profit' when 'SHARE_PROFIT' then 'profit'
    when 'MACHINE_SALE' then 'sale' when 'SHARE_SALE' then 'sale'
    else 'referral' end as category,
  case t.type
    when 'ADMIN_ADD' then 'Deposit credited' when 'withdrawal' then 'Withdrawal'
    when 'MACHINE_PURCHASE' then 'Machine purchase' when 'SHARE_PURCHASE' then 'Share purchase'
    when 'profit' then 'Mining profit' when 'SHARE_PROFIT' then 'Share profit'
    when 'MACHINE_SALE' then 'Machine sale' when 'SHARE_SALE' then 'Share sale'
    else 'Referral bonus' end as type_label,
  coalesce(
    nullif(t.details, ''),
    case t.type
      when 'MACHINE_PURCHASE' then format('%s × %s', t.metadata->>'quantity', t.metadata->>'machineName')
      when 'MACHINE_SALE' then format('Sold %s', t.metadata->>'machineName')
      else null end,
    '') as description,
  -- when the money actually moved: the payout time for an approved withdrawal, otherwise the event time
  case when t.type = 'withdrawal' and t.status = 'approved' then coalesce(t.processed_at, t.transaction_date)
       else t.transaction_date end as effective_at
from public.transactions t;

-- ------------------------------------------------------------------ per-user metrics view
create or replace view public.v_user_metrics as
select
  p.id, p.first_name, p.last_name, p.email, p.phone_number, p.country, p.role, p.two_factor_enabled,
  p.created_at, p.referred_by,
  coalesce(b.admin_add, 0)      as admin_add,
  coalesce(b.mining_balance, 0) as mining_balance,
  coalesce(b.total_balance, 0)  as total_balance,
  coalesce(tx.deposited, 0)     as deposited,
  coalesce(tx.withdrawn, 0)     as withdrawn,
  coalesce(tx.pending_wd, 0)    as pending_withdrawal,
  tx.last_activity,
  coalesce(um.machines, 0)      as machines,
  coalesce(sh.shares, 0)        as shares,
  coalesce(rf.referrals, 0)     as referrals,
  (p.created_at > now() - interval '7 days' and p.role = 'user')                     as is_new,
  (coalesce(tx.pending_wd, 0) > 0)                                                   as has_pending_withdrawal,
  (coalesce(tx.deposited, 0) = 0 and p.role = 'user')                                as never_deposited,
  (coalesce(b.total_balance, 0) > 0)                                                 as holds_funds,
  (coalesce(b.total_balance, 0) > 0 and p.created_at < now() - interval '30 days'
     and coalesce(tx.last_activity, p.created_at) < now() - interval '30 days')      as dormant,
  (coalesce(um.machines, 0) + coalesce(sh.shares, 0) = 0 and p.role = 'user')        as no_machines
from public.profiles p
left join public.balances b on b.user_id = p.id
left join (
  select user_id,
         sum(amount) filter (where type = 'ADMIN_ADD' and status = 'approved')      as deposited,
         sum(amount) filter (where type = 'withdrawal' and status = 'approved')     as withdrawn,
         sum(amount) filter (where type = 'withdrawal' and status = 'pending')      as pending_wd,
         max(transaction_date) filter (where status in ('approved', 'completed'))   as last_activity
    from public.transactions group by user_id
) tx on tx.user_id = p.id
left join (select user_id, count(*) as machines from public.user_machines where status = 'active' group by user_id) um on um.user_id = p.id
left join (select user_id, sum(number_of_shares) as shares from public.share_purchases where status = 'active' group by user_id) sh on sh.user_id = p.id
left join (select referred_by, count(*) as referrals from public.profiles where referred_by is not null group by referred_by) rf on rf.referred_by = p.id;

revoke all on public.v_ledger, public.v_user_metrics from public, anon, authenticated;
grant select on public.v_ledger, public.v_user_metrics to service_role;

-- ------------------------------------------------------------------ ledger
create or replace function public.fn_admin_ledger(
  p_admin uuid, p_from timestamptz default null, p_to timestamptz default null,
  p_categories text[] default null, p_statuses text[] default null, p_user uuid default null,
  p_search text default null, p_min numeric default null, p_max numeric default null,
  p_limit integer default 50, p_offset integer default 0)
returns jsonb language plpgsql security definer set search_path = public as $$
declare q text := lower(coalesce(trim(p_search), '')); out jsonb;
begin
  if not public._is_admin_user(p_admin) then raise exception 'Only admins can do this!' using errcode = '42501'; end if;
  p_limit := least(greatest(coalesce(p_limit, 50), 1), 50000);
  p_offset := greatest(coalesce(p_offset, 0), 0);

  with f as (
    select l.*, p.first_name, p.last_name, p.email
      from public.v_ledger l join public.profiles p on p.id = l.user_id
     where (p_from is null or l.transaction_date >= p_from)
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
        'amount', amount, 'signedAmount', signed_amount, 'balanceBefore', balance_before, 'balanceAfter', balance_after,
        'description', description, 'walletAddress', wallet_address, 'network', network, 'adminComment', admin_comment)
        order by transaction_date desc, id) from page), '[]'::jsonb)
  ) into out;
  return out;
end $$;

-- ------------------------------------------------------------------ users overview
create or replace function public.fn_admin_users_overview(
  p_admin uuid, p_search text default null, p_segment text default 'all',
  p_sort text default 'joined', p_dir text default 'desc', p_limit integer default 25, p_offset integer default 0)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  q text := lower(coalesce(trim(p_search), ''));
  sort_col text;
  dir text := case when lower(coalesce(p_dir, 'desc')) = 'asc' then 'asc' else 'desc' end;
  seg_sql text;
  out jsonb;
begin
  if not public._is_admin_user(p_admin) then raise exception 'Only admins can do this!' using errcode = '42501'; end if;
  p_limit := least(greatest(coalesce(p_limit, 25), 1), 1000);
  p_offset := greatest(coalesce(p_offset, 0), 0);

  sort_col := case p_sort
    when 'name' then 'lower(first_name || '' '' || last_name)' when 'balance' then 'total_balance'
    when 'deposited' then 'deposited' when 'withdrawn' then 'withdrawn' when 'machines' then '(machines + shares)'
    when 'referrals' then 'referrals' when 'activity' then 'last_activity' when 'pending' then 'pending_withdrawal'
    else 'created_at' end;

  seg_sql := case p_segment
    when 'new' then 'is_new' when 'pending_withdrawal' then 'has_pending_withdrawal'
    when 'never_deposited' then 'never_deposited' when 'holding' then 'holds_funds'
    when 'dormant' then 'dormant' when 'no_machines' then 'no_machines' when 'admins' then 'role = ''admin'''
    else 'true' end;

  execute format($f$
    with base as (select * from public.v_user_metrics),
    counts as (
      select count(*) as all_n, count(*) filter (where is_new) as new_n,
             count(*) filter (where has_pending_withdrawal) as pending_n, count(*) filter (where never_deposited) as never_n,
             count(*) filter (where holds_funds) as holding_n, count(*) filter (where dormant) as dormant_n,
             count(*) filter (where no_machines) as nomach_n, count(*) filter (where role = 'admin') as admin_n
        from base),
    f as (
      select * from base
       where (%1$s) and (%2$L = '' or position(%2$L in lower(concat_ws(' ', first_name, last_name, email, phone_number, country))) > 0)
    ),
    page as (select * from f order by %3$s %4$s nulls last, id limit %5$s offset %6$s)
    select jsonb_build_object(
      'total', (select count(*) from f),
      'segmentCounts', (select jsonb_build_object('all', all_n, 'new', new_n, 'pending_withdrawal', pending_n,
                          'never_deposited', never_n, 'holding', holding_n, 'dormant', dormant_n,
                          'no_machines', nomach_n, 'admins', admin_n) from counts),
      'rows', coalesce((select jsonb_agg(jsonb_build_object(
          'id', id, 'firstName', first_name, 'lastName', last_name, 'email', email, 'phone', phone_number,
          'country', country, 'role', role, 'twoFactor', two_factor_enabled, 'joinedAt', created_at,
          'lastActivityAt', last_activity, 'depositedBalance', admin_add, 'profitBalance', mining_balance,
          'totalBalance', total_balance, 'totalDeposited', deposited, 'totalWithdrawn', withdrawn,
          'pendingWithdrawal', pending_withdrawal, 'machines', machines, 'shares', shares, 'referrals', referrals,
          'tags', to_jsonb(array_remove(array[
             case when is_new then 'new' end, case when has_pending_withdrawal then 'pending_withdrawal' end,
             case when dormant then 'dormant' end, case when never_deposited then 'never_deposited' end,
             case when role = 'admin' then 'admin' end], null))
        ) order by %3$s %4$s nulls last, id) from page), '[]'::jsonb))
  $f$, seg_sql, q, sort_col, dir, p_limit, p_offset) into out;
  return out;
end $$;

-- ------------------------------------------------------------------ KPIs (current vs previous period + live snapshot)
create or replace function public.fn_admin_kpis(p_admin uuid, p_from timestamptz, p_to timestamptz)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  span interval; prev_from timestamptz;
  cur jsonb; prev jsonb; snap jsonb; attention jsonb;
begin
  if not public._is_admin_user(p_admin) then raise exception 'Only admins can do this!' using errcode = '42501'; end if;
  if p_from is null or p_to is null or p_to <= p_from then raise exception 'Invalid date range' using errcode = 'P0001'; end if;
  span := p_to - p_from; prev_from := p_from - span;

  select jsonb_object_agg(k, v) into cur from (
    select 'deposits' k, coalesce(sum(amount), 0) v from public.v_ledger where type = 'ADMIN_ADD' and status = 'approved' and effective_at >= p_from and effective_at < p_to
    union all select 'depositCount', count(*) from public.v_ledger where type = 'ADMIN_ADD' and status = 'approved' and effective_at >= p_from and effective_at < p_to
    union all select 'withdrawals', coalesce(sum(amount), 0) from public.v_ledger where type = 'withdrawal' and status = 'approved' and effective_at >= p_from and effective_at < p_to
    union all select 'withdrawalCount', count(*) from public.v_ledger where type = 'withdrawal' and status = 'approved' and effective_at >= p_from and effective_at < p_to
    union all select 'investments', coalesce(sum(amount), 0) from public.v_ledger where category = 'purchase' and status = 'completed' and effective_at >= p_from and effective_at < p_to
    union all select 'buybacks', coalesce(sum(amount), 0) from public.v_ledger where category = 'sale' and status = 'completed' and effective_at >= p_from and effective_at < p_to
    union all select 'profitPaid', coalesce(sum(amount), 0) from public.v_ledger where category = 'profit' and status = 'completed' and effective_at >= p_from and effective_at < p_to
    union all select 'referralPaid', coalesce(sum(amount), 0) from public.v_ledger where category = 'referral' and status = 'completed' and effective_at >= p_from and effective_at < p_to
    union all select 'newUsers', count(*) from public.profiles where created_at >= p_from and created_at < p_to
    union all select 'activeUsers', count(distinct user_id) from public.v_ledger where status in ('approved', 'completed') and effective_at >= p_from and effective_at < p_to
    union all select 'newDepositors', count(*) from (
        select user_id from public.v_ledger where type = 'ADMIN_ADD' and status = 'approved'
         group by user_id having min(effective_at) >= p_from and min(effective_at) < p_to) x
  ) s;

  select jsonb_object_agg(k, v) into prev from (
    select 'deposits' k, coalesce(sum(amount), 0) v from public.v_ledger where type = 'ADMIN_ADD' and status = 'approved' and effective_at >= prev_from and effective_at < p_from
    union all select 'depositCount', count(*) from public.v_ledger where type = 'ADMIN_ADD' and status = 'approved' and effective_at >= prev_from and effective_at < p_from
    union all select 'withdrawals', coalesce(sum(amount), 0) from public.v_ledger where type = 'withdrawal' and status = 'approved' and effective_at >= prev_from and effective_at < p_from
    union all select 'withdrawalCount', count(*) from public.v_ledger where type = 'withdrawal' and status = 'approved' and effective_at >= prev_from and effective_at < p_from
    union all select 'investments', coalesce(sum(amount), 0) from public.v_ledger where category = 'purchase' and status = 'completed' and effective_at >= prev_from and effective_at < p_from
    union all select 'buybacks', coalesce(sum(amount), 0) from public.v_ledger where category = 'sale' and status = 'completed' and effective_at >= prev_from and effective_at < p_from
    union all select 'profitPaid', coalesce(sum(amount), 0) from public.v_ledger where category = 'profit' and status = 'completed' and effective_at >= prev_from and effective_at < p_from
    union all select 'referralPaid', coalesce(sum(amount), 0) from public.v_ledger where category = 'referral' and status = 'completed' and effective_at >= prev_from and effective_at < p_from
    union all select 'newUsers', count(*) from public.profiles where created_at >= prev_from and created_at < p_from
    union all select 'activeUsers', count(distinct user_id) from public.v_ledger where status in ('approved', 'completed') and effective_at >= prev_from and effective_at < p_from
    union all select 'newDepositors', count(*) from (
        select user_id from public.v_ledger where type = 'ADMIN_ADD' and status = 'approved'
         group by user_id having min(effective_at) >= prev_from and min(effective_at) < p_from) x
  ) s;

  -- live snapshot (not period-bound)
  select jsonb_build_object(
    'users', (select count(*) from public.profiles where role = 'user'),
    'usersWithBalance', (select count(*) from public.balances where total_balance > 0),
    'fundsHeld', coalesce((select sum(total_balance) from public.balances), 0),
    'fundsDeposited', coalesce((select sum(admin_add) from public.balances), 0),
    'fundsProfit', coalesce((select sum(mining_balance) from public.balances), 0),
    'top5Share', coalesce((select sum(total_balance) from (select total_balance from public.balances order by total_balance desc limit 5) t)
                          / nullif((select sum(total_balance) from public.balances), 0), 0),
    'activeMachines', (select count(*) from public.user_machines where status = 'active'),
    'activeShares', coalesce((select sum(number_of_shares) from public.share_purchases where status = 'active'), 0),
    'unreadContacts', (select count(*) from public.contacts where status = 'pending')
  ) into snap;

  select jsonb_build_object(
    'pendingWithdrawals', jsonb_build_object(
      'count', (select count(*) from public.transactions where type = 'withdrawal' and status = 'pending'),
      'amount', coalesce((select sum(amount) from public.transactions where type = 'withdrawal' and status = 'pending'), 0),
      'oldestAt', (select min(transaction_date) from public.transactions where type = 'withdrawal' and status = 'pending')),
    'oldestPending', coalesce((select jsonb_agg(jsonb_build_object(
        'id', t.id, 'userId', t.user_id, 'userName', nullif(trim(p.first_name || ' ' || p.last_name), ''), 'userEmail', p.email,
        'amount', t.amount, 'requestedAt', t.transaction_date, 'network', t.network) order by t.transaction_date)
        from (select * from public.transactions where type = 'withdrawal' and status = 'pending' order by transaction_date limit 5) t
        join public.profiles p on p.id = t.user_id), '[]'::jsonb),
    'dormantWithFunds', (select count(*) from public.v_user_metrics where dormant),
    'topUsers', coalesce((select jsonb_agg(jsonb_build_object(
        'id', id, 'name', nullif(trim(first_name || ' ' || last_name), ''), 'email', email, 'totalBalance', total_balance,
        'totalDeposited', deposited) order by total_balance desc)
        from (select * from public.v_user_metrics where total_balance > 0 order by total_balance desc limit 5) u), '[]'::jsonb)
  ) into attention;

  return jsonb_build_object('range', jsonb_build_object('from', p_from, 'to', p_to, 'prevFrom', prev_from),
                            'current', cur, 'previous', prev, 'snapshot', snap, 'attention', attention);
end $$;

-- ------------------------------------------------------------------ time series (zero-filled)
create or replace function public.fn_admin_timeseries(p_admin uuid, p_from timestamptz, p_to timestamptz, p_bucket text default 'day')
returns jsonb language plpgsql security definer set search_path = public as $$
declare bucket text := case when p_bucket = 'week' then 'week' else 'day' end; out jsonb;
begin
  if not public._is_admin_user(p_admin) then raise exception 'Only admins can do this!' using errcode = '42501'; end if;
  if p_from is null or p_to is null or p_to <= p_from then raise exception 'Invalid date range' using errcode = 'P0001'; end if;
  if p_to - p_from > interval '800 days' then raise exception 'Range too large' using errcode = 'P0001'; end if;

  with buckets as (
    select generate_series(date_trunc(bucket, p_from at time zone 'utc'), date_trunc(bucket, (p_to - interval '1 second') at time zone 'utc'),
                           ('1 ' || bucket)::interval) as b
  ), l as (
    select date_trunc(bucket, effective_at at time zone 'utc') as b,
           sum(amount) filter (where type = 'ADMIN_ADD' and status = 'approved') as deposits,
           sum(amount) filter (where type = 'withdrawal' and status = 'approved') as withdrawals,
           sum(amount) filter (where category = 'purchase' and status = 'completed') as investments,
           sum(amount) filter (where category = 'profit' and status = 'completed') as profit_paid
      from public.v_ledger where effective_at >= p_from and effective_at < p_to group by 1
  ), u as (
    select date_trunc(bucket, created_at at time zone 'utc') as b, count(*) as new_users
      from public.profiles where created_at >= p_from and created_at < p_to group by 1
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'date', to_char(buckets.b, 'YYYY-MM-DD'), 'deposits', coalesce(l.deposits, 0), 'withdrawals', coalesce(l.withdrawals, 0),
      'investments', coalesce(l.investments, 0), 'profitPaid', coalesce(l.profit_paid, 0), 'newUsers', coalesce(u.new_users, 0))
      order by buckets.b), '[]'::jsonb)
    into out
    from buckets left join l on l.b = buckets.b left join u on u.b = buckets.b;
  return jsonb_build_object('bucket', bucket, 'points', out);
end $$;

-- ------------------------------------------------------------------ access: service role only
revoke all on function
  public.fn_admin_ledger(uuid, timestamptz, timestamptz, text[], text[], uuid, text, numeric, numeric, integer, integer),
  public.fn_admin_users_overview(uuid, text, text, text, text, integer, integer),
  public.fn_admin_kpis(uuid, timestamptz, timestamptz),
  public.fn_admin_timeseries(uuid, timestamptz, timestamptz, text)
from public, anon, authenticated;
grant execute on function
  public.fn_admin_ledger(uuid, timestamptz, timestamptz, text[], text[], uuid, text, numeric, numeric, integer, integer),
  public.fn_admin_users_overview(uuid, text, text, text, text, integer, integer),
  public.fn_admin_kpis(uuid, timestamptz, timestamptz),
  public.fn_admin_timeseries(uuid, timestamptz, timestamptz, text)
to service_role;

-- ======== supabase/migrations/0005_nowpayments_hardening.sql ========
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

-- ======== supabase/migrations/0006_backfill_balances.sql ========
-- Fills in "balance before / after" for every transaction that has none (migrated history, older rows).
--
-- Method: walk each user's money-moving entries in the order the money moved (v_ledger.effective_at) and anchor the
-- chain to the user's CURRENT balance, so the newest entry always ends exactly at today's balance and every earlier
-- entry is today's balance minus everything that happened after it. Pending/rejected entries move no money, so they
-- carry the running balance unchanged. Rows that already have a balance are never touched.
-- Idempotent: run it again any time (e.g. after a data import); it only fills what is still empty.
create or replace function public.fn_backfill_transaction_balances()
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  with chain as (
    select l.id, l.user_id, l.signed_amount,
           sum(l.signed_amount) over (partition by l.user_id order by l.effective_at, l.id) as cum,
           sum(l.signed_amount) over (partition by l.user_id) as tot
      from public.v_ledger l
  ), calc as (
    select c.id, c.signed_amount,
           coalesce(b.total_balance, 0) - c.tot + c.cum as after_bal
      from chain c
      left join public.balances b on b.user_id = c.user_id
  )
  update public.transactions t
     set balance_after  = calc.after_bal,
         balance_before = coalesce(t.balance_before, calc.after_bal - calc.signed_amount)
    from calc
   where t.id = calc.id and t.balance_after is null;
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function public.fn_backfill_transaction_balances() from public, anon, authenticated;
grant execute on function public.fn_backfill_transaction_balances() to service_role;

select public.fn_backfill_transaction_balances();

-- ======== supabase/migrations/0007_ledger_running_balance.sql ========
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

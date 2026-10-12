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

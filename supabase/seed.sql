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

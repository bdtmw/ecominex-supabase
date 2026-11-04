-- Set ONE user's balance to zero with a visible "Admin deduction" entry in the ledger.
-- Run migration 0018 first. Change the email on the first line, run STEP 1 to look, then STEP 2 to apply.

-- STEP 1: look first (changes nothing)
select p.email, b.total_balance, b.admin_add as deposited_part, b.mining_balance as profit_part,
       coalesce((select sum(amount) from public.transactions t where t.user_id = p.id and t.type = 'withdrawal' and t.status = 'pending'), 0) as held_by_pending_withdrawals
  from public.profiles p left join public.balances b on b.user_id = p.id
 where p.email = 'drogadegolpe@gmail.com';

-- STEP 2: apply (balance becomes 0, one ledger entry "Admin deduction" for the full amount)
select public.fn_admin_deduct_balance(
  (select id from public.profiles where role = 'admin' order by created_at limit 1),
  (select id from public.profiles where email = 'drogadegolpe@gmail.com'),
  null,                                         -- null = the whole balance (or put an amount, e.g. 250)
  'Balance set to zero by admin');

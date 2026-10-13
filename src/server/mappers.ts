// Convert database rows (snake_case) into the camelCase / `_id` shapes the existing
// frontend was written against when the API was Express + MongoDB.
const n = (v: unknown) => (v === null || v === undefined ? v : Number(v));

export const toUser = (p: any, extra: Record<string, unknown> = {}) => ({
  _id: p.id,
  id: p.id,
  firstName: p.first_name,
  lastName: p.last_name,
  email: p.email,
  role: p.role,
  phoneNumber: p.phone_number,
  country: p.country,
  referralCode: p.referral_code,
  referralId: p.referred_by,
  referralStatus: p.referral_status,
  deposit_count: p.deposit_count,
  discount: n(p.discount),
  twoFactorEnabled: !!p.two_factor_enabled,
  createdAt: p.created_at,
  ...extra,
});

export const toPublicUser = (p: any) =>
  p ? { _id: p.id, firstName: p.first_name, lastName: p.last_name, email: p.email } : p;

export const toMachine = (m: any) => ({
  _id: m.id,
  machineName: m.machine_name,
  hashrate: m.hashrate,
  powerConsumption: n(m.power_consumption),
  priceRange: n(m.price_range),
  coinsMined: m.coins_mined,
  monthlyProfit: n(m.monthly_profit),
  description: m.description,
  images: m.images || [],
  isShareBased: m.is_share_based,
  sharePrice: n(m.share_price),
  totalShares: m.total_shares,
  availableShares: m.available_shares,
  profitPerShare: n(m.profit_per_share),
  createdAt: m.created_at,
});

export const toUserMachine = (um: any, user?: any, machine?: any) => ({
  _id: um.id,
  user: user ? toPublicUser(user) : um.user_id,
  machine: machine ? { _id: machine.id, machineName: machine.machine_name, model: machine.model } : um.machine_id,
  assignedDate: um.assigned_date,
  status: um.status,
  monthlyProfitAccumulated: n(um.monthly_profit_accumulated),
  lastProfitUpdate: um.last_profit_update,
  machineName: um.machine_name,
  hashrate: um.hashrate,
  powerConsumption: n(um.power_consumption),
  priceRange: n(um.price_range),
  coinsMined: um.coins_mined,
  monthlyProfit: n(um.monthly_profit),
  description: um.description,
  images: um.images || [],
  createdAt: um.created_at,
  updatedAt: um.updated_at,
});

export const toTransaction = (t: any, user?: any, processedBy?: any) => ({
  _id: t.id,
  user: user ? toPublicUser(user) : t.user_id,
  amount: n(t.amount),
  type: t.type,
  status: t.status,
  walletAddress: t.wallet_address,
  network: t.network,
  balanceBefore: n(t.balance_before),
  balanceAfter: n(t.balance_after),
  adminComment: t.admin_comment,
  processedBy: processedBy ? toPublicUser(processedBy) : t.processed_by,
  processedAt: t.processed_at,
  details: t.details,
  metadata: t.metadata || {},
  transactionDate: t.transaction_date,
});

export const toBalance = (b: any) => ({
  _id: b.user_id,
  user: b.user_id,
  totalBalance: n(b.total_balance),
  adminAdd: n(b.admin_add),
  miningBalance: n(b.mining_balance),
  lastUpdated: b.last_updated,
});

/** The `{ total, main, mining }` shape used in sale/purchase responses. */
export const balanceSummary = (b: any) => ({ total: n(b.total_balance), main: n(b.admin_add), mining: n(b.mining_balance) });

export const toShare = (s: any) => ({
  _id: s.id,
  user: s.user_id,
  machine: s.machine_id,
  numberOfShares: s.number_of_shares,
  pricePerShare: n(s.price_per_share),
  profitPerShare: n(s.profit_per_share),
  totalInvestment: n(s.total_investment),
  purchaseDate: s.purchase_date,
  lastProfitUpdate: s.last_profit_update,
  status: s.status,
  totalProfitEarned: n(s.total_profit_earned),
});

export const toDeposit = (d: any, user?: any) => ({
  _id: d.id,
  userId: user ? toPublicUser(user) : d.user_id,
  amount: n(d.amount),
  transactionId: d.transaction_id,
  accounttype: d.account_type,
  attachment: d.attachment || [],
  dateTime: d.date_time,
  paymentProvider: d.payment_provider,
  paymentStatus: d.payment_status,
  payCurrency: d.pay_currency,
  actuallyPaid: n(d.actually_paid),
  nowPaymentsInvoiceId: d.now_payments_invoice_id,
  nowPaymentsPaymentId: d.now_payments_payment_id,
  invoiceUrl: d.invoice_url,
  creditedAt: d.credited_at ?? null,
  reviewNote: d.review_note ?? null,
  createdAt: d.created_at,
  updatedAt: d.updated_at,
});

export const toContact = (c: any, readBy?: any) => ({
  _id: c.id,
  name: c.name,
  email: c.email,
  phone: c.phone,
  country: c.country,
  comment: c.comment,
  status: c.status,
  readBy: readBy ? { _id: readBy.id, name: `${readBy.first_name} ${readBy.last_name}`, email: readBy.email } : c.read_by,
  readAt: c.read_at,
  createdAt: c.created_at,
});

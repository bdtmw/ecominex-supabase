import { NextRequest } from "next/server";
import { admin, must } from "../supabase";
import { requireAdmin, requireUser, assertSelfOrAdmin } from "../auth";
import { HttpError, Ctx, json, readJson, isUuid, isPositiveInt, isPositiveNumber } from "../http";
import { toBalance, balanceSummary, toTransaction, toShare, toMachine } from "../mappers";
import { populate } from "./machines";

const num = (v: unknown) => Number(v);

// ------------------------------------------------------------------ balance
export async function getBalance(req: NextRequest, { params }: Ctx) {
  const me = await requireUser(req);
  assertSelfOrAdmin(me, params.userId);
  const db = admin();

  await db.from("balances").upsert({ user_id: params.userId }, { onConflict: "user_id", ignoreDuplicates: true });
  const { data: bal, error } = await db.from("balances").select("*").eq("user_id", params.userId).single();
  if (error) throw error;
  const machines = must(await db.from("user_machines").select("id, machine_name, monthly_profit_accumulated, last_profit_update")
    .eq("user_id", params.userId).eq("status", "active"));

  return json({
    balances: { total: num(bal.total_balance), adminAdd: num(bal.admin_add), mining: num(bal.mining_balance) },
    machines: {
      count: machines?.length || 0,
      details: (machines || []).map((m: any) => ({ machineId: m.id, name: m.machine_name, accumulatedProfit: num(m.monthly_profit_accumulated), lastProfitUpdate: m.last_profit_update })),
    },
    lastUpdated: bal.last_updated,
  });
}

export async function getAllBalance(req: NextRequest) {
  await requireAdmin(req);
  const { data, error } = await admin().from("balances").select("*");
  if (error) throw error;
  return json((data || []).map(toBalance));
}

export async function updateBalance(req: NextRequest) {
  const adminUser = await requireAdmin(req);
  const { userId, amount, note } = await readJson(req);
  if (!isPositiveNumber(amount) || amount > 1_000_000) throw new HttpError(400, "Invalid amount");
  if (!isUuid(userId)) throw new HttpError(404, "User not found");
  if (note !== undefined && note !== null && typeof note !== "string") throw new HttpError(400, "Invalid note");
  const { data, error } = await admin().rpc("fn_admin_add_balance", {
    p_admin: adminUser.id, p_user: userId, p_amount: Math.round(amount * 100) / 100, p_note: note ?? null,
  });
  if (error) throw error;
  return json({ message: "Admin balance added successfully 🤝", newBalance: data?.newBalance ?? null });
}

// --------------------------------------------------- machine purchase / sale
export async function purchaseMachine(req: NextRequest) {
  const me = await requireUser(req);
  const { machineId, quantity = 1 } = await readJson(req); // any userId in the body is ignored on purpose
  if (!isUuid(machineId) || !isPositiveInt(quantity) || quantity > 100)
    throw new HttpError(400, "Machine ID and a valid integer quantity are required");

  const { data, error } = await admin().rpc("fn_purchase_machine", { p_user: me.id, p_machine: machineId, p_quantity: quantity });
  if (error) throw error;

  const rows = must(await admin().from("user_machines").select("*").in("id", data.userMachineIds));
  return json({
    message: "Machine(s) purchased successfully",
    machines: await populate(rows || []),
    transaction: { id: data.transactionId, totalCost: data.totalCost, newBalance: data.newBalance },
  }, 201);
}

export async function checkPurchaseEligibility(req: NextRequest) {
  const me = await requireUser(req);
  const machineId = req.nextUrl.searchParams.get("machineId");
  const quantity = Number(req.nextUrl.searchParams.get("quantity") ?? 1);
  if (!isUuid(machineId) || !isPositiveInt(quantity)) throw new HttpError(400, "Valid Machine ID and quantity are required");

  const [{ data: machine }, { data: bal }] = await Promise.all([
    admin().from("mining_machines").select("*").eq("id", machineId).maybeSingle(),
    admin().from("balances").select("admin_add").eq("user_id", me.id).maybeSingle(),
  ]);
  if (!machine) throw new HttpError(404, "Machine not found");

  const available = num(bal?.admin_add ?? 0);
  const total = num(machine.price_range) * quantity;
  return json({
    canPurchase: available >= total, userBalance: available, requiredAmount: total,
    shortfall: available >= total ? 0 : total - available,
    machine: { name: machine.machine_name, pricePerUnit: num(machine.price_range), quantity },
  });
}

export async function sellUserMachine(req: NextRequest, { params }: Ctx) {
  const me = await requireUser(req);
  if (!isUuid(params.userMachineId)) throw new HttpError(404, "User machine not found");
  const { data, error } = await admin().rpc("fn_sell_user_machine", { p_actor: me.id, p_user_machine: params.userMachineId });
  if (error) throw error;
  return json({
    message: "Machine sold successfully",
    sale: { originalPrice: data.originalPrice, deduction: data.deduction, sellingPrice: data.sellingPrice,
            machineDetails: { name: data.machineName, id: data.machineId } },
    transaction: toTransaction(data.transaction),
    newBalance: balanceSummary(data.balance),
  });
}

export async function getSaleHistory(req: NextRequest, { params }: Ctx) {
  const me = await requireUser(req);
  assertSelfOrAdmin(me, params.userId);
  const { data, error } = await admin().from("transactions").select("*").eq("user_id", params.userId)
    .eq("type", "MACHINE_SALE").order("created_at", { ascending: false });
  if (error) throw error;
  return json({
    sales: (data || []).map((t) => ({
      transactionId: t.id, date: t.created_at, machineName: t.metadata?.machineName, originalPrice: t.metadata?.originalPrice,
      deduction: t.metadata?.deduction, sellingPrice: t.metadata?.sellingPrice,
      balanceBefore: num(t.balance_before), balanceAfter: num(t.balance_after),
    })),
  });
}

// ------------------------------------------------------------------- shares
async function specialMachine() {
  const data = must(await admin().from("mining_machines").select("*").eq("is_share_based", true)
    .eq("price_range", 19000).eq("share_price", 50).order("created_at").limit(1).maybeSingle());
  return data;
}

async function soldShares(machineId: string) {
  const data = must(await admin().from("share_purchases").select("number_of_shares").eq("machine_id", machineId).eq("status", "active"));
  return (data || []).reduce((s: number, r: any) => s + r.number_of_shares, 0);
}

export async function getSpecialShareMachine() {
  const m = await specialMachine();
  if (!m) throw new HttpError(404, "Special share machine not found");
  const sold = await soldShares(m.id);
  return json({ success: true, data: { ...toMachine(m), availableShares: m.total_shares - sold, soldShares: sold } });
}

export async function purchaseShares(req: NextRequest) {
  const me = await requireUser(req);
  const { numberOfShares } = await readJson(req);
  if (!isPositiveInt(numberOfShares)) throw new HttpError(400, "User ID and valid number of shares are required");
  const { data, error } = await admin().rpc("fn_purchase_shares", { p_user: me.id, p_shares: numberOfShares });
  if (error) throw error;
  return json({
    success: true, message: "Shares purchased successfully",
    data: { purchase: toShare(data.purchase), transaction: toTransaction(data.transaction), newBalance: data.newBalance, expectedMonthlyProfit: data.expectedMonthlyProfit },
  }, 201);
}

export async function getUserShareDetails(req: NextRequest, { params }: Ctx) {
  const me = await requireUser(req);
  assertSelfOrAdmin(me, params.userId);
  const { data: shares, error } = await admin().from("share_purchases").select("*, mining_machines(machine_name)")
    .eq("user_id", params.userId).eq("status", "active");
  if (error) throw error;

  const summary = { totalShares: 0, totalInvestment: 0, totalProfitEarned: 0, expectedMonthlyProfit: 0 };
  const details = (shares || []).map((s: any) => {
    summary.totalShares += s.number_of_shares;
    summary.totalInvestment += num(s.total_investment);
    summary.totalProfitEarned += num(s.total_profit_earned);
    summary.expectedMonthlyProfit += s.number_of_shares * num(s.profit_per_share);
    return {
      id: s.id, machineName: s.mining_machines?.machine_name, numberOfShares: s.number_of_shares,
      pricePerShare: num(s.price_per_share), profitPerShare: num(s.profit_per_share), totalInvestment: num(s.total_investment),
      totalProfitEarned: num(s.total_profit_earned), purchaseDate: s.purchase_date, lastProfitUpdate: s.last_profit_update,
      nextProfitUpdate: new Date(new Date(s.last_profit_update).getTime() + 30 * 86400000),
    };
  });
  summary.expectedMonthlyProfit = Number(summary.expectedMonthlyProfit.toFixed(2));
  return json({ success: true, data: { shares: details, summary } });
}

export async function sellShares(req: NextRequest, { params }: Ctx) {
  const me = await requireUser(req);
  const { numberOfSharesToSell } = await readJson(req);
  if (!isUuid(params.sharePurchaseId) || !isPositiveInt(numberOfSharesToSell))
    throw new HttpError(400, "Valid number of shares to sell is required");
  const { data, error } = await admin().rpc("fn_sell_shares", { p_actor: me.id, p_purchase: params.sharePurchaseId, p_shares: numberOfSharesToSell });
  if (error) throw error;
  return json({
    success: true, message: "Shares sold successfully",
    data: {
      sale: { originalValue: data.originalValue, deduction: data.deduction, sellingPrice: data.sellingPrice, soldShares: data.soldShares,
              remainingShares: data.remainingShares, machineDetails: { name: data.machineName, id: data.machineId } },
      transaction: toTransaction(data.transaction), newBalance: balanceSummary(data.balance),
    },
  });
}

export async function updateAllShareProfits(req: NextRequest) {
  await requireAdmin(req);
  const { data, error } = await admin().rpc("fn_run_profit_update");
  if (error) throw error;
  return json({ success: true, message: "Share profits updated successfully", updatedCount: data.sharesProcessed, updates: [], summary: data });
}

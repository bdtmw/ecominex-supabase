import { NextRequest } from "next/server";
import { admin, must } from "../supabase";
import { requireAdmin, requireUser, assertSelfOrAdmin } from "../auth";
import { HttpError, Ctx, json, readJson, isStr, isUuid, isPositiveInt, escapeHtml } from "../http";
import { toMachine, toUserMachine, balanceSummary } from "../mappers";
import { uploadImages } from "../storage";
import { sendEmail, layout, p } from "../email";

const MACHINE_FIELDS = ["machineName", "hashrate", "powerConsumption", "priceRange", "coinsMined", "monthlyProfit", "description"] as const;

/** Accepts multipart/form-data (with images) or JSON, returns plain fields and image files. */
async function readMachineBody(req: NextRequest) {
  const ct = req.headers.get("content-type") || "";
  if (ct.includes("multipart/form-data")) {
    const fd = await req.formData();
    const fields: Record<string, any> = {};
    for (const k of MACHINE_FIELDS) if (fd.has(k)) fields[k] = fd.get(k);
    const files = [...fd.getAll("images"), ...fd.getAll("images[]")].filter((f): f is File => typeof f !== "string" && f.size > 0);
    return { fields, files };
  }
  return { fields: await readJson(req), files: [] as File[] };
}

function machineRow(f: Record<string, any>, partial: boolean) {
  const row: Record<string, any> = {};
  const set = (key: string, col: string, kind: "str" | "num") => {
    if (f[key] === undefined || f[key] === null || f[key] === "") return;
    if (kind === "num") {
      const v = Number(f[key]);
      if (!Number.isFinite(v) || v < 0) throw new HttpError(400, `${key} must be a non-negative number`);
      row[col] = v;
    } else {
      if (!isStr(f[key])) throw new HttpError(400, `${key} must be text`);
      row[col] = f[key].trim();
    }
  };
  set("machineName", "machine_name", "str"); set("hashrate", "hashrate", "str"); set("coinsMined", "coins_mined", "str");
  set("description", "description", "str"); set("powerConsumption", "power_consumption", "num");
  set("priceRange", "price_range", "num"); set("monthlyProfit", "monthly_profit", "num");
  if (!partial) {
    for (const [k, c] of [["machineName", "machine_name"], ["hashrate", "hashrate"], ["powerConsumption", "power_consumption"],
      ["priceRange", "price_range"], ["coinsMined", "coins_mined"], ["monthlyProfit", "monthly_profit"], ["description", "description"]]) {
      if (row[c] === undefined) throw new HttpError(400, `${k} is required`);
    }
  }
  return row;
}

export async function getAllMachines() {
  const { data, error } = await admin().from("mining_machines").select("*").eq("is_share_based", false).order("created_at", { ascending: false });
  if (error) throw error;
  return json({ success: true, count: data.length, data: data.map(toMachine) });
}

export async function getMachine(_req: NextRequest, { params }: Ctx) {
  if (!isUuid(params.id)) throw new HttpError(404, "Mining machine not found");
  const data = must(await admin().from("mining_machines").select("*").eq("id", params.id).maybeSingle());
  if (!data) throw new HttpError(404, "Mining machine not found");
  return json({ success: true, data: toMachine(data) });
}

export async function createMachine(req: NextRequest) {
  await requireAdmin(req);
  const { fields, files } = await readMachineBody(req);
  if (files.length > 5) throw new HttpError(400, "At most 5 images");
  const row = machineRow(fields, false);
  const images = await uploadImages(files, "machine-images", "machines");
  const { data, error } = await admin().from("mining_machines").insert({ ...row, images }).select("*").single();
  if (error) throw error;
  return json({ success: true, data: toMachine(data) }, 201);
}

export async function updateMachine(req: NextRequest, { params }: Ctx) {
  await requireAdmin(req);
  if (!isUuid(params.id)) throw new HttpError(404, "Mining machine not found");
  const existing = must(await admin().from("mining_machines").select("images").eq("id", params.id).maybeSingle());
  if (!existing) throw new HttpError(404, "Mining machine not found");

  const { fields, files } = await readMachineBody(req);
  if (files.length + (existing.images?.length || 0) > 10) throw new HttpError(400, "Too many images");
  const patch: Record<string, any> = machineRow(fields, true);
  if (files.length) patch.images = [...(existing.images || []), ...(await uploadImages(files, "machine-images", "machines"))];
  if (!Object.keys(patch).length) throw new HttpError(400, "Nothing to update");

  const { data, error } = await admin().from("mining_machines").update(patch).eq("id", params.id).select("*").single();
  if (error) throw error;
  return json({ success: true, data: toMachine(data) });
}

export async function deleteMachine(req: NextRequest, { params }: Ctx) {
  await requireAdmin(req);
  if (!isUuid(params.id)) throw new HttpError(404, "Mining machine not found");
  const { data, error } = await admin().from("mining_machines").delete().eq("id", params.id).select("id");
  if (error) {
    if ((error as any).code === "23503") throw new HttpError(409, "This machine has share purchases and cannot be deleted");
    throw error;
  }
  if (!data?.length) throw new HttpError(404, "Mining machine not found");
  return json({ success: true, message: "Mining machine deleted successfully" });
}

// ------------------------------------------------------------ user machines
export async function populate(rows: any[]) {
  const db = admin();
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const machineIds = [...new Set(rows.map((r) => r.machine_id).filter(Boolean))];
  const [u, m] = await Promise.all([
    userIds.length ? db.from("profiles").select("id, first_name, last_name, email").in("id", userIds) : { data: [] as any[], error: null },
    machineIds.length ? db.from("mining_machines").select("id, machine_name").in("id", machineIds) : { data: [] as any[], error: null },
  ]);
  const users = new Map((must(u) || []).map((x: any) => [x.id, x]));
  const machines = new Map((must(m) || []).map((x: any) => [x.id, x]));
  return rows.map((r) => toUserMachine(r, users.get(r.user_id), machines.get(r.machine_id)));
}

export async function assignMachine(req: NextRequest) {
  await requireAdmin(req);
  const { userId, machineId, quantity = 1 } = await readJson(req);
  if (!isUuid(userId) || !isUuid(machineId) || !isPositiveInt(quantity) || quantity > 100)
    throw new HttpError(400, "User ID, Machine ID, and valid quantity are required");

  const db = admin();
  const [{ data: user }, { data: m }] = await Promise.all([
    db.from("profiles").select("*").eq("id", userId).maybeSingle(),
    db.from("mining_machines").select("*").eq("id", machineId).maybeSingle(),
  ]);
  if (!user) throw new HttpError(404, "User not found");
  if (!m) throw new HttpError(404, "Machine not found");

  const rows = Array.from({ length: quantity }, () => ({
    user_id: userId, machine_id: machineId, status: "active", machine_name: m.machine_name, hashrate: m.hashrate,
    power_consumption: m.power_consumption, price_range: m.price_range, coins_mined: m.coins_mined,
    monthly_profit: m.monthly_profit, description: m.description, images: m.images,
  }));
  const { data: created, error } = await db.from("user_machines").insert(rows).select("*");
  if (error) throw error;

  sendEmail(user.email, "New Mining Machines Assigned", layout("New Mining Machines Assigned",
    p(`Hi ${escapeHtml(`${user.first_name} ${user.last_name}`.trim()) || "there"},`) +
    p(`You have been assigned <b>${quantity}</b> × <b>${escapeHtml(m.machine_name)}</b>. Your mining capacity has been updated in your dashboard.`) +
    p("If you did not authorize this assignment, please contact support immediately."))
  ).catch((e) => console.error("[assign] email failed", e)); // best effort; never blocks the assignment

  return json(await populate(created!), 201);
}

export async function getUserMachines(req: NextRequest, { params }: Ctx) {
  const me = await requireUser(req);
  let target: string | null = null;
  if (isUuid(params.userId)) target = params.userId;
  else if (isStr(params.userId)) {
    const data = must(await admin().from("profiles").select("id").eq("email", decodeURIComponent(params.userId).toLowerCase()).maybeSingle());
    target = data?.id ?? null;
  }
  // same answer for "missing" and "not yours"
  if (!target || (me.id !== target && me.role !== "admin")) throw new HttpError(404, "User not found");

  const { data, error } = await admin().from("user_machines").select("*").eq("user_id", target).order("created_at", { ascending: false });
  if (error) throw error;
  return json(await populate(data || []));
}

export async function getAllUserMachines(req: NextRequest) {
  await requireAdmin(req);
  const { data, error } = await admin().from("user_machines").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return json(await populate(data || []));
}

export async function removeUserMachine(req: NextRequest, { params }: Ctx) {
  await requireAdmin(req);
  if (!isUuid(params.userMachineId)) throw new HttpError(404, "User Machine assignment not found");
  const { data, error } = await admin().from("user_machines").delete().eq("id", params.userMachineId).select("*");
  if (error) throw error;
  if (!data?.length) throw new HttpError(404, "User Machine assignment not found");
  return json({ message: "Machine assignment removed successfully", removedUserMachine: toUserMachine(data[0]) });
}

// ------------------------------------------------------------------- profit
export async function getProfitStatus(req: NextRequest, { params }: Ctx) {
  const me = await requireUser(req);
  if (!isUuid(params.userMachineId)) throw new HttpError(404, "User machine assignment not found");
  const um = must(await admin().from("user_machines").select("*").eq("id", params.userMachineId).maybeSingle());
  if (!um || (um.user_id !== me.id && me.role !== "admin")) throw new HttpError(404, "User machine assignment not found");
  const owner = must(await admin().from("profiles").select("first_name, last_name").eq("id", um.user_id).single());

  const last = new Date(um.last_profit_update || um.assigned_date);
  const days = Math.floor((Date.now() - last.getTime()) / 86400000);
  return json({
    userMachineId: um.id, userName: `${owner?.first_name} ${owner?.last_name}`, machineName: um.machine_name,
    lastUpdateDate: last, hoursSinceLastUpdate: days, hoursUntilNextUpdate: Math.max(0, 30 - days),
    currentAccumulatedProfit: Number(um.monthly_profit_accumulated), status: um.status,
  });
}

export async function updateMonthlyProfit(req: NextRequest, { params }: Ctx) {
  const me = await requireUser(req);
  if (!isUuid(params.userMachineId)) throw new HttpError(404, "User machine not found");
  const { data, error } = await admin().rpc("fn_pay_user_machine_profit", { p_actor: me.id, p_um: params.userMachineId });
  if (error) throw error;
  if (!data.paid) {
    return json({ message: "Too soon for next update", daysUntilNextUpdate: data.daysUntilNextUpdate, nextUpdateDate: data.nextUpdateDate });
  }
  return json({
    message: "Profit updated successfully", profitAdded: data.profitAdded, newMachineTotal: data.newMachineTotal,
    newBalance: { total: Number(data.balance.total_balance), mining: Number(data.balance.mining_balance), adminAdd: Number(data.balance.admin_add) },
  });
}

export async function manualProfitUpdate(req: NextRequest, { params }: Ctx) {
  const adminUser = await requireAdmin(req);
  const { profitAmount } = await readJson(req);
  const amount = Number(profitAmount);
  if (!isUuid(params.userMachineId) || !Number.isFinite(amount) || amount === 0) throw new HttpError(400, "Valid profit amount is required");
  const { data, error } = await admin().rpc("fn_manual_profit_accrual", { p_admin: adminUser.id, p_um: params.userMachineId, p_amount: amount });
  if (error) throw error;
  return json({ message: "Profit manually updated successfully", profitAdded: data.profitAdded, newTotal: data.newTotal });
}

export async function getProfitPercentages(req: NextRequest, { params }: Ctx) {
  const me = await requireUser(req);
  assertSelfOrAdmin(me, params.userId);
  const { data, error } = await admin().from("user_machines").select("*").eq("user_id", params.userId).eq("status", "active");
  if (error) throw error;
  if (!data.length) return json({ machines: [], totalProfit: 0 });
  const total = data.reduce((s, m) => s + Number(m.monthly_profit_accumulated), 0);
  return json({
    machines: data.map((m) => ({
      machineId: m.id, machineName: m.machine_name, profit: Number(m.monthly_profit_accumulated),
      percentage: total > 0 ? ((Number(m.monthly_profit_accumulated) / total) * 100).toFixed(2) : 0,
      monthlyProfitRate: Number(m.monthly_profit), lastUpdate: m.last_profit_update || m.assigned_date,
    })),
    totalProfit: total, machineCount: data.length, timestamp: new Date(),
  });
}

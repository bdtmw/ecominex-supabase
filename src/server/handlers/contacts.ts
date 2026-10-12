import { NextRequest } from "next/server";
import { admin, must } from "../supabase";
import { requireAdmin } from "../auth";
import { HttpError, Ctx, json, readJson, isStr, isUuid, pageParams, rateLimit } from "../http";
import { toContact } from "../mappers";

export async function createContact(req: NextRequest) {
  rateLimit(req, "contact", 10);
  const b = await readJson(req);
  const f = ["name", "email", "phone", "country", "comment"] as const;
  if (!f.every((k) => isStr(b[k]) && b[k].trim())) throw new HttpError(400, "Name, email, phone, country and comment are required");
  if (b.comment.length > 5000 || b.name.length > 200 || b.email.length > 320) throw new HttpError(400, "Submission too long");

  const { data, error } = await admin().from("contacts").insert({
    name: b.name.trim(), email: b.email.trim(), phone: b.phone.trim(), country: b.country.trim(), comment: b.comment.trim(),
  }).select("*").single();
  if (error) throw error;
  return json({ message: "Contact form submitted successfully", contact: toContact(data) }, 201);
}

export async function getAllContacts(req: NextRequest) {
  await requireAdmin(req);
  const { page, limit, from, to } = pageParams(req, 10);
  const status = req.nextUrl.searchParams.get("status");
  let q = admin().from("contacts").select("*, reader:profiles!contacts_read_by_fkey(id, first_name, last_name, email)", { count: "exact" });
  if (status && ["pending", "read", "archived"].includes(status)) q = q.eq("status", status);
  const { data, count, error } = await q.order("created_at", { ascending: false }).range(from, to);
  if (error) throw error;
  return json({
    contacts: (data || []).map((c: any) => toContact(c, c.reader)),
    pagination: { currentPage: page, totalPages: Math.ceil((count || 0) / limit), totalItems: count || 0, itemsPerPage: limit },
  });
}

export async function getContactStats(req: NextRequest) {
  await requireAdmin(req);
  const { data, error } = await admin().from("contacts").select("status, created_at");
  if (error) throw error;
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const counts = new Map<string, number>();
  for (const c of data) counts.set(c.status, (counts.get(c.status) || 0) + 1);
  return json({
    totalContacts: data.length,
    todayContacts: data.filter((c) => new Date(c.created_at) >= start).length,
    statusBreakdown: [...counts].map(([_id, count]) => ({ _id, count })),
  });
}

export async function getContact(req: NextRequest, { params }: Ctx) {
  await requireAdmin(req);
  if (!isUuid(params.id)) throw new HttpError(404, "Contact not found");
  const data = must(await admin().from("contacts").select("*, reader:profiles!contacts_read_by_fkey(id, first_name, last_name, email)").eq("id", params.id).maybeSingle());
  if (!data) throw new HttpError(404, "Contact not found");
  return json(toContact(data, (data as any).reader));
}

export async function markAsRead(req: NextRequest, { params }: Ctx) {
  const adminUser = await requireAdmin(req);
  if (!isUuid(params.id)) throw new HttpError(404, "Contact not found");
  const { data, error } = await admin().from("contacts").update({ status: "read", read_by: adminUser.id, read_at: new Date().toISOString() })
    .eq("id", params.id).select("*").maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(404, "Contact not found");
  return json({ message: "Contact marked as read", contact: toContact(data) });
}

export async function deleteContact(req: NextRequest, { params }: Ctx) {
  await requireAdmin(req);
  if (!isUuid(params.id)) throw new HttpError(404, "Contact not found");
  const { data, error } = await admin().from("contacts").delete().eq("id", params.id).select("*").maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(404, "Contact not found");
  return json({ message: "Contact deleted successfully", contact: toContact(data) });
}

import { NextRequest, NextResponse } from "next/server";

export class HttpError extends Error {
  constructor(public status: number, message: string, public extra?: Record<string, unknown>) {
    super(message);
  }
}

export const json = (body: unknown, status = 200, headers?: Record<string, string>) =>
  NextResponse.json(body, { status, headers });

export type Ctx = { params: Record<string, string> };
export type Handler = (req: NextRequest, ctx: Ctx) => Promise<Response>;

// Postgres error codes raised by the SQL money functions (see supabase/migrations/0002).
const PG_STATUS: Record<string, number> = { P0001: 400, P0002: 404, "42501": 403, "23514": 400, "23505": 409, "23503": 404 };

/** Wraps a handler: consistent JSON errors, no stack traces or internals leaked. */
export function route(handler: Handler) {
  return async (req: NextRequest, ctx: { params: Record<string, string> }) => {
    try {
      return await handler(req, ctx);
    } catch (e: any) {
      if (e instanceof HttpError) {
        return json({ message: e.message, ...(e.extra || {}) }, e.status);
      }
      const status = PG_STATUS[e?.code];
      if (status) {
        const extra = e.details && !Number.isNaN(Number(e.details)) ? { available: Number(e.details) } : {};
        return json({ message: e.message, ...extra }, status);
      }
      console.error(`[api] ${req.method} ${req.nextUrl.pathname}`, e);
      return json({ message: "Server error" }, 500);
    }
  };
}

export async function readJson<T = any>(req: NextRequest): Promise<T> {
  try {
    const body = await req.json();
    return (body && typeof body === "object" ? body : {}) as T;
  } catch {
    return {} as T;
  }
}

export const isStr = (v: unknown): v is string => typeof v === "string";
export const isUuid = (v: unknown): v is string =>
  typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
export const isPositiveNumber = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n > 0;
export const isPositiveInt = (n: unknown): n is number => Number.isInteger(n) && (n as number) > 0;

export const escapeHtml = (v: unknown) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

export function pageParams(req: NextRequest, defLimit = 20, maxLimit = 100) {
  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(sp.get("limit") || String(defLimit), 10) || defLimit));
  return { page, limit, from: (page - 1) * limit, to: (page - 1) * limit + limit - 1 };
}

// ---- tiny in-memory rate limiter (per instance). Use an external store for strict limits.
const buckets = new Map<string, { count: number; reset: number }>();
export function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
}
export function rateLimit(req: NextRequest, key: string, max: number, windowMs = 15 * 60 * 1000) {
  const id = `${key}:${clientIp(req)}`;
  const now = Date.now();
  let b = buckets.get(id);
  if (!b || b.reset <= now) {
    b = { count: 0, reset: now + windowMs };
    buckets.set(id, b);
    if (buckets.size > 5000) for (const [k, v] of buckets) if (v.reset <= now) buckets.delete(k);
  }
  if (++b.count > max) {
    throw new HttpError(429, "Too many requests, please try again later.");
  }
}

/** The ledger only shows activity from this day on (UTC). Override with LEDGER_START_DATE=YYYY-MM-DD, or "off" to show everything. */
export const DEFAULT_LEDGER_START = "2026-05-25";

export function ledgerStart(raw: string | undefined = process.env.LEDGER_START_DATE): Date | null {
  const v = (raw || DEFAULT_LEDGER_START).trim().toLowerCase();
  if (v === "off" || v === "none") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** The effective lower bound for a ledger query: the requested one, but never earlier than the ledger start. */
export function clampFrom(from: string | null, start: Date | null): string | null {
  if (!start) return from;
  if (!from || new Date(from).getTime() < start.getTime()) return start.toISOString();
  return from;
}

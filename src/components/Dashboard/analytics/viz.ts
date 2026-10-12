// Design tokens for the admin charts. The admin area is dark-only, so these are the *dark* values
// of the validated palette, checked against the card surface (#1e1e1e): see PR notes.
export const VIZ = {
  surface: "#1e1e1e",
  text: "#f0efec",
  textSecondary: "#c3c2b7",
  muted: "#898781",
  grid: "#2c2c2a",
  axis: "#383835",
  // categorical slots (fixed order, color follows the entity everywhere)
  deposits: "#3987e5",     // slot 1 blue
  withdrawals: "#d95926",  // slot 2 orange
  investments: "#9085e9",  // slot 7 violet
  profit: "#199e70",       // slot 3 aqua
  users: "#3987e5",        // single-series chart: slot 1
  // status (icon + label always accompany these)
  good: "#0ca30c",
  warning: "#fab219",
  serious: "#ec835a",
  critical: "#d03b3b",
} as const;

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const usd2 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const money = (n: number | null | undefined) => (n == null || Number.isNaN(Number(n)) ? "—" : usd.format(Number(n)));
export const money2 = (n: number | null | undefined) => (n == null || Number.isNaN(Number(n)) ? "—" : usd2.format(Number(n)));
export const num = (n: number | null | undefined) => (n == null ? "—" : new Intl.NumberFormat("en-US").format(Number(n)));

/** 1,000 → 1K, 1,250,000 → 1.3M (axis ticks and tile values). */
export function compact(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e9) return `${trim(n / 1e9)}B`;
  if (a >= 1e6) return `${trim(n / 1e6)}M`;
  if (a >= 1e3) return `${trim(n / 1e3)}K`;
  return String(Math.round(n * 100) / 100);
}
const trim = (v: number) => String(Math.round(v * 10) / 10);
export const compactMoney = (n: number) => `${n < 0 ? "-" : ""}$${compact(Math.abs(n))}`;

export type DeltaInfo = { text: string; dir: "up" | "down" | "flat" };

/** Change vs the previous period. Previous = 0 is "new" rather than an infinite percentage. */
export function delta(cur: number, prev: number): DeltaInfo {
  if (!prev && !cur) return { text: "no change", dir: "flat" };
  if (!prev) return { text: "new", dir: "up" };
  const pct = ((cur - prev) / Math.abs(prev)) * 100;
  if (Math.abs(pct) < 0.05) return { text: "0%", dir: "flat" };
  return { text: `${Math.abs(pct) >= 100 ? Math.round(Math.abs(pct)) : Math.abs(Math.round(pct * 10) / 10)}%`, dir: pct > 0 ? "up" : "down" };
}

/** Round the top of an axis to a "nice" number and return evenly spaced ticks. */
export function niceScale(max: number, ticks = 4): { max: number; ticks: number[] } {
  if (!(max > 0)) return { max: 1, ticks: [0, 1] };
  const raw = max / ticks;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const f = raw / pow;
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * pow;
  const top = Math.ceil(max / step) * step;
  const out: number[] = [];
  for (let v = 0; v <= top + step / 2; v += step) out.push(Math.round(v * 1e6) / 1e6);
  return { max: top, ticks: out };
}

export const shortDate = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
};

export function ageLabel(fromIso: string | null | undefined, now = Date.now()): string {
  if (!fromIso) return "—";
  const h = Math.max(0, (now - new Date(fromIso).getTime()) / 3600000);
  if (h < 1) return "under 1h";
  if (h < 48) return `${Math.floor(h)}h`;
  return `${Math.floor(h / 24)}d ${Math.floor(h % 24)}h`;
}

"use client";

import React, { useEffect, useRef, useState } from "react";
import { Calendar, Check, ChevronDown } from "lucide-react";
import { VIZ } from "./viz";

export const RANGES = [
  { id: "today", label: "Today" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
  { id: "12m", label: "Last 12 months" },
  { id: "ytd", label: "Year to date" },
] as const;

interface Props { range: string; from: string; to: string; allowAll?: boolean; onChange: (r: { range: string; from?: string; to?: string }) => void }

/** Presets as rows (selected = check), custom range tucked behind a hairline in the footer. */
export default function RangePicker({ range, from, to, allowAll, onChange }: Props) {
  const presets = allowAll ? [{ id: "all", label: "All time" }, ...RANGES] : [...RANGES];
  const [open, setOpen] = useState(false);
  const [cFrom, setCFrom] = useState(from);
  const [cTo, setCTo] = useState(to);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", away); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [open]);

  const label = range === "custom" && from && to ? `${from} → ${to}` : presets.find((r) => r.id === range)?.label ?? "Last 30 days";
  const validCustom = !!cFrom && !!cTo && cFrom <= cTo;

  return (
    <div ref={box} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open}
        className="flex items-center gap-2 rounded-lg border bg-[#1e1e1e] px-3 py-2 text-sm text-white transition hover:border-green-500/50" style={{ borderColor: VIZ.axis }}>
        <Calendar className="h-4 w-4" style={{ color: VIZ.textSecondary }} aria-hidden />{label}<ChevronDown className="h-4 w-4" style={{ color: VIZ.muted }} aria-hidden />
      </button>
      {open && (
        <div role="listbox" aria-label="Date range" className="absolute left-0 z-30 mt-2 w-64 overflow-hidden rounded-xl border bg-[#161616] shadow-2xl" style={{ borderColor: VIZ.axis }}>
          {presets.map((r) => (
            <button key={r.id} role="option" aria-selected={range === r.id} onClick={() => { onChange({ range: r.id }); setOpen(false); }}
              className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm text-gray-200 hover:bg-white/5">
              {r.label}{range === r.id && <Check className="h-4 w-4 text-green-400" strokeWidth={3} aria-hidden />}
            </button>
          ))}
          <div className="border-t p-3" style={{ borderColor: VIZ.axis }}>
            <p className="mb-2 flex items-center justify-between text-xs" style={{ color: VIZ.muted }}>Custom range {range === "custom" && <Check className="h-4 w-4 text-green-400" strokeWidth={3} aria-label="selected" />}</p>
            <div className="flex items-center gap-2">
              <input type="date" aria-label="From" value={cFrom} max={cTo || undefined} onChange={(e) => setCFrom(e.target.value)} className="w-full rounded-md border bg-transparent px-2 py-1 text-xs text-white [color-scheme:dark]" style={{ borderColor: VIZ.axis }} />
              <input type="date" aria-label="To" value={cTo} min={cFrom || undefined} onChange={(e) => setCTo(e.target.value)} className="w-full rounded-md border bg-transparent px-2 py-1 text-xs text-white [color-scheme:dark]" style={{ borderColor: VIZ.axis }} />
            </div>
            <button disabled={!validCustom} onClick={() => { onChange({ range: "custom", from: cFrom, to: cTo }); setOpen(false); }}
              className="mt-2 w-full rounded-md bg-green-600 py-1.5 text-xs font-semibold text-white transition enabled:hover:bg-green-500 disabled:opacity-40">Apply</button>
          </div>
        </div>
      )}
    </div>
  );
}

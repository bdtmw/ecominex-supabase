"use client";

import React, { useMemo, useState } from "react";
import { VIZ, niceScale, shortDate } from "./viz";
import { useWidth } from "./useWidth";
import type { Point } from "./LineChart";

interface Props {
  title: string;
  points: Point[];
  valueKey: string;
  label: string;
  color?: string;
  loading?: boolean;
  height?: number;
  emptyText?: string;
}

const M = { l: 34, r: 10, t: 10, b: 26 };

/** Single-series columns: <= 24px wide, 4px rounded top, square at the baseline, per-bar hover tooltip. */
export default function ColumnChart({ title, points, valueKey, label, color = VIZ.users, loading, height = 250, emptyText = "No activity in this period" }: Props) {
  const { ref, width } = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const n = points.length;
  const plotW = Math.max(10, width - M.l - M.r);
  const plotH = height - M.t - M.b;
  const slot = n ? plotW / n : plotW;
  const bw = Math.max(2, Math.min(24, slot * 0.6));

  const { scale, empty } = useMemo(() => {
    const max = Math.max(0, ...points.map((p) => Number(p[valueKey]) || 0));
    return { scale: niceScale(Math.max(max, 1), 3), empty: max === 0 };
  }, [points, valueKey]);
  const y = (v: number) => M.t + plotH - (v / scale.max) * plotH;
  const base = M.t + plotH;

  const xTicks = useMemo(() => {
    const count = Math.min(n, width < 480 ? 4 : 7);
    return n ? Array.from(new Set(Array.from({ length: count }, (_, k) => Math.round((k * (n - 1)) / Math.max(1, count - 1))))) : [];
  }, [n, width]);

  const barPath = (cx: number, v: number) => {
    const h = base - y(v);
    if (h <= 0) return "";
    const r = Math.min(4, h, bw / 2), x0 = cx - bw / 2, top = base - h;
    return `M${x0},${base} V${top + r} a${r},${r} 0 0 1 ${r},${-r} h${bw - 2 * r} a${r},${r} 0 0 1 ${r},${r} V${base} Z`;
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (!n) return;
    if (e.key === "ArrowRight") { e.preventDefault(); setHover((h) => Math.min(n - 1, (h ?? -1) + 1)); }
    if (e.key === "ArrowLeft") { e.preventDefault(); setHover((h) => Math.max(0, (h ?? n) - 1)); }
    if (e.key === "Escape") setHover(null);
  };
  const active = hover !== null ? points[hover] : null;

  return (
    <div ref={ref} className="relative w-full min-w-0 overflow-hidden" style={{ opacity: loading ? 0.55 : 1, transition: "opacity .15s" }}>
      <svg width={width} height={height} role="img" tabIndex={0} aria-label={`${title}. Use left and right arrow keys to read values.`} onKeyDown={onKey}
           onBlur={() => setHover(null)} onFocus={() => hover === null && n > 0 && setHover(n - 1)} className="block outline-none focus-visible:ring-1 focus-visible:ring-white/30">
        {scale.ticks.map((t) => (
          <g key={t}>
            <line x1={M.l} x2={width - M.r} y1={y(t)} y2={y(t)} stroke={t === 0 ? VIZ.axis : VIZ.grid} strokeWidth="1" />
            <text x={M.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill={VIZ.muted}>{Number.isInteger(t) ? t : ""}</text>
          </g>
        ))}
        {points.map((p, i) => {
          const cx = M.l + slot * i + slot / 2;
          const v = Number(p[valueKey]) || 0;
          return (
            <g key={p.date}>
              {/* generous hit target: the whole slot, not just the painted bar */}
              <rect x={M.l + slot * i} y={M.t} width={slot} height={plotH} fill="transparent" onPointerEnter={() => setHover(i)} onPointerMove={() => setHover(i)} onPointerLeave={() => setHover(null)} />
              <path d={barPath(cx, v)} fill={color} opacity={hover === null || hover === i ? 1 : 0.55} style={{ filter: hover === i ? "brightness(1.15)" : undefined }} pointerEvents="none" />
            </g>
          );
        })}
        {xTicks.map((i) => (
          <text key={i} x={M.l + slot * i + slot / 2} y={height - 7} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} fontSize="11" fill={VIZ.muted}>{shortDate(points[i].date)}</text>
        ))}
      </svg>
      {empty && !loading && <p className="pointer-events-none absolute inset-x-0 top-1/2 text-center text-sm" style={{ color: VIZ.muted }}>{emptyText}</p>}
      {active && hover !== null && (
        <div role="status" className="pointer-events-none absolute z-10 rounded-lg border px-2.5 py-2 text-xs shadow-xl" style={{ left: Math.min(Math.max(M.l + slot * hover + slot / 2 - 50, 4), width - 110), top: 4, background: "#161616", borderColor: VIZ.axis }}>
          <p style={{ color: VIZ.muted }}>{shortDate(String(active.date))}</p>
          <p className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-sm" style={{ background: color }} aria-hidden /><strong style={{ color: VIZ.text }}>{Number(active[valueKey]) || 0}</strong><span style={{ color: VIZ.textSecondary }}>{label}</span></p>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useId, useMemo, useState } from "react";
import { VIZ, compactMoney, niceScale, shortDate } from "./viz";
import { useWidth } from "./useWidth";

export interface Series { key: string; label: string; color: string }
export interface Point { date: string; [k: string]: number | string }

interface Props {
  title: string;
  points: Point[];
  series: Series[];
  loading?: boolean;
  height?: number;
  format?: (n: number) => string;       // tooltip / table values
  axisFormat?: (n: number) => string;   // y ticks
  emptyText?: string;
}

const M = { l: 48, r: 14, t: 10, b: 26 };

/** Multi-series line chart: 2px lines, hairline grid, crosshair + one tooltip, legend, keyboard and table view. */
export default function LineChart({ title, points, series, loading, height = 250, format = (n) => String(n), axisFormat = compactMoney, emptyText = "No activity in this period" }: Props) {
  const { ref, width } = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const id = useId();

  const n = points.length;
  const plotW = Math.max(10, width - M.l - M.r);
  const plotH = height - M.t - M.b;

  const { scale, empty } = useMemo(() => {
    const max = Math.max(0, ...points.flatMap((p) => series.map((s) => Number(p[s.key]) || 0)));
    return { scale: niceScale(max), empty: max === 0 };
  }, [points, series]);

  const x = (i: number) => M.l + (n <= 1 ? plotW / 2 : (i * plotW) / (n - 1));
  const y = (v: number) => M.t + plotH - (v / scale.max) * plotH;

  const xTicks = useMemo(() => {
    if (n === 0) return [];
    const count = Math.min(n, width < 480 ? 4 : 7);
    return Array.from(new Set(Array.from({ length: count }, (_, k) => Math.round((k * (n - 1)) / Math.max(1, count - 1)))));
  }, [n, width]);

  const nearest = (clientX: number, rect: DOMRect) => {
    const rel = clientX - rect.left - M.l;
    return Math.min(n - 1, Math.max(0, Math.round((rel / plotW) * (n - 1))));
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (n === 0) return;
    if (e.key === "ArrowRight") { e.preventDefault(); setHover((h) => Math.min(n - 1, (h ?? -1) + 1)); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); setHover((h) => Math.max(0, (h ?? n) - 1)); }
    else if (e.key === "Home") { e.preventDefault(); setHover(0); }
    else if (e.key === "End") { e.preventDefault(); setHover(n - 1); }
    else if (e.key === "Escape") setHover(null);
  };

  const active = hover !== null ? points[hover] : null;
  const tipLeft = hover !== null ? Math.min(Math.max(x(hover) + 12, 8), width - 190) : 0;

  return (
    <div ref={ref} className="relative w-full min-w-0 overflow-hidden" style={{ opacity: loading ? 0.55 : 1, transition: "opacity .15s" }}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        {series.length > 1 ? (
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-1" aria-label="Legend">
            {series.map((s) => (
              <li key={s.key} className="flex items-center gap-1.5 text-xs" style={{ color: VIZ.textSecondary }}>
                <svg width="16" height="8" aria-hidden><line x1="0" y1="4" x2="16" y2="4" stroke={s.color} strokeWidth="2" strokeLinecap="round" /></svg>
                {s.label}
              </li>
            ))}
          </ul>
        ) : <span />}
        <button onClick={() => setTable((t) => !t)} aria-pressed={table} className="rounded-md border px-2 py-1 text-xs transition hover:text-white" style={{ borderColor: VIZ.axis, color: VIZ.textSecondary }}>
          {table ? "Show chart" : "Show table"}
        </button>
      </div>

      {table ? (
        <div className="max-h-[260px] overflow-auto rounded-md border" style={{ borderColor: VIZ.axis }}>
          <table className="w-full text-left text-xs" style={{ color: VIZ.textSecondary }}>
            <caption className="sr-only">{title}</caption>
            <thead className="sticky top-0" style={{ background: VIZ.surface }}>
              <tr><th className="px-3 py-2 font-medium">Date</th>{series.map((s) => <th key={s.key} className="px-3 py-2 text-right font-medium">{s.label}</th>)}</tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.date} className="border-t" style={{ borderColor: VIZ.grid }}>
                  <td className="px-3 py-1.5">{shortDate(p.date)}</td>
                  {series.map((s) => <td key={s.key} className="px-3 py-1.5 text-right tabular-nums" style={{ color: VIZ.text }}>{format(Number(p[s.key]) || 0)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <svg
            width={width} height={height} role="img" tabIndex={0} aria-label={`${title}. Use left and right arrow keys to read values.`}
            onKeyDown={onKey} onBlur={() => setHover(null)} onFocus={() => hover === null && n > 0 && setHover(n - 1)}
            onPointerMove={(e) => n > 0 && setHover(nearest(e.clientX, e.currentTarget.getBoundingClientRect()))}
            onPointerLeave={() => setHover(null)}
            className="block touch-pan-y outline-none focus-visible:ring-1 focus-visible:ring-white/30"
          >
            {/* grid + y ticks */}
            {scale.ticks.map((t) => (
              <g key={t}>
                <line x1={M.l} x2={width - M.r} y1={y(t)} y2={y(t)} stroke={t === 0 ? VIZ.axis : VIZ.grid} strokeWidth="1" />
                <text x={M.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill={VIZ.muted}>{axisFormat(t)}</text>
              </g>
            ))}
            {xTicks.map((i) => (
              <text key={i} x={x(i)} y={height - 7} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} fontSize="11" fill={VIZ.muted}>{shortDate(points[i].date)}</text>
            ))}

            {/* crosshair */}
            {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={M.t} y2={M.t + plotH} stroke={VIZ.textSecondary} strokeOpacity="0.45" strokeWidth="1" />}

            {/* series */}
            {series.map((s) => {
              const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(Number(p[s.key]) || 0).toFixed(1)}`).join(" ");
              return <path key={s.key} d={d} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />;
            })}
            {/* end / hover dots: >= 8px with a 2px surface ring */}
            {series.map((s) => {
              const i = hover ?? n - 1;
              if (i < 0 || !points[i]) return null;
              return <circle key={s.key} cx={x(i)} cy={y(Number(points[i][s.key]) || 0)} r="4" fill={s.color} stroke={VIZ.surface} strokeWidth="2" />;
            })}
          </svg>
          {empty && !loading && <p className="pointer-events-none absolute inset-x-0 top-1/2 text-center text-sm" style={{ color: VIZ.muted }}>{emptyText}</p>}
          {active && (
            <div role="status" className="pointer-events-none absolute z-10 w-44 rounded-lg border p-2.5 text-xs shadow-xl" style={{ left: tipLeft, top: 36, background: "#161616", borderColor: VIZ.axis }}>
              <p className="mb-1.5" style={{ color: VIZ.muted }}>{shortDate(String(active.date))}</p>
              {series.map((s) => (
                <p key={s.key} className="flex items-center justify-between gap-2 py-0.5">
                  <span className="flex items-center gap-1.5" style={{ color: VIZ.textSecondary }}>
                    <svg width="12" height="6" aria-hidden><line x1="0" y1="3" x2="12" y2="3" stroke={s.color} strokeWidth="2" strokeLinecap="round" /></svg>{s.label}
                  </span>
                  <strong className="tabular-nums" style={{ color: VIZ.text }}>{format(Number(active[s.key]) || 0)}</strong>
                </p>
              ))}
            </div>
          )}
        </>
      )}
      <span id={id} className="sr-only" aria-live="polite">{active ? `${shortDate(String(active.date))}: ${series.map((s) => `${s.label} ${format(Number(active[s.key]) || 0)}`).join(", ")}` : ""}</span>
    </div>
  );
}

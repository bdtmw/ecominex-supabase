import React from "react";
import { VIZ } from "./viz";

/** 12-ish point trend: de-emphasised line, the latest point in the accent colour. */
export default function Sparkline({ values, accent = VIZ.deposits, width = 96, height = 28 }: { values: number[]; accent?: string; width?: number; height?: number }) {
  if (values.length < 2 || values.every((v) => v === 0)) return <svg width={width} height={height} aria-hidden />;
  // downsample to <= 24 points by summing neighbours so busy ranges stay readable
  const step = Math.ceil(values.length / 24);
  const v = step > 1 ? Array.from({ length: Math.ceil(values.length / step) }, (_, i) => values.slice(i * step, i * step + step).reduce((a, b) => a + b, 0)) : values;
  const max = Math.max(...v), min = Math.min(...v);
  const span = max - min || 1;
  const px = (i: number) => 2 + (i * (width - 4)) / (v.length - 1);
  const py = (val: number) => height - 3 - ((val - min) / span) * (height - 6);
  const d = v.map((val, i) => `${i ? "L" : "M"}${px(i).toFixed(1)},${py(val).toFixed(1)}`).join(" ");
  return (
    <svg width={width} height={height} aria-hidden>
      <path d={d} fill="none" stroke={VIZ.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={px(v.length - 1)} cy={py(v[v.length - 1])} r="3" fill={accent} stroke={VIZ.surface} strokeWidth="2" />
    </svg>
  );
}

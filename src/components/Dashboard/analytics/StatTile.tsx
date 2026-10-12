import React from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { VIZ, type DeltaInfo } from "./viz";
import Sparkline from "./Sparkline";

interface Props {
  label: string;
  value: string;
  delta?: DeltaInfo;
  /** is an increase good, bad, or just informational (e.g. withdrawals paid)? decides the delta colour */
  upIs?: "good" | "bad" | "neutral";
  sub?: string;
  spark?: number[];
  accent?: string;
  hero?: boolean;
  loading?: boolean;
}

export default function StatTile({ label, value, delta, upIs = "good", sub, spark, accent, hero, loading }: Props) {
  const tone = (() => {
    if (!delta || delta.dir === "flat" || upIs === "neutral") return VIZ.textSecondary;
    const good = (delta.dir === "up") === (upIs === "good");
    return good ? VIZ.good : VIZ.critical;
  })();
  const Icon = delta?.dir === "up" ? ArrowUpRight : delta?.dir === "down" ? ArrowDownRight : Minus;

  return (
    <div className="min-w-0 rounded-2xl bg-[#1e1e1e] p-4" style={{ opacity: loading ? 0.6 : 1, transition: "opacity .15s" }}>
      <p className="text-sm" style={{ color: VIZ.textSecondary }}>{label}</p>
      <div className="mt-1 flex items-end justify-between gap-2">
        <p className={`font-semibold leading-tight ${hero ? "text-[48px]" : "text-[26px]"}`} style={{ color: VIZ.text }}>{value}</p>
        {spark && !hero && <Sparkline values={spark} accent={accent} />}
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs" style={{ color: VIZ.muted }}>
        {delta && (
          <span className="inline-flex items-center gap-0.5 font-medium" style={{ color: tone }} aria-label={`${delta.dir === "flat" ? "unchanged" : delta.dir === "up" ? "up" : "down"} ${delta.text} versus previous period`}>
            <Icon className="h-3.5 w-3.5" aria-hidden />{delta.text}
          </span>
        )}
        {delta && <span>vs previous period</span>}
        {sub && <span>{delta ? "· " : ""}{sub}</span>}
      </div>
    </div>
  );
}

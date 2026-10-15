"use client";

import React from "react";
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, ArrowRight } from "lucide-react";
import { money2 } from "@/components/Dashboard/analytics/viz";
import { useAdminFetch } from "@/components/Dashboard/analytics/useAdminFetch";

/** The user's latest money movements of EVERY kind (deposits, purchases, profit, sales, withdrawals, bonuses), from their ledger. */
export default function RecentActivity({ limit = 8, bordered = false }: { limit?: number; bordered?: boolean }) {
  const { data, loading, error } = useAdminFetch<any>(`/api/v1/my-ledger?limit=${limit}`);
  const rows: any[] = data?.rows || [];

  if (loading && !data) return <p className="text-white">Loading…</p>;
  if (error) return <p className="text-red-500">Could not load your activity</p>;
  if (rows.length === 0) return <p className="text-slate-400">No activity yet</p>;

  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.id} className={`flex items-center justify-between gap-3 ${bordered ? "rounded-lg border border-slate-700 p-3" : "border-b border-slate-700/30 pb-3 last:border-0 last:pb-0"}`}>
          <div className="flex min-w-0 items-center gap-2">
            {r.direction === "credit" ? <ArrowDownLeft className="h-4 w-4 shrink-0 text-emerald-400" aria-label="money in" /> : <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400" aria-label="money out" />}
            <div className="min-w-0">
              <p className="truncate font-medium text-white">{r.typeLabel}</p>
              <p className="truncate text-xs text-slate-400">{new Date(r.date).toLocaleString()}{r.description ? ` · ${r.description}` : ""}</p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className={`font-bold ${r.status === "rejected" ? "text-slate-500 line-through" : r.direction === "credit" ? "text-emerald-400" : "text-white"}`}>
              {r.direction === "credit" ? "+" : "−"}{money2(r.amount)}
            </p>
            {(r.status === "pending" || r.status === "rejected") && <p className={`text-xs ${r.status === "pending" ? "text-yellow-400" : "text-[#ff0000]"}`}>{r.status}</p>}
          </div>
        </div>
      ))}
      <Link href="/user/ledger" className="inline-flex items-center gap-1 pt-1 text-sm text-green-400 hover:underline">View full ledger <ArrowRight className="h-4 w-4" aria-hidden /></Link>
    </div>
  );
}

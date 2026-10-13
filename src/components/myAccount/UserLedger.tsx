"use client";

import React, { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, Clock, Info, XCircle } from "lucide-react";
import { VIZ, money, money2, num } from "@/components/Dashboard/analytics/viz";
import { useAdminFetch } from "@/components/Dashboard/analytics/useAdminFetch";

const TYPES = [
  { id: "", label: "All activity" }, { id: "deposit", label: "Deposits" }, { id: "withdrawal", label: "Withdrawals" },
  { id: "purchase", label: "Purchases" }, { id: "profit", label: "Mining profit" }, { id: "sale", label: "Sales" }, { id: "referral", label: "Referral bonuses" }, { id: "adjustment", label: "Corrections" },
];

export default function UserLedger() {
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const qs = new URLSearchParams({ page: String(page), limit: "25" });
  if (category) qs.set("category", category);
  const { data, loading, error } = useAdminFetch<any>(`/api/v1/my-ledger?${qs}`);
  const rows: any[] = data?.rows || [];
  const t = data?.totals;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select aria-label="Type" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          className="rounded-lg border border-white/10 bg-[#1e1e1e] px-3 py-2 text-sm text-white outline-none focus:border-green-500/60">
          {TYPES.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
        </select>
        <p className="ml-auto flex items-center gap-1.5 text-xs text-gray-400">
          {data ? `${num(data.total)} entr${data.total === 1 ? "y" : "ies"}` : ""}
          <span title="Pending withdrawals are on hold until approved. Rejected ones do not change your balance."><Info className="h-3.5 w-3.5" aria-label="How entries are counted" /></span>
        </p>
      </div>

      {error && <div role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

      <dl className="flex flex-wrap items-center gap-x-8 gap-y-2 rounded-2xl bg-[#1e1e1e] px-4 py-3" style={{ opacity: loading ? 0.6 : 1 }}>
        {[
          { label: "Current balance", value: data ? money2(data.balance) : "—", color: VIZ.text },
          { label: "Money in", value: t ? money(t.credits) : "—", color: VIZ.good },
          { label: "Money out", value: t ? money(t.debits) : "—", color: VIZ.text },
          { label: "On hold (pending withdrawals)", value: t ? money(t.pendingHold) : "—", color: t?.pendingHold > 0 ? VIZ.warning : VIZ.text },
        ].map((x) => (
          <div key={x.label}><dt className="text-xs" style={{ color: VIZ.muted }}>{x.label}</dt><dd className="text-lg font-semibold tabular-nums" style={{ color: x.color }}>{x.value}</dd></div>
        ))}
      </dl>

      <div className="relative overflow-x-auto rounded-2xl bg-[#1e1e1e]" style={{ opacity: loading ? 0.6 : 1 }}>
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b text-xs" style={{ borderColor: VIZ.grid, color: VIZ.muted }}>
              <th className="px-4 py-3 font-medium">When</th><th className="px-4 py-3 font-medium">Activity</th>
              <th className="px-4 py-3 text-right font-medium">Amount</th><th className="px-4 py-3 text-right font-medium">Balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b align-top" style={{ borderColor: VIZ.grid }}>
                <td className="whitespace-nowrap px-4 py-3 text-xs" style={{ color: VIZ.textSecondary }}>
                  {new Date(r.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  <span className="block" style={{ color: VIZ.muted }}>{new Date(r.date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
                </td>
                <td className="max-w-[320px] px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 text-white">
                    {r.direction === "credit" ? <ArrowDownLeft className="h-4 w-4 shrink-0" style={{ color: VIZ.good }} aria-label="money in" /> : <ArrowUpRight className="h-4 w-4 shrink-0" style={{ color: VIZ.textSecondary }} aria-label="money out" />}
                    {r.typeLabel}
                  </span>
                  {r.description && <span className="mt-0.5 block truncate text-xs" style={{ color: VIZ.muted }} title={r.description}>{r.description}</span>}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <span className="block font-medium tabular-nums" style={{ color: r.status === "rejected" ? VIZ.muted : r.direction === "credit" ? VIZ.good : VIZ.text, textDecoration: r.status === "rejected" ? "line-through" : undefined }}>
                    {r.direction === "credit" ? "+" : "−"}{money2(r.amount)}
                  </span>
                  {r.status === "pending" && <span className="mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]" style={{ borderColor: VIZ.warning, color: VIZ.warning }}><Clock className="h-3 w-3" aria-hidden />Pending</span>}
                  {r.status === "rejected" && <span className="mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]" style={{ borderColor: VIZ.muted, color: VIZ.textSecondary }}><XCircle className="h-3 w-3" aria-hidden />Rejected</span>}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums" style={{ color: VIZ.textSecondary }}>{r.balanceAfter == null ? "—" : money2(r.balanceAfter)}</td>
              </tr>
            ))}
            {data && rows.length === 0 && <tr><td colSpan={4} className="px-4 py-14 text-center" style={{ color: VIZ.muted }}>No activity yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {data && data.totalPages > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-between text-sm text-gray-300">
          <span>Page {data.page} of {data.totalPages}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 disabled:opacity-40"><ChevronLeft className="h-4 w-4" aria-hidden />Previous</button>
            <button disabled={page >= data.totalPages} onClick={() => setPage(page + 1)} className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 disabled:opacity-40">Next<ChevronRight className="h-4 w-4" aria-hidden /></button>
          </div>
        </nav>
      )}
    </div>
  );
}

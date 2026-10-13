"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle, Check, ChevronLeft, ChevronRight, Clock, ExternalLink, Search, XCircle } from "lucide-react";
import { VIZ, money2, num } from "./viz";
import { useAdminFetch } from "./useAdminFetch";
import { useUrlState } from "./useUrlState";

const TABS = [
  { id: "all", label: "All", count: "all" },
  { id: "review", label: "Needs review", count: "review" },
  { id: "progress", label: "In progress", count: "inProgress" },
  { id: "manual", label: "Manual", count: "manual" },
  { id: "credited", label: "Credited", count: "credited" },
] as const;

const tabQuery: Record<string, Record<string, string>> = {
  all: {},
  review: { review: "1" },
  progress: { provider: "nowpayments", status: "creating,waiting,confirming,confirmed,sending" },
  manual: { provider: "manual" },
  credited: { status: "finished,approved" },
};

function Status({ status, review }: { status: string; review: boolean }) {
  if (review) return <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]" style={{ borderColor: VIZ.warning, color: VIZ.warning }}><AlertTriangle className="h-3 w-3" aria-hidden />Needs review</span>;
  if (["finished", "approved"].includes(status)) return <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: VIZ.textSecondary }}><Check className="h-3 w-3" style={{ color: VIZ.good }} aria-hidden />{status === "finished" ? "Credited" : "Approved"}</span>;
  if (["failed", "expired", "refunded", "rejected"].includes(status)) return <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: VIZ.textSecondary }}><XCircle className="h-3 w-3" aria-hidden />{status[0].toUpperCase() + status.slice(1)}</span>;
  return <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: VIZ.textSecondary }}><Clock className="h-3 w-3" aria-hidden />{status[0].toUpperCase() + status.slice(1)}</span>;
}

export default function Deposits() {
  const url = useUrlState();
  const tab = url.get("tab") || "all";
  const page = Math.max(1, parseInt(url.get("page") || "1", 10) || 1);
  const urlSearch = url.get("search");
  const [searchText, setSearchText] = useState(urlSearch);
  useEffect(() => {
    if (searchText === urlSearch) return;
    const t = setTimeout(() => url.set({ search: searchText }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  const p = new URLSearchParams({ ...(tabQuery[tab] || {}), page: String(page), limit: "25" });
  if (urlSearch) p.set("search", urlSearch);
  const { data, loading, error } = useAdminFetch<any>(`/api/v1/admin/deposits?${p}`);
  const rows: any[] = data?.rows || [];
  const counts = data?.counts || {};

  return (
    <div className="space-y-4">
      {error && <div role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Deposit views" className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => url.set({ tab: t.id === "all" ? null : t.id })}
              className={`rounded-full border px-3 py-1.5 text-sm ${tab === t.id ? "border-green-400 bg-green-400/10 text-white" : "border-white/10 text-gray-300 hover:border-white/30"}`}>
              {t.label} <span className="tabular-nums text-xs" style={{ color: t.id === "review" && counts[t.count] > 0 ? VIZ.warning : VIZ.muted }}>{num(counts[t.count])}</span>
            </button>
          ))}
        </div>
        <label className="relative ml-auto w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
          <span className="sr-only">Search deposits</span>
          <input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Name, email or payment id"
            className="w-full rounded-xl border border-white/10 bg-[#1e1e1e] py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-green-400" />
        </label>
      </div>

      <div className="relative overflow-x-auto rounded-2xl bg-[#1e1e1e]" style={{ opacity: loading ? 0.6 : 1 }}>
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="text-xs" style={{ color: VIZ.muted }}>
              <th className="px-4 py-3 font-medium">Date</th><th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Method</th><th className="px-4 py-3 text-right font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Details</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center" style={{ color: VIZ.textSecondary }}>{loading ? "Loading…" : "No deposits match."}</td></tr>}
            {rows.map((r) => {
              const review = !!r.reviewNote || r.status === "review" || r.status === "partially_paid";
              return (
                <tr key={r.id} className="border-t border-white/5 align-top" style={review ? { background: "rgba(242,169,0,0.06)" } : undefined}>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-300">{new Date(r.createdAt).toISOString().replace("T", " ").slice(0, 16)}</td>
                  <td className="px-4 py-3"><div className="text-white">{r.userName || "—"}</div><div className="text-xs" style={{ color: VIZ.muted }}>{r.userEmail}</div></td>
                  <td className="px-4 py-3 text-gray-300">{r.provider === "nowpayments" ? `Crypto${r.payCurrency ? ` · ${String(r.payCurrency).toUpperCase()}` : ""}` : "Manual"}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-white">{money2(r.amount)}{r.actuallyPaid != null && Number(r.actuallyPaid) !== Number(r.amount) && <div className="text-xs" style={{ color: VIZ.muted }}>paid {r.actuallyPaid}</div>}</td>
                  <td className="px-4 py-3"><Status status={r.status} review={review} /></td>
                  <td className="px-4 py-3 text-xs" style={{ color: VIZ.textSecondary }}>
                    {r.reviewNote && <p className="mb-1" style={{ color: VIZ.warning }}>{r.reviewNote}</p>}
                    {r.paymentId && <p>Payment {r.paymentId}</p>}
                    {r.reference && <p>Ref {r.reference}</p>}
                    {(r.attachments || []).map((a: any, i: number) => {
                      const href = typeof a === "string" ? a : a?.url;
                      return href ? <a key={i} href={href} target="_blank" rel="noreferrer" className="mr-3 inline-flex items-center gap-1 text-green-400 hover:underline">Proof {i + 1}<ExternalLink className="h-3 w-3" aria-hidden /></a> : null;
                    })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm" style={{ color: VIZ.textSecondary }}>
          <span>{num(data.total)} deposits · page {page} of {data.totalPages}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => url.set({ page: String(page - 1) }, { resetPage: false })} className="rounded-lg border border-white/10 p-1.5 disabled:opacity-40" aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></button>
            <button disabled={page >= data.totalPages} onClick={() => url.set({ page: String(page + 1) }, { resetPage: false })} className="rounded-lg border border-white/10 p-1.5 disabled:opacity-40" aria-label="Next page"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}

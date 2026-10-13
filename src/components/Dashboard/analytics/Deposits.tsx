"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import AddBalanceDialog from "./AddBalanceDialog";
import { AlertTriangle, Check, Plus, ChevronLeft, ChevronRight, Clock, ExternalLink, Search, X, XCircle } from "lucide-react";
import { VIZ, money2, num } from "./viz";
import { useAdminFetch } from "./useAdminFetch";
import { useUrlState } from "./useUrlState";

const TABS = [
  { id: "all", label: "All", count: "all" },
  { id: "review", label: "Needs review", count: "review" },
  { id: "progress", label: "In progress", count: "inProgress" },
  { id: "admin", label: "Admin credits", count: "admin" },
  { id: "manual", label: "Manual requests", count: "manual" },
  { id: "credited", label: "Credited", count: "credited" },
] as const;

const tabQuery: Record<string, Record<string, string>> = {
  all: {},
  review: { review: "1" },
  progress: { provider: "nowpayments", status: "creating,waiting,confirming,confirmed,sending" },
  admin: { provider: "admin" },
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
  const user = url.get("user");
  const pageSize = [25, 50, 100].includes(Number(url.get("size"))) ? Number(url.get("size")) : 50;
  const [searchText, setSearchText] = useState(urlSearch);
  const [adding, setAdding] = useState(false);
  useEffect(() => {
    if (searchText === urlSearch) return;
    const t = setTimeout(() => url.set({ search: searchText }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  const p = new URLSearchParams({ ...(tabQuery[tab] || {}), page: String(page), limit: String(pageSize) });
  if (user) p.set("user", user);
  if (urlSearch) p.set("search", urlSearch);
  const { data, loading, error, refetch } = useAdminFetch<any>(`/api/v1/admin/deposits?${p}`);
  const rows: any[] = data?.rows || [];
  const counts = data?.counts || {};
  const who = user ? (rows[0]?.userName || rows[0]?.userEmail || "this user") : "";
  const firstShown = data && data.total ? (page - 1) * pageSize + 1 : 0;
  const lastShown = data ? Math.min(data.total, page * pageSize) : 0;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setAdding(true)} className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500"><Plus className="h-4 w-4" aria-hidden />Add balance</button>
      </div>
      <AddBalanceDialog open={adding} onClose={() => setAdding(false)} onDone={refetch}
        initialUser={user && rows[0] ? { id: user, name: rows[0].userName || "", email: rows[0].userEmail } : null} />
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
        {user && (
          <span className="inline-flex items-center gap-2 rounded-full border border-green-500/40 bg-green-500/10 px-3 py-1.5 text-sm text-green-300">
            Only {who}
            <Link href={`/Dashboard/AllUser/${user}`} className="underline underline-offset-2">profile</Link>
            <button aria-label="Show all users" onClick={() => url.set({ user: "" })}><X className="h-4 w-4" /></button>
          </span>
        )}
        <label className="relative ml-auto w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
          <span className="sr-only">Search deposits</span>
          <input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Name, email, note or payment id"
            className="w-full rounded-xl border border-white/10 bg-[#1e1e1e] py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-green-400" />
        </label>
      </div>

      {user && data?.sums && (
        <dl className="flex flex-wrap gap-x-8 gap-y-2 rounded-2xl bg-[#1e1e1e] px-4 py-3">
          <div><dt className="text-xs" style={{ color: VIZ.muted }}>Credited to {who}</dt><dd className="text-lg font-semibold tabular-nums" style={{ color: VIZ.good }}>{money2(data.sums.credited)}</dd></div>
          <div><dt className="text-xs" style={{ color: VIZ.muted }}>Total requested</dt><dd className="text-lg font-semibold tabular-nums text-white">{money2(data.sums.requested)}</dd></div>
          <div><dt className="text-xs" style={{ color: VIZ.muted }}>Deposits in view</dt><dd className="text-lg font-semibold tabular-nums text-white">{num(data.total)}</dd></div>
        </dl>
      )}

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
                  <td className="px-4 py-3"><button onClick={() => url.set({ user: r.userId })} title="Show only this user's deposits" className="text-left text-white hover:text-green-400">{r.userName || r.userEmail}</button><div className="text-xs" style={{ color: VIZ.muted }}>{r.userEmail}</div></td>
                  <td className="px-4 py-3 text-gray-300">{r.provider === "nowpayments" ? `Crypto${r.payCurrency ? ` · ${String(r.payCurrency).toUpperCase()}` : ""}` : r.provider === "admin" ? "Admin credit" : "Manual request"}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-white">{money2(r.amount)}{r.actuallyPaid != null && Number(r.actuallyPaid) !== Number(r.amount) && <div className="text-xs" style={{ color: VIZ.muted }}>paid {r.actuallyPaid}</div>}</td>
                  <td className="px-4 py-3"><Status status={r.status} review={review} /></td>
                  <td className="px-4 py-3 text-xs" style={{ color: VIZ.textSecondary }}>
                    {r.description && <p className="mb-1">{r.description}</p>}
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

      {data && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm" style={{ color: VIZ.textSecondary }}>
          <span>{data.total ? `Showing ${num(firstShown)}–${num(lastShown)} of ${num(data.total)} deposits` : "0 deposits"}</span>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs">Per page
              <select aria-label="Per page" value={pageSize} onChange={(e) => url.set({ size: e.target.value })} className="rounded-md border border-white/10 bg-[#1e1e1e] px-2 py-1 text-sm text-white">
                {[25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            {data.totalPages > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-xs">Page {page} of {data.totalPages}</span>
                <button disabled={page <= 1} onClick={() => url.set({ page: String(page - 1) }, { resetPage: false })} className="rounded-lg border border-white/10 p-1.5 disabled:opacity-40" aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></button>
                <button disabled={page >= data.totalPages} onClick={() => url.set({ page: String(page + 1) }, { resetPage: false })} className="rounded-lg border border-white/10 p-1.5 disabled:opacity-40" aria-label="Next page"><ChevronRight className="h-4 w-4" /></button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

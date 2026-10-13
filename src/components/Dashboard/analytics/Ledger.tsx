"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Check, ChevronLeft, ChevronRight, Clock, Download, Info, Search, X, XCircle } from "lucide-react";
import { toast } from "sonner";
import { VIZ, money, money2, num } from "./viz";
import { downloadCsv, useAdminFetch } from "./useAdminFetch";
import { useUrlState } from "./useUrlState";
import RangePicker from "./RangePicker";

const CATEGORIES = [
  { id: "deposit", label: "Deposits" },
  { id: "withdrawal", label: "Withdrawals" },
  { id: "purchase", label: "Purchases" },
  { id: "profit", label: "Mining profit" },
  { id: "sale", label: "Sales" },
  { id: "referral", label: "Referral bonuses" },
  { id: "adjustment", label: "Corrections" },
];
const STATUSES = [
  { id: "", label: "Any status" }, { id: "pending", label: "Pending" }, { id: "approved,completed", label: "Completed" }, { id: "rejected", label: "Rejected" },
];

function StatusBadge({ status }: { status: string }) {
  if (status === "pending") return <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]" style={{ borderColor: VIZ.warning, color: VIZ.warning }}><Clock className="h-3 w-3" aria-hidden />Pending</span>;
  if (status === "rejected") return <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]" style={{ borderColor: VIZ.muted, color: VIZ.textSecondary }}><XCircle className="h-3 w-3" aria-hidden />Rejected</span>;
  return <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: VIZ.textSecondary }}><Check className="h-3 w-3" style={{ color: VIZ.good }} aria-hidden />{status === "approved" ? "Approved" : "Completed"}</span>;
}

export default function Ledger() {
  const url = useUrlState();
  const from = url.get("from"), to = url.get("to");
  const category = url.get("category");
  const status = url.get("status");
  const user = url.get("user");
  // a single user's statement should show their whole history; the overall ledger defaults to the last 30 days
  const defaultRange = user ? "all" : "30d";
  const range = url.get("range") || defaultRange;
  const min = url.get("min"), max = url.get("max");
  const page = Math.max(1, parseInt(url.get("page") || "1", 10) || 1);
  const urlSearch = url.get("search");

  const [searchText, setSearchText] = useState(urlSearch);
  const [showMore, setShowMore] = useState(!!(min || max));
  useEffect(() => {
    if (searchText === urlSearch) return;
    const t = setTimeout(() => url.set({ search: searchText }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  const filterParams = useMemo(() => {
    const p = new URLSearchParams();
    if (range !== "all") { p.set("range", range); if (range === "custom" && from && to) { p.set("from", from); p.set("to", to); } }
    if (category) p.set("category", category);
    if (status) p.set("status", status);
    if (user) p.set("user", user);
    if (urlSearch) p.set("search", urlSearch);
    if (min) p.set("min", min);
    if (max) p.set("max", max);
    return p;
  }, [range, from, to, category, status, user, urlSearch, min, max]);

  const { data, loading, error } = useAdminFetch<any>(`/api/v1/admin/ledger?${new URLSearchParams({ ...Object.fromEntries(filterParams), page: String(page), limit: "50" })}`);
  const rows: any[] = data?.rows || [];
  const t = data?.totals;
  const selectedCats = category ? category.split(",") : [];
  const typeValue = selectedCats.length === 1 ? selectedCats[0] : selectedCats.length > 1 ? "__multi" : "";
  const filtered = !!(category || status || user || urlSearch || min || max || range !== defaultRange);
  const who = user ? (rows[0]?.userName || rows[0]?.userEmail || "this user") : "";

  const exportCsv = async () => {
    try { await downloadCsv(`/api/v1/admin/ledger/export?${filterParams}`, "ledger.csv"); toast.success("Ledger exported"); }
    catch { toast.error("Export failed"); }
  };

  const fmtNet = (n: number) => `${n < 0 ? "−" : n > 0 ? "+" : ""}${money(Math.abs(n))}`;
  const sel = "rounded-lg border border-white/10 bg-[#1e1e1e] px-3 py-2 text-sm text-white outline-none focus:border-green-500/60";

  return (
    <div className="space-y-4">
      {/* one toolbar: find, narrow down, export */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[200px] flex-1 sm:max-w-xs">
          <span className="sr-only">Search the ledger</span>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
          <input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Search name, email, wallet…"
            className="w-full rounded-lg border border-white/10 bg-[#1e1e1e] py-2 pl-9 pr-8 text-sm text-white placeholder-gray-500 outline-none focus:border-green-500/60" />
          {searchText && <button aria-label="Clear search" onClick={() => setSearchText("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"><X className="h-4 w-4" /></button>}
        </label>
        <select aria-label="Type" value={typeValue} onChange={(e) => url.set({ category: e.target.value })} className={sel}>
          <option value="">All types</option>
          {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          {typeValue === "__multi" && <option value="__multi" disabled>{selectedCats.length} types</option>}
        </select>
        <select aria-label="Status" value={status} onChange={(e) => url.set({ status: e.target.value })} className={sel}>
          {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <RangePicker allowAll range={range} from={from} to={to} onChange={(r) => url.set({ range: r.range === defaultRange ? "" : r.range, from: r.from, to: r.to })} />
        <button onClick={() => setShowMore((v) => !v)} aria-expanded={showMore} className="px-1 text-sm text-gray-400 hover:text-white">{showMore ? "Hide amount" : "Amount…"}</button>
        <button onClick={exportCsv} className="ml-auto inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-gray-200 transition hover:border-green-500/50 hover:text-white"><Download className="h-4 w-4" aria-hidden />Export CSV</button>
      </div>

      {(showMore || user || filtered) && (
        <div className="flex flex-wrap items-center gap-3">
          {showMore && (
            <>
              <label className="flex items-center gap-2 text-xs" style={{ color: VIZ.textSecondary }}>Min $
                <input type="number" min="0" inputMode="decimal" defaultValue={min} onBlur={(e) => url.set({ min: e.target.value })} onKeyDown={(e) => e.key === "Enter" && url.set({ min: (e.target as HTMLInputElement).value })} className="w-24 rounded-md border border-white/10 bg-[#1e1e1e] px-2 py-1.5 text-sm text-white" /></label>
              <label className="flex items-center gap-2 text-xs" style={{ color: VIZ.textSecondary }}>Max $
                <input type="number" min="0" inputMode="decimal" defaultValue={max} onBlur={(e) => url.set({ max: e.target.value })} onKeyDown={(e) => e.key === "Enter" && url.set({ max: (e.target as HTMLInputElement).value })} className="w-24 rounded-md border border-white/10 bg-[#1e1e1e] px-2 py-1.5 text-sm text-white" /></label>
            </>
          )}
          {user && (
            <span className="inline-flex items-center gap-2 rounded-full border border-green-500/40 bg-green-500/10 px-3 py-1 text-sm text-green-300">
              Only {who}
              <Link href={`/Dashboard/AllUser/${user}`} className="underline underline-offset-2">profile</Link>
              <button aria-label="Show all users" onClick={() => url.set({ user: "" })}><X className="h-4 w-4" /></button>
            </span>
          )}
          {filtered && <button onClick={() => { setSearchText(""); url.set({ range: "", from: "", to: "", category: "", status: "", user: "", search: "", min: "", max: "" }); }} className="text-sm text-gray-400 underline-offset-2 hover:text-white hover:underline">Reset filters</button>}
        </div>
      )}

      {error && <div role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

      {/* one slim summary instead of four big tiles */}
      <dl className="flex flex-wrap items-center gap-x-8 gap-y-2 rounded-2xl bg-[#1e1e1e] px-4 py-3" style={{ opacity: loading ? 0.6 : 1, transition: "opacity .15s" }}>
        {[
          { label: "Money in", value: t ? money(t.credits) : "—", color: VIZ.good },
          { label: "Money out", value: t ? money(t.debits) : "—" },
          { label: "Net", value: t ? fmtNet(t.net) : "—" },
          { label: "On hold (pending withdrawals)", value: t ? money(t.pendingHold) : "—", color: t?.pendingHold > 0 ? VIZ.warning : undefined },
        ].map((x) => (
          <div key={x.label} data-stat>
            <dt className="text-xs" style={{ color: VIZ.muted }}>{x.label}</dt>
            <dd className="text-lg font-semibold tabular-nums" style={{ color: x.color || VIZ.text }}>{x.value}</dd>
          </div>
        ))}
        <p className="ml-auto flex items-center gap-1.5 text-xs" style={{ color: VIZ.muted }}>
          {data ? `${num(data.total)} entr${data.total === 1 ? "y" : "ies"}` : ""}{data?.startsAt ? ` · from ${new Date(data.startsAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}` : ""}
          <span title="Totals count only entries that moved money. A pending withdrawal is a hold and a rejected one has no effect. Times are in your local time."><Info className="h-3.5 w-3.5" aria-label="How totals are counted" /></span>
        </p>
      </dl>

      <div className="relative overflow-x-auto rounded-2xl bg-[#1e1e1e]" style={{ opacity: loading ? 0.6 : 1, transition: "opacity .15s" }}>
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead>
            <tr className="border-b text-xs" style={{ borderColor: VIZ.grid, color: VIZ.muted }}>
              <th className="px-4 py-3 font-medium">When</th><th className="px-4 py-3 font-medium">User</th><th className="px-4 py-3 font-medium">Activity</th>
              <th className="px-4 py-3 text-right font-medium">Amount</th><th className="px-4 py-3 text-right font-medium" title="The user's balance right after this entry">Balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b align-top" style={{ borderColor: VIZ.grid }}>
                <td className="whitespace-nowrap px-4 py-3 text-xs" style={{ color: VIZ.textSecondary }} title={r.date}>
                  {new Date(r.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  <span className="block" style={{ color: VIZ.muted }}>{new Date(r.date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
                </td>
                <td className="max-w-[200px] px-4 py-3">
                  <Link href={`/Dashboard/Ledger?user=${r.userId}`} className="block truncate text-white hover:text-green-400" title={`Show only ${r.userEmail}'s entries`}>{r.userName || r.userEmail}</Link>
                </td>
                <td className="max-w-[340px] px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 text-white">{r.direction === "credit" ? <ArrowDownLeft className="h-4 w-4 shrink-0" style={{ color: VIZ.good }} aria-label="money in" /> : <ArrowUpRight className="h-4 w-4 shrink-0" style={{ color: VIZ.textSecondary }} aria-label="money out" />}{r.typeLabel}</span>
                  {(r.description || r.walletAddress || r.adminComment) && (
                    <span className="mt-0.5 block truncate text-xs" style={{ color: VIZ.muted }} title={[r.description, r.walletAddress, r.adminComment].filter(Boolean).join(" · ")}>
                      {[r.description, r.walletAddress && `${r.network ? r.network + " " : ""}${r.walletAddress}`, r.adminComment && `Note: ${r.adminComment}`].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <span className="block tabular-nums font-medium" style={{ color: r.status === "rejected" ? VIZ.muted : r.direction === "credit" ? VIZ.good : VIZ.text, textDecoration: r.status === "rejected" ? "line-through" : undefined }}>
                    {r.direction === "credit" ? "+" : "−"}{money2(r.amount)}
                  </span>
                  {(r.status === "pending" || r.status === "rejected") && <span className="mt-1 inline-block"><StatusBadge status={r.status} /></span>}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums" style={{ color: VIZ.textSecondary }}>{r.balanceAfter == null ? "—" : money2(r.balanceAfter)}</td>
              </tr>
            ))}
            {data && rows.length === 0 && <tr><td colSpan={5} className="px-4 py-14 text-center" style={{ color: VIZ.muted }}>No ledger entries match these filters.</td></tr>}
          </tbody>
        </table>
      </div>

      {data && data.totalPages > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-between text-sm" style={{ color: VIZ.textSecondary }}>
          <span>Page {data.page} of {data.totalPages} · {num(data.total)} entries</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => url.set({ page: String(page - 1) }, { resetPage: false })} className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 enabled:hover:border-green-500/50 enabled:hover:text-white disabled:opacity-40"><ChevronLeft className="h-4 w-4" aria-hidden />Previous</button>
            <button disabled={page >= data.totalPages} onClick={() => url.set({ page: String(page + 1) }, { resetPage: false })} className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 enabled:hover:border-green-500/50 enabled:hover:text-white disabled:opacity-40">Next<ChevronRight className="h-4 w-4" aria-hidden /></button>
          </div>
        </nav>
      )}
    </div>
  );
}

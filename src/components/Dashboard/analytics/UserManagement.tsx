"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, BookOpen, ChevronLeft, ChevronRight, Download, MoreVertical, Plus, Search, X } from "lucide-react";
import Swal from "sweetalert2";
import { toast } from "sonner";
import AddBalanceDialog from "./AddBalanceDialog";
import { useDeleteUserMutation } from "@/lib/feature/auth/adminApiSlice";
import { VIZ, money, num } from "./viz";
import { downloadCsv, useAdminFetch } from "./useAdminFetch";
import { useUrlState } from "./useUrlState";

const SEGMENTS: { id: string; label: string; hint: string }[] = [
  { id: "all", label: "All", hint: "Every account" },
  { id: "new", label: "New this week", hint: "Joined in the last 7 days" },
  { id: "pending_withdrawal", label: "Pending withdrawal", hint: "Waiting for you to approve or reject" },
  { id: "dormant", label: "Dormant with funds", hint: "Hold a balance but no activity for 30+ days" },
  { id: "holding", label: "Holding funds", hint: "Balance above zero" },
  { id: "never_deposited", label: "Never deposited", hint: "Signed up but have not funded the account" },
  { id: "no_machines", label: "No machines", hint: "No active machines or shares" },
  { id: "admins", label: "Admins", hint: "Admin accounts" },
];

const TAGS: Record<string, { label: string; tone: string }> = {
  new: { label: "New", tone: VIZ.deposits },
  pending_withdrawal: { label: "Pending withdrawal", tone: VIZ.warning },
  dormant: { label: "Dormant", tone: VIZ.serious },
  never_deposited: { label: "No deposit yet", tone: VIZ.muted },
  admin: { label: "Admin", tone: VIZ.investments },
};

const COLUMNS: { id: string; label: string; align?: "right"; sort?: string; hide?: string }[] = [
  { id: "user", label: "User", sort: "name" },
  { id: "balance", label: "Balance", sort: "balance", align: "right" },
  { id: "deposited", label: "Deposited", sort: "deposited", align: "right", hide: "hidden xl:table-cell" },
  { id: "withdrawn", label: "Withdrawn", sort: "withdrawn", align: "right", hide: "hidden xl:table-cell" },
  { id: "machines", label: "Machines", sort: "machines", align: "right", hide: "hidden lg:table-cell" },
  { id: "referrals", label: "Referrals", sort: "referrals", align: "right", hide: "hidden xl:table-cell" },
  { id: "activity", label: "Last activity", sort: "activity", hide: "hidden md:table-cell" },
  { id: "joined", label: "Joined", sort: "joined", hide: "hidden lg:table-cell" },
];

const ago = (iso: string | null) => {
  if (!iso) return "Never";
  const d = (Date.now() - new Date(iso).getTime()) / 86400000;
  if (d < 1) return "Today";
  if (d < 2) return "Yesterday";
  if (d < 60) return `${Math.floor(d)}d ago`;
  if (d < 365) return `${Math.floor(d / 30)}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
};

export default function UserManagement() {
  const router = useRouter();
  const url = useUrlState();
  const segment = url.get("segment") || "all";
  const sort = url.get("sort") || "joined";
  const dir = url.get("dir") === "asc" ? "asc" : "desc";
  const page = Math.max(1, parseInt(url.get("page") || "1", 10) || 1);
  const urlSearch = url.get("search");

  const [searchText, setSearchText] = useState(urlSearch);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [balanceUser, setBalanceUser] = useState<any | null>(null);
  const [deleteUser] = useDeleteUserMutation();

  // debounce typing into the URL
  useEffect(() => {
    if (searchText === urlSearch) return;
    const t = setTimeout(() => url.set({ search: searchText }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  const qs = useMemo(() => new URLSearchParams({ segment, sort, dir, page: String(page), limit: "25", ...(urlSearch ? { search: urlSearch } : {}) }).toString(), [segment, sort, dir, page, urlSearch]);
  const { data, loading, error, refetch } = useAdminFetch<any>(`/api/v1/admin/users/overview?${qs}`);
  const rows: any[] = data?.rows || [];
  const counts = data?.segmentCounts || {};

  useEffect(() => {
    if (!menuFor) return;
    const close = () => setMenuFor(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [menuFor]);

  const sortBy = (col?: string) => {
    if (!col) return;
    url.set(sort === col ? { dir: dir === "asc" ? "desc" : "asc" } : { sort: col, dir: col === "name" ? "asc" : "desc" });
  };

  const confirmDelete = async (u: any) => {
    const hasMoney = u.totalBalance > 0 || u.totalDeposited > 0 || u.totalWithdrawn > 0;
    const theme = { background: "#1e1e1e", color: "#fff" };
    const res = await Swal.fire({
      title: `Delete ${u.firstName} ${u.lastName}?`,
      html: hasMoney
        ? `<p style="text-align:left">This account has financial history: balance <b>${money(u.totalBalance)}</b>, deposited <b>${money(u.totalDeposited)}</b>, withdrawn <b>${money(u.totalWithdrawn)}</b>.</p><p style="text-align:left;margin-top:8px">Deleting it <b>permanently erases the balance and the ledger entries</b>. Type the user's email to confirm.</p>`
        : "<p>This account has no money history. This cannot be undone.</p>",
      input: hasMoney ? "text" : undefined, inputPlaceholder: hasMoney ? u.email : undefined,
      inputValidator: hasMoney ? (v: string) => (v.trim().toLowerCase() === String(u.email).toLowerCase() ? null : "Email does not match") : undefined,
      icon: "warning", showCancelButton: true, confirmButtonText: "Delete permanently", confirmButtonColor: "#dc2626", ...theme,
    });
    if (!res.isConfirmed) return;
    try { await deleteUser(String(u.id)).unwrap(); toast.success("User deleted"); refetch(); } catch { toast.error("Failed to delete user"); }
  };

  const exportCsv = async () => {
    try {
      const p = new URLSearchParams({ segment, sort, dir, ...(urlSearch ? { search: urlSearch } : {}) });
      await downloadCsv(`/api/v1/admin/users/export?${p}`, "users.csv");
    } catch { toast.error("Export failed"); }
  };

  const activeSeg = SEGMENTS.find((s) => s.id === segment);

  return (
    <div className="space-y-4">
      {/* segments: the people an admin actually looks for */}
      <div role="tablist" aria-label="User segments" className="flex flex-wrap gap-2">
        {SEGMENTS.map((s) => {
          const on = s.id === segment;
          const c = counts[s.id];
          const urgent = s.id === "pending_withdrawal" && c > 0;
          return (
            <button key={s.id} role="tab" aria-selected={on} title={s.hint} onClick={() => url.set({ segment: s.id === "all" ? "" : s.id })}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${on ? "border-green-500 bg-green-500/10 text-green-400" : "border-white/10 text-gray-300 hover:border-white/30 hover:text-white"}`}>
              {s.label}
              {c !== undefined && <span className={`ml-2 rounded-full px-1.5 py-0.5 text-[11px] ${urgent ? "bg-yellow-400 text-black" : "bg-white/10 text-gray-300"}`}>{num(c)}</span>}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-[240px] flex-1 sm:max-w-md">
          <span className="sr-only">Search users</span>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
          <input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Search name, email, phone or country…"
            className="w-full rounded-lg border border-white/10 bg-[#1e1e1e] py-2.5 pl-9 pr-9 text-sm text-white placeholder-gray-500 outline-none focus:border-green-500/60" />
          {searchText && <button aria-label="Clear search" onClick={() => setSearchText("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-white"><X className="h-4 w-4" /></button>}
        </label>
        <p className="text-sm" style={{ color: VIZ.muted }} aria-live="polite">{data ? `${num(data.total)} user${data.total === 1 ? "" : "s"}${activeSeg && segment !== "all" ? ` · ${activeSeg.hint.toLowerCase()}` : ""}` : "Loading…"}</p>
        <button onClick={exportCsv} className="ml-auto inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-gray-200 transition hover:border-green-500/50 hover:text-white"><Download className="h-4 w-4" aria-hidden />Export CSV</button>
      </div>

      {error && <div role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

      <div className="relative overflow-x-auto rounded-2xl bg-[#1e1e1e]" style={{ opacity: loading ? 0.6 : 1, transition: "opacity .15s" }}>
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b text-xs" style={{ borderColor: VIZ.grid, color: VIZ.muted }}>
              {COLUMNS.map((c) => (
                <th key={c.id} scope="col" aria-sort={sort === c.sort ? (dir === "asc" ? "ascending" : "descending") : "none"} className={`px-4 py-3 font-medium ${c.align === "right" ? "text-right" : ""} ${c.hide || ""}`}>
                  <button onClick={() => sortBy(c.sort)} className={`inline-flex items-center gap-1 hover:text-white ${sort === c.sort ? "text-white" : ""}`}>
                    {c.label}{sort === c.sort && (dir === "asc" ? <ArrowUp className="h-3 w-3" aria-hidden /> : <ArrowDown className="h-3 w-3" aria-hidden />)}
                  </button>
                </th>
              ))}
              <th className="px-4 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="cursor-pointer border-b transition hover:bg-white/[0.03]" style={{ borderColor: VIZ.grid }} onClick={() => router.push(`/Dashboard/AllUser/${u.id}`)}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2a2a2a] text-sm font-semibold text-green-400" aria-hidden>{(u.firstName || u.email || "?")[0].toUpperCase()}</span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">{u.firstName} {u.lastName}</p>
                      <p className="truncate text-xs" style={{ color: VIZ.textSecondary }}>{u.email}</p>
                      <p className="truncate text-[11px]" style={{ color: VIZ.muted }}>{u.country} · {u.phone}</p>
                      {u.tags?.length > 0 && (
                        <p className="mt-1 flex flex-wrap gap-1">
                          {u.tags.map((t: string) => TAGS[t] && <span key={t} className="rounded-full border px-1.5 py-px text-[10px]" style={{ borderColor: TAGS[t].tone, color: TAGS[t].tone }}>{TAGS[t].label}</span>)}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                  <p className="font-medium text-white">{money(u.totalBalance)}</p>
                  {u.profitBalance > 0 && u.depositedBalance > 0 && <p className="text-[11px]" style={{ color: VIZ.muted }} title="Deposited funds + mining profit">{money(u.depositedBalance)} + {money(u.profitBalance)} profit</p>}
                  {u.pendingWithdrawal > 0 && <p className="text-[11px]" style={{ color: VIZ.warning }}>{money(u.pendingWithdrawal)} withdrawing</p>}
                </td>
                <td className="hidden px-4 py-3 text-right tabular-nums text-gray-200 xl:table-cell">{money(u.totalDeposited)}</td>
                <td className="hidden px-4 py-3 text-right tabular-nums text-gray-200 xl:table-cell">{money(u.totalWithdrawn)}</td>
                <td className="hidden px-4 py-3 text-right tabular-nums text-gray-200 lg:table-cell">{u.machines}{u.shares > 0 && <span style={{ color: VIZ.muted }}> + {u.shares} sh</span>}</td>
                <td className="hidden px-4 py-3 text-right tabular-nums text-gray-200 xl:table-cell">{u.referrals}</td>
                <td className="hidden px-4 py-3 md:table-cell" style={{ color: VIZ.textSecondary }}>{ago(u.lastActivityAt)}</td>
                <td className="hidden px-4 py-3 lg:table-cell" style={{ color: VIZ.textSecondary }}>{new Date(u.joinedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                <td className="relative px-2 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    <Link href={`/Dashboard/Ledger?user=${u.id}`} title="Open this user's ledger" className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-green-400 hover:bg-green-500/10"><BookOpen className="h-3.5 w-3.5" aria-hidden />Ledger</Link>
                    <button onClick={() => setBalanceUser(u)} title="Add balance to this user" className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-green-400 hover:bg-green-500/10"><Plus className="h-3.5 w-3.5" aria-hidden />Add balance</button>
                    <button aria-label={`More actions for ${u.firstName} ${u.lastName}`} aria-haspopup="menu" aria-expanded={menuFor === u.id} onClick={(e) => { e.stopPropagation(); setMenuFor(menuFor === u.id ? null : u.id); }} className="rounded-md p-1.5 text-gray-300 hover:bg-white/10"><MoreVertical className="h-4 w-4" /></button>
                  </div>
                  {menuFor === u.id && (
                    <div role="menu" className="absolute right-2 top-full z-20 mt-1 w-44 overflow-hidden rounded-lg border border-white/10 bg-[#161616] text-left text-sm shadow-xl">
                      <Link role="menuitem" href={`/Dashboard/AllUser/${u.id}`} className="block px-3 py-2 text-gray-200 hover:bg-white/5">View profile</Link>
                      <Link role="menuitem" href={`/Dashboard/Ledger?user=${u.id}`} className="block px-3 py-2 text-gray-200 hover:bg-white/5">View ledger</Link>
                      <button role="menuitem" onClick={() => { setMenuFor(null); setBalanceUser(u); }} className="block w-full px-3 py-2 text-left text-gray-200 hover:bg-white/5">Add balance</button>
                      {u.role !== "admin" && <button role="menuitem" onClick={() => { setMenuFor(null); confirmDelete(u); }} className="block w-full px-3 py-2 text-left text-red-400 hover:bg-red-500/10">Delete user…</button>}
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {data && rows.length === 0 && (
              <tr><td colSpan={COLUMNS.length + 1} className="px-4 py-14 text-center" style={{ color: VIZ.muted }}>
                No users match{urlSearch ? ` “${urlSearch}”` : ""}{segment !== "all" ? ` in “${activeSeg?.label}”` : ""}.
                {(urlSearch || segment !== "all") && <button className="ml-2 text-green-400 hover:underline" onClick={() => { setSearchText(""); url.set({ search: "", segment: "" }); }}>Clear filters</button>}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {data && data.totalPages > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-between text-sm" style={{ color: VIZ.textSecondary }}>
          <span>Page {data.page} of {data.totalPages}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => url.set({ page: String(page - 1) }, { resetPage: false })} className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 enabled:hover:border-green-500/50 enabled:hover:text-white disabled:opacity-40"><ChevronLeft className="h-4 w-4" aria-hidden />Previous</button>
            <button disabled={page >= data.totalPages} onClick={() => url.set({ page: String(page + 1) }, { resetPage: false })} className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 enabled:hover:border-green-500/50 enabled:hover:text-white disabled:opacity-40">Next<ChevronRight className="h-4 w-4" aria-hidden /></button>
          </div>
        </nav>
      )}

      <AddBalanceDialog open={!!balanceUser} onClose={() => setBalanceUser(null)} onDone={refetch}
        initialUser={balanceUser ? { id: String(balanceUser.id), name: `${balanceUser.firstName || ""} ${balanceUser.lastName || ""}`.trim(), email: balanceUser.email, balance: balanceUser.totalBalance } : null} />
    </div>
  );
}

"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, Clock, MessageSquare, UserX } from "lucide-react";
import { VIZ, ageLabel, compact, delta, money, money2, num } from "./viz";
import { useAdminFetch } from "./useAdminFetch";
import { useUrlState } from "./useUrlState";
import RangePicker from "./RangePicker";
import StatTile from "./StatTile";
import LineChart from "./LineChart";
import ColumnChart from "./ColumnChart";

const Card = ({ title, subtitle, action, children, className = "" }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) => (
  <section className={`min-w-0 rounded-2xl bg-[#1e1e1e] p-4 sm:p-5 ${className}`}>
    <header className="mb-3 flex items-start justify-between gap-3">
      <div><h3 className="text-base font-semibold text-white">{title}</h3>{subtitle && <p className="text-xs" style={{ color: VIZ.muted }}>{subtitle}</p>}</div>
      {action}
    </header>
    {children}
  </section>
);

const sev = (hours: number) => (hours >= 72 ? "critical" : hours >= 24 ? "warning" : "ok");

export default function AdminOverview() {
  const url = useUrlState();
  const range = url.get("range") || "30d";
  const from = url.get("from"), to = url.get("to");
  const qs = useMemo(() => {
    const p = new URLSearchParams({ range });
    if (range === "custom" && from && to) { p.set("from", from); p.set("to", to); }
    return p.toString();
  }, [range, from, to]);

  const { data, loading, error } = useAdminFetch<any>(`/api/v1/admin/analytics?${qs}`);
  const { data: recent } = useAdminFetch<any>("/api/v1/admin/ledger?limit=8");

  const cur = data?.current, prev = data?.previous, snap = data?.snapshot, att = data?.attention;
  const series: any[] = data?.series || [];
  const col = (k: string) => series.map((p) => Number(p[k]) || 0);

  const netNow = cur ? cur.deposits - cur.withdrawals : 0;
  const netPrev = prev ? prev.deposits - prev.withdrawals : 0;
  const periodLabel = data ? `${new Date(data.from).toISOString().slice(0, 10)} → ${new Date(new Date(data.to).getTime() - 86400000).toISOString().slice(0, 10)} (UTC)` : "";

  const pending = att?.pendingWithdrawals;
  const oldestHours = pending?.oldestAt ? (Date.now() - new Date(pending.oldestAt).getTime()) / 3600000 : 0;
  const attentionCount = (pending?.count ? 1 : 0) + (snap?.unreadContacts ? 1 : 0) + (att?.dormantWithFunds ? 1 : 0) + (att?.depositsNeedingReview ? 1 : 0);

  return (
    <div className="space-y-5">
      {/* filters: one row above everything they scope */}
      <div className="flex flex-wrap items-center gap-3">
        <RangePicker range={range} from={from} to={to} onChange={(r) => url.set({ range: r.range, from: r.from, to: r.to })} />
        <p className="text-xs" style={{ color: VIZ.muted }}>{periodLabel}{data && <span> · compared with the {Math.round((new Date(data.to).getTime() - new Date(data.from).getTime()) / 86400000)} days before</span>}</p>
      </div>

      {error && <div role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

      {/* 1. what needs a decision today */}
      <section aria-label="Needs attention" className="rounded-2xl bg-[#1e1e1e] p-4 sm:p-5">
        <h3 className="mb-3 text-base font-semibold text-white">Needs attention</h3>
        {!data ? <p className="text-sm" style={{ color: VIZ.muted }}>Loading…</p> : attentionCount === 0 ? (
          <p className="flex items-center gap-2 text-sm" style={{ color: VIZ.textSecondary }}><CheckCircle2 className="h-5 w-5" style={{ color: VIZ.good }} aria-hidden />All clear: no pending withdrawals, unread messages or dormant balances.</p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-3">
            {pending?.count > 0 && (
              <div className="rounded-xl border p-4 lg:col-span-1" style={{ borderColor: sev(oldestHours) === "critical" ? VIZ.critical : sev(oldestHours) === "warning" ? VIZ.warning : VIZ.axis }}>
                <p className="flex items-center gap-2 text-sm font-medium text-white">
                  {sev(oldestHours) === "ok" ? <Clock className="h-4 w-4" style={{ color: VIZ.textSecondary }} aria-hidden /> : <AlertTriangle className="h-4 w-4" style={{ color: sev(oldestHours) === "critical" ? VIZ.critical : VIZ.warning }} aria-hidden />}
                  {pending.count} pending withdrawal{pending.count === 1 ? "" : "s"}
                  {sev(oldestHours) !== "ok" && <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-black" style={{ background: sev(oldestHours) === "critical" ? VIZ.critical : VIZ.warning }}>{sev(oldestHours) === "critical" ? "Overdue" : "Waiting 24h+"}</span>}
                </p>
                <p className="mt-1 text-2xl font-semibold text-white">{money(pending.amount)}</p>
                <p className="text-xs" style={{ color: VIZ.muted }}>Oldest waiting {ageLabel(pending.oldestAt)}</p>
                <ul className="mt-3 space-y-1.5">
                  {(att.oldestPending || []).slice(0, 3).map((w: any) => (
                    <li key={w.id} className="flex items-center justify-between gap-2 text-xs">
                      <span className="min-w-0 truncate" style={{ color: VIZ.textSecondary }}>{w.userName || w.userEmail}</span>
                      <span className="shrink-0 tabular-nums text-white">{money(w.amount)} <span style={{ color: VIZ.muted }}>· {ageLabel(w.requestedAt)}</span></span>
                    </li>
                  ))}
                </ul>
                <Link href="/Dashboard/AllTransaction" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-green-400 hover:underline">Review withdrawals <ArrowRight className="h-4 w-4" aria-hidden /></Link>
              </div>
            )}
            {snap?.unreadContacts > 0 && (
              <div className="rounded-xl border p-4" style={{ borderColor: VIZ.axis }}>
                <p className="flex items-center gap-2 text-sm font-medium text-white"><MessageSquare className="h-4 w-4" style={{ color: VIZ.textSecondary }} aria-hidden />{snap.unreadContacts} unread message{snap.unreadContacts === 1 ? "" : "s"}</p>
                <p className="mt-1 text-xs" style={{ color: VIZ.muted }}>Contact-form enquiries nobody has opened yet.</p>
                <Link href="/Dashboard/contactUs" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-green-400 hover:underline">Open inbox <ArrowRight className="h-4 w-4" aria-hidden /></Link>
              </div>
            )}
            {att?.depositsNeedingReview > 0 && (
              <div className="rounded-xl border p-4" style={{ borderColor: VIZ.warning }}>
                <p className="flex items-center gap-2 text-sm font-medium text-white"><AlertTriangle className="h-4 w-4" style={{ color: VIZ.warning }} aria-hidden />{att.depositsNeedingReview} deposit{att.depositsNeedingReview === 1 ? "" : "s"} need review</p>
                <p className="mt-1 text-xs" style={{ color: VIZ.muted }}>Partial payments, price mismatches or refunds. Nothing was credited automatically.</p>
                <Link href="/Dashboard/Deposits?tab=review" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-green-400 hover:underline">Review deposits <ArrowRight className="h-4 w-4" aria-hidden /></Link>
              </div>
            )}
            {att?.dormantWithFunds > 0 && (
              <div className="rounded-xl border p-4" style={{ borderColor: VIZ.axis }}>
                <p className="flex items-center gap-2 text-sm font-medium text-white"><UserX className="h-4 w-4" style={{ color: VIZ.textSecondary }} aria-hidden />{att.dormantWithFunds} dormant user{att.dormantWithFunds === 1 ? "" : "s"} holding funds</p>
                <p className="mt-1 text-xs" style={{ color: VIZ.muted }}>Balance above zero but no activity for 30+ days. Worth a check-in.</p>
                <Link href="/Dashboard/AllUser?segment=dormant" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-green-400 hover:underline">See these users <ArrowRight className="h-4 w-4" aria-hidden /></Link>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 2. money in vs money out */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <StatTile hero loading={loading} label="Net cash flow" value={cur ? money(netNow) : "—"} delta={cur ? delta(netNow, netPrev) : undefined}
            sub={cur ? `${money(cur.deposits)} in − ${money(cur.withdrawals)} out` : undefined} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
          <StatTile loading={loading} label="Deposits credited" value={cur ? money(cur.deposits) : "—"} delta={cur ? delta(cur.deposits, prev.deposits) : undefined}
            spark={col("deposits")} accent={VIZ.deposits} sub={cur ? `${num(cur.depositCount)} deposits` : undefined} />
          <StatTile loading={loading} label="Withdrawals paid" value={cur ? money(cur.withdrawals) : "—"} delta={cur ? delta(cur.withdrawals, prev.withdrawals) : undefined} upIs="neutral"
            spark={col("withdrawals")} accent={VIZ.withdrawals} sub={cur ? `${num(cur.withdrawalCount)} payouts` : undefined} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile loading={loading} label="New users" value={cur ? num(cur.newUsers) : "—"} delta={cur ? delta(cur.newUsers, prev.newUsers) : undefined} spark={col("newUsers")} accent={VIZ.users} sub={cur ? `${num(cur.newDepositors)} made a first deposit` : undefined} />
        <StatTile loading={loading} label="Active users" value={cur ? num(cur.activeUsers) : "—"} delta={cur ? delta(cur.activeUsers, prev.activeUsers) : undefined} sub={snap ? `of ${num(snap.users)} users` : undefined} />
        <StatTile loading={loading} label="Machine investments" value={cur ? money(cur.investments) : "—"} delta={cur ? delta(cur.investments, prev.investments) : undefined} spark={col("investments")} accent={VIZ.investments} sub="bought from balances" />
        <StatTile loading={loading} label="Mining profit paid" value={cur ? money(cur.profitPaid) : "—"} delta={cur ? delta(cur.profitPaid, prev.profitPaid) : undefined} upIs="neutral" spark={col("profit")} accent={VIZ.profit} sub={cur && cur.referralPaid ? `+ ${money(cur.referralPaid)} referral bonuses` : "credited to users"} />
      </div>

      {/* 3. trends */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2" title="Cash flow" subtitle={`Deposits credited vs withdrawals paid, per ${data?.bucket === "week" ? "week" : "day"}`}>
          <LineChart title="Cash flow: deposits and withdrawals" loading={loading} points={series}
            series={[{ key: "deposits", label: "Deposits", color: VIZ.deposits }, { key: "withdrawals", label: "Withdrawals", color: VIZ.withdrawals }]} format={money} />
        </Card>
        <Card title="New users" subtitle={`Sign-ups per ${data?.bucket === "week" ? "week" : "day"}`}>
          <ColumnChart title="New users" loading={loading} points={series} valueKey="newUsers" label="new users" />
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2" title="Investments vs profit paid" subtitle="What users put into machines, and what mining paid back">
          <LineChart title="Investments and profit paid" loading={loading} points={series} height={230}
            series={[{ key: "investments", label: "Investments", color: VIZ.investments }, { key: "profitPaid", label: "Profit paid", color: VIZ.profit }]} format={money} />
        </Card>

        <Card title="Funds held for users" subtitle="What the platform owes today (not period-bound)">
          {snap ? (
            <div>
              <p className="text-[32px] font-semibold leading-tight text-white">{money(snap.fundsHeld)}</p>
              <p className="text-xs" style={{ color: VIZ.muted }}>{num(snap.usersWithBalance)} users hold a balance</p>
              <div className="mt-3 flex h-2.5 w-full gap-[2px] overflow-hidden rounded-full" role="img" aria-label={`Deposited ${money(snap.fundsDeposited)}, profit ${money(snap.fundsProfit)}`}>
                <div style={{ width: `${snap.fundsHeld ? (snap.fundsDeposited / snap.fundsHeld) * 100 : 0}%`, background: VIZ.deposits }} />
                <div style={{ width: `${snap.fundsHeld ? (snap.fundsProfit / snap.fundsHeld) * 100 : 0}%`, background: VIZ.profit }} />
              </div>
              <ul className="mt-2 space-y-1 text-xs" style={{ color: VIZ.textSecondary }}>
                <li className="flex justify-between"><span className="flex items-center gap-1.5"><i className="inline-block h-2 w-2 rounded-sm" style={{ background: VIZ.deposits }} />Deposited funds</span><strong className="text-white">{money(snap.fundsDeposited)}</strong></li>
                <li className="flex justify-between"><span className="flex items-center gap-1.5"><i className="inline-block h-2 w-2 rounded-sm" style={{ background: VIZ.profit }} />Mining profit</span><strong className="text-white">{money(snap.fundsProfit)}</strong></li>
              </ul>
              <div className="mt-4 border-t pt-3 text-xs" style={{ borderColor: VIZ.grid, color: VIZ.textSecondary }}>
                <p className="flex justify-between"><span>Pending withdrawals vs funds</span><strong className="text-white">{snap.fundsHeld ? `${Math.round(((pending?.amount || 0) / snap.fundsHeld) * 100)}%` : "—"}</strong></p>
                <p className="mt-1 flex justify-between"><span>Top 5 holders' share</span>
                  <strong style={{ color: snap.top5Share > 0.75 ? VIZ.serious : "#fff" }}>{Math.round((snap.top5Share || 0) * 100)}%{snap.top5Share > 0.75 ? " ▲ concentrated" : ""}</strong></p>
                <p className="mt-1 flex justify-between"><span>Machines / shares running</span><strong className="text-white">{num(snap.activeMachines)} / {num(snap.activeShares)}</strong></p>
              </div>
            </div>
          ) : <p className="text-sm" style={{ color: VIZ.muted }}>Loading…</p>}
        </Card>
      </div>

      {/* 4. who and what */}
      <div className="grid gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-2" title="Largest balances" subtitle="Where the money sits"
          action={<Link href="/Dashboard/AllUser?sort=balance&dir=desc" className="text-xs font-medium text-green-400 hover:underline">All users</Link>}>
          {(att?.topUsers || []).length === 0 ? <p className="py-6 text-center text-sm" style={{ color: VIZ.muted }}>No balances yet</p> : (
            <ol className="space-y-3">
              {att.topUsers.map((u: any, i: number) => (
                <li key={u.id}>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <Link href={`/Dashboard/AllUser/${u.id}`} className="min-w-0 truncate text-white hover:text-green-400"><span className="mr-2" style={{ color: VIZ.muted }}>{i + 1}</span>{u.name || u.email}</Link>
                    <span className="shrink-0 tabular-nums text-white">{money(u.totalBalance)}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full" style={{ background: VIZ.grid }} aria-hidden>
                    <div className="h-full rounded-full" style={{ width: `${snap?.fundsHeld ? Math.max(2, (u.totalBalance / snap.fundsHeld) * 100) : 0}%`, background: VIZ.deposits }} />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card className="xl:col-span-3" title="Latest ledger activity" subtitle="Every money movement, newest first"
          action={<Link href="/Dashboard/Ledger" className="inline-flex items-center gap-1 text-xs font-medium text-green-400 hover:underline">Open ledger <ArrowRight className="h-3.5 w-3.5" aria-hidden /></Link>}>
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead><tr className="text-xs" style={{ color: VIZ.muted }}><th className="pb-2 font-medium">When</th><th className="pb-2 font-medium">User</th><th className="pb-2 font-medium">Type</th><th className="pb-2 text-right font-medium">Amount</th></tr></thead>
              <tbody>
                {(recent?.rows || []).map((r: any) => (
                  <tr key={r.id} className="border-t" style={{ borderColor: VIZ.grid }}>
                    <td className="py-2 pr-3 text-xs" style={{ color: VIZ.textSecondary }}>{new Date(r.date).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                    <td className="max-w-[160px] truncate py-2 pr-3 text-white">{r.userName || r.userEmail}</td>
                    <td className="py-2 pr-3" style={{ color: VIZ.textSecondary }}>{r.typeLabel}{r.status === "pending" && <span className="ml-1.5 rounded-full border px-1.5 text-[10px]" style={{ borderColor: VIZ.warning, color: VIZ.warning }}>pending</span>}</td>
                    <td className="py-2 text-right tabular-nums text-white">{r.direction === "credit" ? "+" : "−"}{money2(r.amount)}</td>
                  </tr>
                ))}
                {recent && recent.rows.length === 0 && <tr><td colSpan={4} className="py-6 text-center" style={{ color: VIZ.muted }}>No transactions yet</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

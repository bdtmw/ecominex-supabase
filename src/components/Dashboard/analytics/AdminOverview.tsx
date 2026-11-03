"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, Clock, MessageSquare, UserX } from "lucide-react";
import { VIZ, ageLabel, compact, delta, money, money2, num } from "./viz";
import { useAdminFetch } from "./useAdminFetch";
import { useUrlState } from "./useUrlState";
import RangePicker from "./RangePicker";
import StatTile from "./StatTile";

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
  const { data: recent } = useAdminFetch<any>("/api/v1/admin/ledger?limit=5");

  const cur = data?.current, prev = data?.previous, snap = data?.snapshot, att = data?.attention;
  const netNow = cur ? cur.deposits - cur.withdrawals : 0;
  const netPrev = prev ? prev.deposits - prev.withdrawals : 0;
  const days = data ? Math.round((new Date(data.to).getTime() - new Date(data.from).getTime()) / 86400000) : 0;

  const pending = att?.pendingWithdrawals;
  const oldestHours = pending?.oldestAt ? (Date.now() - new Date(pending.oldestAt).getTime()) / 3600000 : 0;
  const attentionCount = (pending?.count ? 1 : 0) + (snap?.unreadContacts ? 1 : 0) + (att?.dormantWithFunds ? 1 : 0) + (att?.depositsNeedingReview ? 1 : 0);
  const pendingTone = sev(oldestHours) === "critical" ? VIZ.critical : sev(oldestHours) === "warning" ? VIZ.warning : VIZ.axis;

  const Alert = ({ icon: Icon, tone, title, extra, href, cta }: any) => (
    <Link href={href} className="group flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition hover:bg-white/[0.03]" style={{ borderColor: tone }}>
      <span className="min-w-0">
        <span className="flex items-center gap-2 text-sm font-medium text-white"><Icon className="h-4 w-4 shrink-0" style={{ color: tone === VIZ.axis ? VIZ.textSecondary : tone }} aria-hidden />{title}</span>
        {extra && <span className="mt-0.5 block text-xs" style={{ color: VIZ.muted }}>{extra}</span>}
      </span>
      <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-green-400 group-hover:underline">{cta}<ArrowRight className="h-4 w-4" aria-hidden /></span>
    </Link>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <RangePicker range={range} from={from} to={to} onChange={(r) => url.set({ range: r.range, from: r.from, to: r.to })} />
        {data && <p className="text-xs" style={{ color: VIZ.muted }}>Compared with the previous {days} days</p>}
      </div>

      {error && <div role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

      {/* only what needs a decision, one line each */}
      <section aria-label="Needs attention" className="space-y-2">
        <h3 className="text-base font-semibold text-white">Needs Attention</h3>
        {!data ? <p className="text-sm" style={{ color: VIZ.muted }}>Loading…</p> : attentionCount === 0 ? (
          <p className="flex items-center gap-2 rounded-xl bg-[#1e1e1e] px-4 py-3 text-sm" style={{ color: VIZ.textSecondary }}><CheckCircle2 className="h-5 w-5" style={{ color: VIZ.good }} aria-hidden />All clear. Nothing is waiting for you.</p>
        ) : (
          <div className="grid gap-2 lg:grid-cols-2">
            {pending?.count > 0 && (
              <Alert icon={sev(oldestHours) === "ok" ? Clock : AlertTriangle} tone={pendingTone} href="/Dashboard/AllTransaction" cta="Review"
                title={<>{pending.count} pending withdrawal{pending.count === 1 ? "" : "s"} · {money(pending.amount)}{sev(oldestHours) !== "ok" && <span className="ml-2 rounded-full px-2 py-0.5 text-[11px] font-semibold text-black" style={{ background: pendingTone }}>{sev(oldestHours) === "critical" ? "Overdue" : "Aging"}</span>}</>}
                extra={`Oldest waiting ${ageLabel(pending.oldestAt)}`} />
            )}
            {att?.depositsNeedingReview > 0 && (
              <Alert icon={AlertTriangle} tone={VIZ.warning} href="/Dashboard/Deposits?tab=review" cta="Review"
                title={`${att.depositsNeedingReview} deposit${att.depositsNeedingReview === 1 ? "" : "s"} need review`} extra="Nothing was credited automatically" />
            )}
            {snap?.unreadContacts > 0 && (
              <Alert icon={MessageSquare} tone={VIZ.axis} href="/Dashboard/contactUs" cta="Open"
                title={`${snap.unreadContacts} unread message${snap.unreadContacts === 1 ? "" : "s"}`} />
            )}
            {att?.dormantWithFunds > 0 && (
              <Alert icon={UserX} tone={VIZ.axis} href="/Dashboard/AllUser?segment=dormant" cta="See users"
                title={`${att.dormantWithFunds} dormant user${att.dormantWithFunds === 1 ? "" : "s"} holding funds`} extra="No activity for 30+ days" />
            )}
          </div>
        )}
      </section>

      {/* the four numbers that matter */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile loading={loading} label="Net Cash Flow" value={cur ? money(netNow) : "—"} delta={cur ? delta(netNow, netPrev) : undefined} />
        <StatTile loading={loading} label="Total Deposits" value={cur ? money(cur.deposits) : "—"} delta={cur ? delta(cur.deposits, prev.deposits) : undefined} sub={cur ? `${num(cur.depositCount)} credited` : undefined} />
        <StatTile loading={loading} label="Total Withdrawals" value={cur ? money(cur.withdrawals) : "—"} delta={cur ? delta(cur.withdrawals, prev.withdrawals) : undefined} upIs="neutral" sub={cur ? `${num(cur.withdrawalCount)} paid` : undefined} />
        <StatTile loading={loading} label="New Users" value={cur ? num(cur.newUsers) : "—"} delta={cur ? delta(cur.newUsers, prev.newUsers) : undefined} sub={cur ? `${num(cur.newDepositors)} deposited` : undefined} />
      </div>

      {/* secondary figures: one quiet strip instead of more tiles */}
      <dl data-strip className="flex flex-wrap gap-x-8 gap-y-2 rounded-2xl bg-[#1e1e1e] px-4 py-3 text-sm">
        {[
          { l: "Active users", v: cur ? `${num(cur.activeUsers)} of ${num(snap?.users ?? 0)}` : "—" },
          { l: "Machine & Share Purchases", v: cur ? money(cur.investments) : "—" },
          { l: "Profit Paid to Users", v: cur ? money(cur.profitPaid) : "—" },
        ].map((x) => (
          <div key={x.l} className="flex items-baseline gap-2"><dt style={{ color: VIZ.muted }}>{x.l}</dt><dd className="font-semibold tabular-nums text-white">{x.v}</dd></div>
        ))}
      </dl>

      <div className="grid gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-2" title="Customer Funds Held" subtitle="Owed to users right now">
          {snap ? (
            <div>
              <p className="text-[32px] font-semibold leading-tight text-white">{money(snap.fundsHeld)}</p>
              <p className="text-xs" style={{ color: VIZ.muted }}>{num(snap.usersWithBalance)} user{snap.usersWithBalance === 1 ? "" : "s"} hold a balance</p>
              <div className="mt-3 flex h-2.5 w-full gap-[2px] overflow-hidden rounded-full" role="img" aria-label={`Deposited ${money(snap.fundsDeposited)}, profit ${money(snap.fundsProfit)}`}>
                <div style={{ width: `${snap.fundsHeld ? (snap.fundsDeposited / snap.fundsHeld) * 100 : 0}%`, background: VIZ.deposits }} />
                <div style={{ width: `${snap.fundsHeld ? (snap.fundsProfit / snap.fundsHeld) * 100 : 0}%`, background: VIZ.profit }} />
              </div>
              <ul className="mt-2 space-y-1 text-xs" style={{ color: VIZ.textSecondary }}>
                <li className="flex justify-between"><span className="flex items-center gap-1.5"><i className="inline-block h-2 w-2 rounded-sm" style={{ background: VIZ.deposits }} />Deposited funds</span><strong className="text-white">{money(snap.fundsDeposited)}</strong></li>
                <li className="flex justify-between"><span className="flex items-center gap-1.5"><i className="inline-block h-2 w-2 rounded-sm" style={{ background: VIZ.profit }} />Mining profit</span><strong className="text-white">{money(snap.fundsProfit)}</strong></li>
              </ul>
              {snap.top5Share > 0.75 && <p className="mt-3 text-xs" style={{ color: VIZ.serious }}>▲ Concentrated: the top 5 users hold {Math.round(snap.top5Share * 100)}% of all funds.</p>}
            </div>
          ) : <p className="text-sm" style={{ color: VIZ.muted }}>Loading…</p>}
        </Card>
        <Card className="xl:col-span-3" title="Top Balances" subtitle="Who holds the most"
          action={<Link href="/Dashboard/AllUser?sort=balance&dir=desc" className="text-xs font-medium text-green-400 hover:underline">See all users</Link>}>
          {(att?.topUsers || []).length === 0 ? <p className="py-6 text-center text-sm" style={{ color: VIZ.muted }}>No balances yet</p> : (
            <ol className="space-y-3">
              {att.topUsers.slice(0, 5).map((u: any, i: number) => (
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
      </div>

      <Card title="Latest Activity" subtitle="Last 5 ledger entries"
        action={<Link href="/Dashboard/Ledger" className="inline-flex items-center gap-1 text-xs font-medium text-green-400 hover:underline">Open ledger <ArrowRight className="h-3.5 w-3.5" aria-hidden /></Link>}>
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-sm">
            <tbody>
              {(recent?.rows || []).map((r: any) => (
                <tr key={r.id} className="border-t first:border-t-0" style={{ borderColor: VIZ.grid }}>
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
  );
}

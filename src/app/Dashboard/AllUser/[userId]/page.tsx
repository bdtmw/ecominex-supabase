// @ts-nocheck

"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

import { fetchUserMachines, fetchUserTotalProfit } from "@/lib/feature/userMachine/usermachineApi";
import { AppDispatch } from "@/lib/store/store";
import { useUsers } from "@/hooks/Userdetail";
import { getUserBalance } from "@/lib/feature/userMachine/balanceSlice";
import { getUserShareDetails } from "@/lib/feature/shareMachine/shareMachineSlice";
import DashboardLayout from "@/components/Dashboard/DasboardLayout/DasboardLayout";
import DashboardHeader from "@/components/Dashboard/DashboardHeader/DashboardHeader";
import Image from "next/image";
import { ToastContainer } from "react-toastify";
import Link from "next/link";
import ProtectedRoutes from "@/components/config/protectedRoute/ProtectedRoutes";
import { useAdminFetch } from "@/components/Dashboard/analytics/useAdminFetch";

// exact figures, never abbreviated (1,150.00 not 1.1K)
const usd = (n?: number) =>
  "$" + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "N/A";
const fmtDateTime = (d?: string) =>
  d
    ? new Date(d).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : "Never";

const TAGS: Record<string, { label: string; cls: string }> = {
  new: { label: "New", cls: "bg-blue-900/40 text-blue-300" },
  pending_withdrawal: { label: "Pending withdrawal", cls: "bg-yellow-900/40 text-yellow-300" },
  dormant: { label: "Dormant", cls: "bg-zinc-700/60 text-zinc-300" },
  never_deposited: { label: "Never deposited", cls: "bg-red-900/40 text-red-300" },
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[13px] text-gray-400">{label}</p>
      <div className="border border-zinc-600 rounded-[6px] px-4 min-h-[46px] flex items-center text-[14px] font-medium text-[#f9f9f9] break-all">
        {value || "N/A"}
      </div>
    </div>
  );
}

function Stat({ title, value, note, accent }: { title: string; value: string; note?: string; accent?: boolean }) {
  return (
    <div
      className={`px-5 py-5 rounded-[20px] flex flex-col gap-2 ${
        accent ? "bg-gradient-to-b from-[#1dae52] to-[#08381a]" : "bg-[#1b1b1b]"
      }`}
    >
      <h3 className="text-[14px] font-medium text-gray-100">{title}</h3>
      <p className="text-[30px] leading-[34px] font-semibold text-white break-all">{value}</p>
      {note && <span className="text-[12.5px] text-gray-300">{note}</span>}
    </div>
  );
}

const Section = ({ title, right, children }: any) => (
  <section className="bg-[#1b1b1b] mx-2 mt-5 px-5 py-6 rounded-[10px]">
    <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
      <h2 className="text-white text-[21px] font-medium">{title}</h2>
      {right}
    </div>
    {children}
  </section>
);

const Empty = ({ cols, children }: any) => (
  <tr>
    <td colSpan={cols} className="py-8 text-center text-gray-300">
      {children}
    </td>
  </tr>
);

const UserDetailsPage = () => {
  const { userId } = useParams();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  const shareMachineState = useSelector((state: any) => state.shareMachine);
  const userShares = shareMachineState?.userShares?.shares || [];
  const sharesSummary = shareMachineState?.userShares?.summary || null;
  const userMachines = useSelector((state: any) => state.userMachine)?.userMachines || [];

  const [localLoading, setLocalLoading] = useState(true);

  const { users } = useUsers();
  const currentUser = users?.find((user) => user._id === userId) || null;

  // money + profile figures come from the same source as the Users table (exact, not limited by the ledger start date)
  const overviewUrl = currentUser?.email
    ? `/api/v1/admin/users/overview?search=${encodeURIComponent(currentUser.email)}&limit=5`
    : null;
  const { data: overview } = useAdminFetch<any>(overviewUrl);
  const money = overview?.rows?.find((r: any) => r.id === userId) || null;

  const { data: recent, loading: recentLoading } = useAdminFetch<any>(
    userId ? `/api/v1/admin/ledger?user=${userId}&limit=10` : null,
  );

  useEffect(() => {
    if (!userId) return;
    setLocalLoading(true);
    Promise.all([
      dispatch(fetchUserMachines(userId)),
      dispatch(fetchUserTotalProfit(userId)),
      dispatch(getUserBalance(userId)),
      dispatch(getUserShareDetails(userId as string)),
    ])
      .catch((e) => console.error("Error fetching user data:", e))
      .finally(() => setLocalLoading(false));
  }, [dispatch, userId]);

  if (localLoading && !currentUser) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-transparent">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-green-500"></div>
      </div>
    );
  }

  const fullName = `${currentUser?.firstName || ""} ${currentUser?.lastName || ""}`.trim() || "User";
  const regularCount = userMachines.length;
  const shareCount = userShares.length;
  const tags: string[] = money?.tags || [];

  return (
    <ProtectedRoutes>
      <DashboardLayout>
        <DashboardHeader title="User Management" desc="Everything about this user in one place." />
        <Button
          onClick={() => router.back()}
          variant="ghost"
          className="mb-4 -mt-3 border-b-[1px] rounded-none px-2 ml-2 border-green-500 text-green-500 hover:bg-transparent hover:text-green-400"
        >
          <ArrowLeft className="mr-0 h-4 w-4" />
          Back to Users
        </Button>

        {/* ============ HEADER ============ */}
        <section className="bg-[#1b1b1b] px-5 mx-2 py-6 rounded-[10px]">
          <div className="flex gap-5 items-center flex-wrap">
            <Image src={"/userdash.jpg"} width={90} height={90} alt="User" className="rounded-full" />
            <div className="flex-1 min-w-[220px]">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-white text-3xl font-bold">{fullName}</h1>
                {money?.role === "admin" && (
                  <span className="text-xs px-2 py-1 rounded-full bg-purple-900/40 text-purple-300">Admin</span>
                )}
                {tags
                  .filter((t) => TAGS[t])
                  .map((t) => (
                    <span key={t} className={`text-xs px-2 py-1 rounded-full ${TAGS[t].cls}`}>
                      {TAGS[t].label}
                    </span>
                  ))}
              </div>
              <p className="text-gray-300 mt-1 font-[500]">{currentUser?.email || "N/A"}</p>
              <p className="text-gray-400 mt-1 text-sm">
                Joined {fmtDate(currentUser?.createdAt)} · Last activity {fmtDateTime(money?.lastActivityAt)}
              </p>
            </div>
            <Link
              href={`/Dashboard/Ledger?user=${userId}`}
              className="inline-flex items-center gap-2 rounded-lg border border-green-500/50 px-4 py-2 text-sm font-medium text-green-400 transition hover:bg-green-500/10"
            >
              Open full ledger
            </Link>
          </div>
        </section>

        {/* ============ MONEY ============ */}
        <section className="mx-2 mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat
            accent
            title="Total Invested"
            value={money ? usd(money.totalDeposited) : "…"}
            note="Total deposited by this user"
          />
          <Stat
            title="Current Balance"
            value={money ? usd(money.totalBalance) : "…"}
            note={money ? `Deposited ${usd(money.depositedBalance)} · Profit ${usd(money.profitBalance)}` : undefined}
          />
          <Stat title="Total Withdrawn" value={money ? usd(money.totalWithdrawn) : "…"} note="Paid out to the user" />
          <Stat
            title="Pending Withdrawal"
            value={money ? usd(money.pendingWithdrawal) : "…"}
            note={Number(money?.pendingWithdrawal) > 0 ? "Waiting for admin review" : "Nothing waiting"}
          />
        </section>

        {/* ============ PROFILE ============ */}
        <Section title="Profile Details">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Full Name" value={fullName} />
            <Field label="Email" value={currentUser?.email} />
            <Field label="Phone Number" value={currentUser?.phoneNumber} />
            <Field label="Country" value={currentUser?.country} />
            <Field label="Joined" value={fmtDate(currentUser?.createdAt)} />
            <Field label="Last Activity" value={fmtDateTime(money?.lastActivityAt)} />
            <Field label="Role" value={money?.role === "admin" ? "Admin" : "User"} />
            <Field label="Two-factor login" value={money ? (money.twoFactor ? "Enabled" : "Off") : ""} />
            <Field label="Referrals made" value={money ? String(money.referrals ?? 0) : ""} />
            <Field label="Referral code" value={currentUser?.referralCode} />
          </div>
          <ToastContainer />
        </Section>

        {/* ============ MACHINES ============ */}
        <Section
          title="Machines"
          right={
            <span className="text-sm text-gray-300">
              {regularCount + shareCount} total · {regularCount} regular · {shareCount} share-based
            </span>
          }
        >
          <div className="overflow-x-auto mb-10">
            <h3 className="text-white text-lg font-semibold mb-3">Assigned machines</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-200 border-b border-[#ffffff65]">
                  <th className="py-3 text-left font-medium">Machine</th>
                  <th className="py-3 text-left font-medium">Assigned</th>
                  <th className="py-3 text-center font-medium">Profit so far</th>
                  <th className="py-3 text-center font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {localLoading ? (
                  <Empty cols={4}>Loading...</Empty>
                ) : userMachines.length === 0 ? (
                  <Empty cols={4}>No regular machines.</Empty>
                ) : (
                  userMachines.map((item) => (
                    <tr key={item._id} className="border-b border-[#ffffff30] hover:bg-[#0f0f0f78] duration-300">
                      <td className="py-3 text-white">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#2a2a2a] flex items-center justify-center text-green-400">
                            {(item.machine?.machineName || "U").charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium">{item.machine?.machineName || "N/A"}</span>
                        </div>
                      </td>
                      <td className="py-3 text-gray-200">{fmtDate(item.assignedDate)}</td>
                      <td className="py-3 text-center font-semibold text-white">{usd(item.monthlyProfitAccumulated)}</td>
                      <td className="py-3 text-center">
                        <span
                          className={`px-2 py-1 rounded-full text-[13px] ${
                            (item.status ?? "").toLowerCase() === "active"
                              ? "bg-green-800/40 text-green-400"
                              : "bg-[#66000095] text-red-400"
                          }`}
                        >
                          {item.status ?? "-"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="overflow-x-auto">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
              <h3 className="text-white text-lg font-semibold">Share-based machines</h3>
              {sharesSummary && (
                <div className="flex items-center gap-2 flex-wrap text-[13px]">
                  <span className="bg-[#2a2a2a] text-gray-300 px-3 py-1 rounded-full">
                    Shares: <b className="text-white">{sharesSummary.totalShares}</b>
                  </span>
                  <span className="bg-[#2a2a2a] text-gray-300 px-3 py-1 rounded-full">
                    Invested: <b className="text-green-400">{usd(sharesSummary.totalInvestment)}</b>
                  </span>
                  <span className="bg-[#2a2a2a] text-gray-300 px-3 py-1 rounded-full">
                    Monthly: <b className="text-green-400">{usd(sharesSummary.expectedMonthlyProfit)}</b>
                  </span>
                  <span className="bg-[#2a2a2a] text-gray-300 px-3 py-1 rounded-full">
                    Earned: <b className="text-yellow-400">{usd(sharesSummary.totalProfitEarned)}</b>
                  </span>
                </div>
              )}
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-200 border-b border-[#ffffff65]">
                  <th className="py-3 text-left font-medium">Machine</th>
                  <th className="py-3 text-left font-medium">Purchased</th>
                  <th className="py-3 text-center font-medium">Shares</th>
                  <th className="py-3 text-center font-medium">Invested</th>
                  <th className="py-3 text-center font-medium">Monthly profit</th>
                  <th className="py-3 text-center font-medium">Earned</th>
                </tr>
              </thead>
              <tbody>
                {shareMachineState?.loading ? (
                  <Empty cols={6}>Loading shares...</Empty>
                ) : userShares.length === 0 ? (
                  <Empty cols={6}>No share-based machines.</Empty>
                ) : (
                  userShares.map((share) => (
                    <tr key={share.id} className="border-b border-[#ffffff30] hover:bg-[#0f0f0f78] duration-300">
                      <td className="py-3 text-white font-medium">{share.machineName || "N/A"}</td>
                      <td className="py-3 text-gray-200">{fmtDate(share.purchaseDate)}</td>
                      <td className="py-3 text-center text-white font-semibold">{share.numberOfShares}</td>
                      <td className="py-3 text-center text-white">{usd(share.totalInvestment)}</td>
                      <td className="py-3 text-center text-green-400">
                        {usd((share.profitPerShare || 0) * (share.numberOfShares || 0))}
                      </td>
                      <td className="py-3 text-center text-yellow-400">{usd(share.totalProfitEarned)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Section>

        {/* ============ RECENT ACTIVITY ============ */}
        <Section
          title="Recent activity"
          right={
            <Link href={`/Dashboard/Ledger?user=${userId}`} className="text-sm font-medium text-green-400 hover:underline">
              See everything in the ledger →
            </Link>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-200 border-b border-[#ffffff65]">
                  <th className="py-3 text-left font-medium">Date</th>
                  <th className="py-3 text-left font-medium">Type</th>
                  <th className="py-3 text-left font-medium">Details</th>
                  <th className="py-3 text-right font-medium">Amount</th>
                  <th className="py-3 text-center font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentLoading && !recent ? (
                  <Empty cols={5}>Loading...</Empty>
                ) : !recent?.rows?.length ? (
                  <Empty cols={5}>No recorded activity yet.</Empty>
                ) : (
                  recent.rows.map((r) => {
                    const s = Number(r.signedAmount || 0);
                    return (
                      <tr key={r.id} className="border-b border-[#ffffff30]">
                        <td className="py-3 text-gray-200 whitespace-nowrap">{fmtDateTime(r.date)}</td>
                        <td className="py-3 text-white">{r.typeLabel}</td>
                        <td className="py-3 text-gray-400 max-w-[320px] truncate">{r.description || "—"}</td>
                        <td
                          className="py-3 text-right font-semibold whitespace-nowrap"
                          style={{ color: s > 0 ? "#4ade80" : s < 0 ? "#f87171" : "#d1d5db" }}
                        >
                          {s > 0 ? "+" : s < 0 ? "−" : ""}
                          {usd(Math.abs(s || r.amount))}
                        </td>
                        <td className="py-3 text-center">
                          <span
                            className={`px-2 py-1 rounded-full text-[12px] ${
                              r.status === "approved" || r.status === "completed"
                                ? "bg-green-800/40 text-green-400"
                                : r.status === "pending"
                                ? "bg-yellow-800/40 text-yellow-400"
                                : "bg-[#66000095] text-red-400"
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Section>
        <div className="h-8" />
      </DashboardLayout>
    </ProtectedRoutes>
  );
};

export default UserDetailsPage;

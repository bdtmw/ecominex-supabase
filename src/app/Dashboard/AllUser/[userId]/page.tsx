// @ts-nocheck

"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { ArrowLeft, ArrowUpRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  fetchUserMachines,
  fetchUserTotalProfit,
} from "@/lib/feature/userMachine/usermachineApi";
import { AppDispatch } from "@/lib/store/store";
import { useUsers } from "@/hooks/Userdetail";
import { getUserBalance } from "@/lib/feature/userMachine/balanceSlice";
import { getUserShareDetails } from "@/lib/feature/shareMachine/shareMachineSlice";
import { fetchUserWithdrawals } from "@/lib/feature/withdraw/withdrawalSlice";
import DashboardLayout from "@/components/Dashboard/DasboardLayout/DasboardLayout";
import DashboardHeader from "@/components/Dashboard/DashboardHeader/DashboardHeader";
import Image from "next/image";
import { ToastContainer } from "react-toastify";
import Link from "next/link";
import ProtectedRoutes from "@/components/config/protectedRoute/ProtectedRoutes";

interface RootState {
  userMachine: {
    userMachines: any[];
    userProfit: { totalProfit: number };
    isLoading: boolean;
  };
  transactions: {
    transactions: any[];
    totalTransactions: number;
    isLoading: boolean;
  };
  balance: {
    userBalance: { balances: { total: number } };
    isLoading: boolean;
  };
  withdrawal: {
    withdrawals: any[];
    pendingWithdrawals: any[];
    allWithdrawals: any[];
    stats: any;
    pagination: {
      currentPage: number;
      totalPages: number;
      totalWithdrawals: number;
    };
    isLoading: boolean;
    error: string | null;
  };
  shareMachine: {
    specialMachine: any | null;
    userShares: {
      shares: any[];
      summary: {
        totalShares: number;
        totalInvestment: number;
        expectedMonthlyProfit: number;
        totalProfitEarned: number;
      } | null;
    };
    loading: boolean;
    error: string | null;
    purchaseSuccess: boolean;
    saleSuccess: boolean;
    updateSuccess: boolean;
  };
}

const UserDetailsPage = () => {
  const { userId } = useParams();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  const shareMachineState = useSelector((state: RootState) => state.shareMachine);
  const userShares = shareMachineState?.userShares?.shares || [];
  const sharesSummary = shareMachineState?.userShares?.summary || null;

  const [activeTab, setActiveTab] = useState("overview");
  const [dataFetched, setDataFetched] = useState(false);
  const [localLoading, setLocalLoading] = useState(true);

  const userMachineState = useSelector((state: RootState) => state.userMachine);
  const transactionsState = useSelector((state: RootState) => state.transactions);
  const balanceState = useSelector((state: RootState) => state.balance);
  const withdrawalState = useSelector((state: RootState) => state.withdrawal);
  const withdrawals = withdrawalState?.withdrawals || [];

  const userMachines = userMachineState?.userMachines || [];
  const userProfit = userMachineState?.userProfit || { totalProfit: 0 };
  const transactions = transactionsState || {
    transactions: [],
    totalTransactions: 0,
  };
  const isLoading =
    userMachineState?.isLoading ||
    transactionsState?.isLoading ||
    balanceState?.isLoading ||
    false;
  const userBalance = balanceState?.userBalance?.balances?.total || 0;

  const { users } = useUsers();
  const currentUser = users?.find((user) => user._id === userId) || null;

  useEffect(() => {
    if (userId && currentUser?.email) {
      setLocalLoading(true);

      const fetchPromises = [
        dispatch(fetchUserMachines(userId)),
        dispatch(fetchUserTotalProfit(userId)),
        dispatch(
          fetchUserWithdrawals({
            email: currentUser.email,
            page: 1,
            limit: 10,
          }),
        ),
        dispatch(getUserBalance(userId)),
        dispatch(getUserShareDetails(userId as string)),
      ];

      Promise.all(fetchPromises)
        .then(() => {
          setDataFetched(true);
          setLocalLoading(false);
        })
        .catch((error) => {
          console.error("Error fetching user data:", error);
          setLocalLoading(false);
        });
    }
  }, [dispatch, userId, currentUser]);

  const formatDate = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  function formatAmount(amount?: number) {
    if (!amount && amount !== 0) return "0";
    if (amount >= 1_000_000_000) return (amount / 1_000_000_000).toFixed(1) + "B";
    if (amount >= 1_000_000) return (amount / 1_000_000).toFixed(1) + "M";
    if (amount >= 1_000) return (amount / 1_000).toFixed(1) + "K";
    return amount.toLocaleString("en-US");
  }

  const stats = [
    {
      title: "Total Machines",
      value: (userMachines?.length || 0) + (userShares?.length || 0),
      note: `${userMachines?.length || 0} Regular · ${userShares?.length || 0} Share-Based`,
      gradient: true,
      navigate: "",
    },
    {
      title: "Total Balance",
      value: formatAmount(userBalance || userProfit?.totalProfit || 0),
      note: "Count of all Balance ",
      gradient: false,
      navigate: "",
    },
    {
      title: "Total Transaction",
      value: transactions?.totalTransactions || 0,
      note: " Count of all Transaction ",
      gradient: false,
      navigate: "",
    },
  ];

  if (localLoading || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-transparent">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-green-500"></div>
      </div>
    );
  }

  return (
    <ProtectedRoutes>
      <DashboardLayout>
        <DashboardHeader
          title="User Management"
          desc="Manage and track all user activity with real-time updates and organized details."
        />
        <Button
          onClick={() => router.back()}
          variant="ghost"
          className="mb-4 -mt-3 border-b-[1px] rounded-none px-2 ml-2 border-green-500 text-green-500 hover:bg-transparent hover:text-green-400"
        >
          <ArrowLeft className="mr-0 h-4 w-4" />
          Back to Users
        </Button>

        <section className="bg-[#1b1b1b] px-5 mx-2 pb-8 pt-3 rounded-[10px]">
          {/* TOP USER SECTION */}
          <div className="flex gap-6 items-center border-b-[1px] pb-7 border-[#969696a0]">
            <Image
              src={"/userdash.jpg"}
              width={110}
              height={110}
              alt="User"
              className="rounded-full"
            />
            <div>
              <h1 className="text-white text-3xl font-bold">
                {currentUser?.firstName} {currentUser?.lastName || ""}
              </h1>
              <p className="text-gray-300 mt-1 font-[500]">
                {currentUser?.email || "N/A"}
              </p>
            </div>
          </div>

          {/* Profile Details */}
          <div className="px-1 mt-8">
            <h2 className="text-[21px] font-[500] text-white">Profile Details</h2>
            <div className="space-y-5 pt-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-gray-100 font-[500] tracking-[0.3px] text-[15px]">
                    Full Name
                  </label>
                  <div className="border-zinc-400 border rounded-[5px] px-4 h-[50px] font-[500] bg-transparent text-[#f9f9f9] text-[14px] flex items-center">
                    {currentUser?.firstName} {currentUser?.lastName}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-gray-100 font-[500] tracking-[0.3px] text-[15px]">
                    Created At
                  </label>
                  <div className="border-zinc-400 border rounded-[5px] px-4 h-[50px] font-[500] bg-transparent text-[#f9f9f9] text-[14px] flex items-center">
                    {formatDate(currentUser?.createdAt)}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-gray-100 font-[500] tracking-[0.3px] text-[15px]">
                  Email
                </label>
                <div className="border-zinc-400 border rounded-[5px] px-4 h-[50px] font-[500] bg-transparent text-[#f9f9f9] text-[14px] flex items-center">
                  {currentUser?.email}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-gray-100 font-[500] tracking-[0.3px] text-[15px]">
                    Country
                  </label>
                  <div className="border-zinc-400 border rounded-[5px] px-4 h-[50px] font-[500] bg-transparent text-[#f9f9f9] text-[14px] flex items-center">
                    {currentUser?.country || "N/A"}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-gray-100 font-[500] tracking-[0.3px] text-[15px]">
                    Phone Number
                  </label>
                  <div className="border-zinc-400 border rounded-[5px] px-4 h-[50px] font-[500] bg-transparent text-[#f9f9f9] text-[14px] flex items-center">
                    {currentUser?.phoneNumber}
                  </div>
                </div>
              </div>

              <ToastContainer />
            </div>
          </div>
        </section>

        <div>
          <Tabs defaultValue="assign" className="w-full mt-5">
            <TabsList className="grid grid-cols-3 mb-8 gap-10 w-[400px] bg-transparent text-white text-[15.5px]">
              <TabsTrigger value="assign">Overview</TabsTrigger>
              <TabsTrigger value="assigned">Machines</TabsTrigger>
              <TabsTrigger value="addmachine">Transactions</TabsTrigger>
            </TabsList>

            {/* ============ TAB 1 — OVERVIEW ============ */}
            <TabsContent value="assign">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats.map((item, index) => (
                  <div
                    key={index}
                    className={`relative px-5 py-[26px] rounded-[25px] shadow-sm flex flex-col gap-4.5 justify-between ${
                      item.gradient
                        ? "bg-gradient-to-b from-[#1dae52] to-[#08381a] border-none"
                        : "bg-[#1b1b1b] "
                    }`}
                  >
                    <Link className="absolute right-0 top-0" href={item.navigate}>
                      <div
                        className={`absolute top-3 p-1.5 right-3 text-lg opacity-100 border-[1.5px] rounded-full ${
                          item.gradient ? "!bg-[#fff] " : "bg-transparent"
                        } border-gray-200`}
                      >
                        <ArrowUpRight
                          className={`size-5.5 ${
                            item.gradient ? "text-[#000]" : "text-gray-200"
                          }`}
                        />
                      </div>
                    </Link>

                    <h3 className="text-[15px] font-medium text-gray-100">
                      {item.title}
                    </h3>
                    <p className="text-[52px] leading-[55px] font-medium text-gray-200">
                      {item.value}
                    </p>
                    <span
                      className={`text-[12.5px] ${
                        item.gradient ? "text-gray-200" : "text-gray-300"
                      }`}
                    >
                      {item.note}
                    </span>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* ============ TAB 2 — MACHINES ============ */}
            <TabsContent value="assigned">
              <div className="bg-[#1b1b1b] px-6 py-6 rounded-md">
                {/* ====== REGULAR MACHINES TABLE ====== */}
                <div className="mb-10">
                  <h1 className="text-white text-[25px] font-semibold mb-5">
                    Assigned Machines
                  </h1>

                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-200 border-b border-[#ffffff65] text-[16px]">
                        <th className="py-3 text-left font-medium">Machine Name</th>
                        <th className="py-3 text-left font-medium">Assigned Date</th>
                        <th className="py-3 text-center font-medium">Current Profit</th>
                        <th className="py-3 text-center font-medium">Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {isLoading ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-gray-300">
                            Loading...
                          </td>
                        </tr>
                      ) : userMachines.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-gray-300">
                            No machines found.
                          </td>
                        </tr>
                      ) : (
                        userMachines.map((item) => (
                          <tr
                            key={item._id}
                            className="border-b border-[#ffffff65] hover:bg-[#0f0f0f78] duration-300"
                          >
                            {/* MACHINE NAME */}
                            <td className="py-4 flex items-center gap-3 text-white">
                              <div className="w-10 h-10 rounded-full bg-[#2a2a2a] flex items-center justify-center text-md text-green-400">
                                {(item.machine?.machineName || "U").charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <span className="font-medium text-[15px] block">
                                  {item.machine?.machineName || "N/A"}
                                </span>
                              </div>
                            </td>

                            {/* DATE */}
                            <td className="py-4 text-gray-200 text-start">
                              {formatDate(item.assignedDate)}
                            </td>

                            {/* PROFIT */}
                            <td className="py-4 text-center text-[16px] font-[600] text-white">
                              ${formatAmount(item.monthlyProfitAccumulated)}
                            </td>

                            {/* STATUS */}
                            <td className="py-4 text-center">
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

                {/* ====== SHARE-BASED MACHINES TABLE ====== */}
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <h1 className="text-white text-[25px] font-semibold">
                      Share-Based Machines
                    </h1>

                    {/* Summary badges */}
                    {sharesSummary && (
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="bg-[#2a2a2a] text-gray-300 text-[13px] px-3 py-1 rounded-full">
                          Total Shares:{" "}
                          <span className="text-white font-semibold">
                            {sharesSummary.totalShares}
                          </span>
                        </span>
                        <span className="bg-[#2a2a2a] text-gray-300 text-[13px] px-3 py-1 rounded-full">
                          Total Invested:{" "}
                          <span className="text-green-400 font-semibold">
                            ${formatAmount(sharesSummary.totalInvestment)}
                          </span>
                        </span>
                        <span className="bg-[#2a2a2a] text-gray-300 text-[13px] px-3 py-1 rounded-full">
                          Monthly Profit:{" "}
                          <span className="text-green-400 font-semibold">
                            ${formatAmount(sharesSummary.expectedMonthlyProfit)}
                          </span>
                        </span>
                        <span className="bg-[#2a2a2a] text-gray-300 text-[13px] px-3 py-1 rounded-full">
                          Total Earned:{" "}
                          <span className="text-yellow-400 font-semibold">
                            ${formatAmount(sharesSummary.totalProfitEarned)}
                          </span>
                        </span>
                      </div>
                    )}
                  </div>

                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-200 border-b border-[#ffffff65] text-[16px]">
                        <th className="py-3 text-left font-medium">Machine Name</th>
                        <th className="py-3 text-left font-medium">Purchase Date</th>
                        <th className="py-3 text-center font-medium">Shares Owned</th>
                        <th className="py-3 text-center font-medium">Total Invested</th>
                        <th className="py-3 text-center font-medium">Monthly Profit</th>
                        <th className="py-3 text-center font-medium">Total Earned</th>
                      </tr>
                    </thead>

                    <tbody>
                      {shareMachineState?.loading ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-gray-300">
                            Loading shares...
                          </td>
                        </tr>
                      ) : userShares.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-gray-300">
                            No share-based machines found.
                          </td>
                        </tr>
                      ) : (
                        userShares.map((share) => {
                          const shareMonthlyProfit =
                            (share.profitPerShare || 0) * (share.numberOfShares || 0);

                          return (
                            <tr
                              key={share.id}
                              className="border-b border-[#ffffff65] hover:bg-[#0f0f0f78] duration-300"
                            >
                              {/* MACHINE NAME */}
                              <td className="py-4 text-white">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-[#1a3a2a] flex items-center justify-center text-md text-green-400 border border-green-800">
                                    {(share.machineName || "S").charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <span className="font-medium text-[15px] block">
                                      {share.machineName || "N/A"}
                                    </span>
                                    <span className="text-[11px] text-green-500 bg-green-900/30 px-2 py-0.5 rounded-full">
                                      Share-Based
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* PURCHASE DATE */}
                              <td className="py-4 text-gray-200 text-start">
                                {formatDate(share.purchaseDate)}
                              </td>

                              {/* SHARES OWNED */}
                              <td className="py-4 text-center text-white font-semibold">
                                {share.numberOfShares}
                              </td>

                              {/* TOTAL INVESTED */}
                              <td className="py-4 text-center text-[16px] font-[600] text-white">
                                ${formatAmount(share.totalInvestment)}
                              </td>

                              {/* MONTHLY PROFIT */}
                              <td className="py-4 text-center text-[16px] font-[600] text-green-400">
                                ${formatAmount(shareMonthlyProfit)}
                              </td>

                              {/* TOTAL EARNED */}
                              <td className="py-4 text-center text-[16px] font-[600] text-yellow-400">
                                ${formatAmount(share.totalProfitEarned)}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

{/* ============ TAB 3 — TRANSACTIONS ============ */}
<TabsContent value="addmachine">
  <div className="bg-[#1b1b1b] px-6 py-6 rounded-md">
    <div>
      <h1 className="text-white text-[25px] font-semibold mb-5">
        Transaction History
      </h1>
    </div>

    <div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-200 border-b border-[#ffffff65] text-[16px]">
            <th className="py-3 text-left font-medium">Date</th>
            <th className="py-3 text-left font-medium">Type</th>
            <th className="py-3 text-center font-medium">Amount</th>
            <th className="py-3 text-center font-medium">Status</th>
          </tr>
        </thead>

        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={4} className="py-8 text-center text-gray-300">
                Loading...
              </td>
            </tr>
          ) : withdrawals.length === 0 ? (
            <tr>
              <td colSpan={4} className="py-8 text-center text-gray-300">
                No transactions found.
              </td>
            </tr>
          ) : (
            withdrawals.map((item) => {
              // ✅ Normalize type to lowercase
              const type = (item.type || "").toLowerCase();

              // ✅ Debug — check what type is coming through
              console.log("Transaction type:", item.type, "→ normalized:", type);

              // ✅ Map type to display label
              const typeLabel =
                type === "admin_add"
                  ? "Deposit"
                  : type === "withdrawal"
                  ? "Withdrawal"
                  : type === "profit"
                  ? "Profit"
                  : type === "machine_purchase"
                  ? "Machine Purchase"
                  : type === "machine_sale"
                  ? "Machine Sale"
                  : type === "share_purchase"
                  ? "Share Purchase"
                  : type === "share_profit"
                  ? "Share Profit"
                  : type === "share_sale"
                  ? "Share Sale"
                  : item.type || "N/A";

              // ✅ Determine color using hex codes (bypass Tailwind purge)
              const typeColor =
                type === "admin_add" ||
                type === "profit" ||
                type === "share_profit"
                  ? "#4ade80" // green-400
                  : type === "withdrawal"
                  ? "#f87171" // red-400
                  : type === "machine_purchase" || type === "share_purchase"
                  ? "#60a5fa" // blue-400
                  : type === "machine_sale" || type === "share_sale"
                  ? "#facc15" // yellow-400
                  : "#d1d5db"; // gray-300

              return (
                <tr
                  key={item._id}
                  className="border-b border-[#ffffff65] hover:bg-[#0f0f0f78] duration-300"
                >
                  {/* DATE */}
                  <td className="py-4 flex items-center gap-3 text-white">
                    <div>
                      <span className="font-medium text-[15px] block">
                        {formatDate(item.transactionDate)}
                      </span>
                    </div>
                  </td>

                  {/* ✅ TYPE — with inline color style */}
                  <td
                    className="py-4 text-start font-medium"
                    style={{ color: typeColor }}
                  >
                    {typeLabel}
                  </td>

                  {/* AMOUNT */}
                  <td className="py-4 text-center text-[16px] font-[600] text-white">
                    ${formatAmount(item.amount)}
                  </td>

                  {/* STATUS */}
                  <td className="py-4 text-center">
                    <span
                      className={`px-2 py-1 rounded-full text-[13px] ${
                        (item.status ?? "").toLowerCase() === "approved" ||
                        (item.status ?? "").toLowerCase() === "completed"
                          ? "bg-green-800/40 text-green-400"
                          : (item.status ?? "").toLowerCase() === "pending"
                          ? "bg-yellow-800/40 text-yellow-400"
                          : "bg-[#66000095] text-red-400"
                      }`}
                    >
                      {item.status ?? "-"}
                    </span>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  </div>
</TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    </ProtectedRoutes>
  );
};

export default UserDetailsPage;
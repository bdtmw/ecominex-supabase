"use client";
import Image from "next/image";
import images from "../../../../public/userdash.jpg";
import { useDispatch, useSelector } from "react-redux";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { AppDispatch, RootState } from "@/lib/store/store";
import { useEffect, useState } from "react";
import { getStats } from "@/lib/feature/userMachine/balanceSlice";
import Link from "next/link";
import { useUsers } from "@/hooks/Userdetail";
import { getAllContacts } from "@/lib/feature/contact/contactsSlice";
import { fetchPendingWithdrawals } from "@/lib/feature/withdraw/withdrawalSlice";

type UID = string | number;
interface UserData {
  id?: UID;
  _id?: UID;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  phoneNumber?: string;
  country?: string;
  image?: string;
  createdAt?: string;
}

export default function DashboardHero() {
  const dispatch = useDispatch<AppDispatch>();

  const statss = useSelector((state: RootState) => state.balance.stats);

  const { users: remoteUserss, isLoading } = useUsers() as {
    users: UserData[] | undefined;
    isLoading?: boolean;
  };

  const { contacts: remoteUsers } = useSelector(
    (state: RootState) => state.contact
  );

  // ✅ Get withdrawals from redux — check all possible keys
  const withdrawalState = useSelector((state: RootState) => state.withdrawal);
  
  const allWithdrawals =
    withdrawalState?.pendingWithdrawals ||
    withdrawalState?.allWithdrawals ||
    withdrawalState?.withdrawals ||
    [];

  // ✅ DEBUG — see what's in state
  useEffect(() => {
    console.log("=== WITHDRAWAL STATE DEBUG ===");
    console.log("Full withdrawalState:", withdrawalState);
    console.log("Selected allWithdrawals:", allWithdrawals);
  }, [withdrawalState]);

  useEffect(() => {
    dispatch(getStats());
    dispatch(getAllContacts({ page: 1, limit: 100 }) as any);
    dispatch(fetchPendingWithdrawals({ page: 1, limit: 100 }) as any);
  }, [dispatch]);

  const recentUsers = (remoteUserss || [])
    .sort(
      (a, b) =>
        new Date(b.createdAt ?? "").getTime() -
        new Date(a.createdAt ?? "").getTime()
    )
    .slice(0, 5);

  // ✅ Get 5 most recent withdrawals
  const recentWithdrawals = [...(allWithdrawals || [])]
    .sort((a: any, b: any) => {
      const dateA = new Date(a?.transactionDate || a?.createdAt || 0).getTime();
      const dateB = new Date(b?.transactionDate || b?.createdAt || 0).getTime();
      return dateB - dateA;
    })
    .slice(0, 5);

  const stats = [
    {
      title: "Total Users",
      value: statss?.stats.totalUsers || 0,
      note: "Registered users on platform",
      gradient: true,
      navigate: "/Dashboard/AllUser/",
    },
    {
      title: "Total Deposit",
      value: statss?.stats.totalDeposits || 0,
      note: "Count of all deposits ",
      gradient: false,
      navigate: "/Dashboard/AllTransaction/",
    },
    {
      title: "Total Withdraws",
      value: statss?.stats.totalWithdrawals || 0,
      note: " Count of all withdrawals ",
      gradient: false,
      navigate: "/Dashboard/AllTransaction/",
    },
    {
      title: "Total Machines",
      value: statss?.stats.totalMachines ?? 0,
      note: "Machines added to platform",
      gradient: false,
      navigate: "/Dashboard/Machine/",
    },
  ];

  function formatDate(dateString?: string) {
    if (!dateString) return "";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  function formatAmount(amount?: number) {
    if (!amount && amount !== 0) return "0";
    if (amount >= 1_000_000) return (amount / 1_000_000).toFixed(1) + "M";
    if (amount >= 1_000) return (amount / 1_000).toFixed(1) + "K";
    return amount.toLocaleString("en-US");
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-transparent">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-green-500"></div>
      </div>
    );
  }

  return (
    <>
      {/* Top stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((item, index) => (
          <div
            key={index}
            className={`relative px-5 py-[26px] rounded-[25px] shadow-sm 
              flex flex-col gap-4.5 justify-between
              ${
                item.gradient
                  ? "bg-gradient-to-b from-[#1dae52] to-[#08381a] border-none"
                  : "bg-[#1b1b1b]"
              }`}
          >
            <Link className="absolute right-0 top-0" href={item.navigate}>
              <div
                className={`absolute top-3 p-1.5 right-3 text-lg opacity-100 border-[1.5px] rounded-full ${
                  item.gradient ? "!bg-[#fff]" : "bg-transparent"
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
            <p className="text-[40px] sm:text-[52px] leading-[46px] sm:leading-[55px] font-medium text-gray-200">
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

      {/* Bottom two cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mt-7">
        {/* ============ Recent Joined ============ */}
        <div className="bg-[#1b1b1b] shadow-md rounded-[20px] py-6.5 w-full max-w-full md:max-w-xl">
          <div className="flex items-center justify-between mb-4 px-4 sm:px-6">
            <h2 className="text-[20px] sm:text-[25.5px] font-[500] text-white">
              Recent Joined
            </h2>
            <Link href={"/Dashboard/AllUser"}>
              <button className="px-1 text-center py-1 text-xs sm:text-sm font-medium bg-transparent border-green-500 border-b-[1.5px] flex items-center gap-2 text-gray-200 hover:text-green-500">
                View All <ArrowRight className="size-4.5" />
              </button>
            </Link>
          </div>

          <div>
            {recentUsers.map((m, index) => {
              const fullName = (
                m.name ||
                [m.firstName, m.lastName].filter(Boolean).join(" ")
              ).slice(0, 25);
              const dots =
                (
                  m.name ||
                  [m.firstName, m.lastName].filter(Boolean).join(" ")
                ).length > 16
                  ? "..."
                  : "";
              return (
                <div
                  key={index}
                  className="flex items-center justify-between px-3 mx-4 pt-5 pb-3.5 border-b border-[#555] transition-all duration-300 hover:scale-[1.01] hover:-rotate-1"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#2a2a2a] flex items-center justify-center text-md text-green-400">
                      {(m.firstName || "U").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-300">
                        {fullName + dots}
                      </p>
                      <p className="text-[12px] sm:text-[14px] text-gray-300 font-medium">
                        {(m.email ?? "N/A").slice(0, 30)}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] sm:text-[14px] text-end text-gray-300">
                      <span className="font-medium">
                        {formatDate(m.createdAt)}
                      </span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ============ Recent Withdrawal Requests ============ */}
        <div className="bg-[#1b1b1b] shadow-md rounded-[20px] py-6.5 w-full max-w-full md:max-w-xl">
          <div className="flex items-center justify-between mb-4 px-4 sm:px-6">
            <h2 className="text-[20px] sm:text-[25.5px] font-[500] text-white">
              Pending Withdrawals
            </h2>
            <Link href="/Dashboard/AllTransaction/">
              <button className="px-1 text-center py-1 text-xs sm:text-sm font-medium bg-transparent border-green-500 border-b-[1.5px] flex items-center gap-2 text-gray-200 hover:text-green-500">
                View All <ArrowRight className="size-4.5" />
              </button>
            </Link>
          </div>

          <div className="px-4 sm:px-6 overflow-x-auto">
            {recentWithdrawals.length === 0 ? (
              <p className="text-gray-400 text-center py-6 text-sm">
                No withdrawal requests yet
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-300 border-b border-[#555] text-[13px]">
                    <th className="py-3 text-left font-medium">Name</th>
                    <th className="py-3 text-left font-medium">Email</th>
                    <th className="py-3 text-center font-medium">Amount</th>
                    <th className="py-3 text-end font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentWithdrawals.map((w: any, index: number) => {
                    const fullName =
                      `${w?.user?.firstName || ""} ${
                        w?.user?.lastName || ""
                      }`.trim() || "N/A";

                    return (
                      <tr
                        key={w._id || index}
                        className="border-b border-[#555] hover:bg-[#0f0f0f78] duration-300"
                      >
                        <td className="py-3 text-gray-200 text-[13px] font-medium">
                          {fullName.length > 15
                            ? fullName.slice(0, 15) + "..."
                            : fullName}
                        </td>
                        <td className="py-3 text-gray-300 text-[12px]">
                          {(w?.user?.email || "N/A").length > 20
                            ? (w?.user?.email || "").slice(0, 20) + "..."
                            : w?.user?.email || "N/A"}
                        </td>
                        <td className="py-3 text-center text-white font-semibold text-[13px]">
                          ${formatAmount(w?.amount)}
                        </td>
                        <td className="py-3 text-end text-gray-300 text-[12px]">
                          {formatDate(w?.transactionDate)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

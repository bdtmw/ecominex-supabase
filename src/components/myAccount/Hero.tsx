// @ts-nocheck
"use client";

import React, { useEffect } from "react";
import { Wallet, Coins } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { AppDispatch, RootState } from "@/lib/store/store";
import { useRouter } from "next/navigation";
import { fetchUserMachines } from "@/lib/feature/userMachine/usermachineApi";
import { fetchUserWithdrawals } from "@/lib/feature/withdraw/withdrawalSlice";
import { getUserBalance } from "@/lib/feature/userMachine/balanceSlice";
import { motion } from "framer-motion";

interface DashboardCardProps {
  icon: React.ElementType;
  title: string;
  value: string;
  subtitle?: string;
  trend?: number;
  path?: string;
}

const DashboardCard: React.FC<DashboardCardProps> = ({
  icon: Icon,
  title,
  value,
  subtitle,
  trend,
  path,
}) => {
  const router = useRouter();

  const handleNavigation = () => {
    if (path) router.push(path);
  };

  return (
    <motion.div
      onClick={handleNavigation}
      whileHover={{ scale: 1.05, boxShadow: "0px 15px 25px rgba(33,235,0,0.3)" }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className="group relative cursor-pointer overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-br from-black via-zinc-900 to-black p-5"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#21eb00]/10 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 rounded-2xl" />
      <div className="relative flex flex-col h-full justify-between">
        <div className="flex items-center justify-between mb-4">
          <div className="rounded-lg bg-zinc-900/50 p-3 backdrop-blur-sm">
            <Icon className="h-6 w-6 text-[#21eb00]" />
          </div>
          {trend !== undefined && (
            <span
              className={`text-sm ${
                trend >= 0 ? "text-[#21eb00]" : "text-red-500"
              } font-semibold`}
            >
              {trend > 0 ? "+" : ""}
              {trend}%
            </span>
          )}
        </div>

        <div className="space-y-1">
          <motion.h3
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-lg font-medium text-zinc-400 group-hover:text-white"
          >
            {title}
          </motion.h3>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-2xl font-bold text-white"
          >
            {value}
          </motion.p>
          {subtitle && (
            <p className="text-sm text-zinc-500">{subtitle}</p>
          )}
        </div>

        <div className="mt-4 flex items-center text-xs text-zinc-500">
          <ChevronRight className="ml-1 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </div>
      </div>
    </motion.div>
  );
};

const DashboardHero = () => {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  const { userMachines } = useSelector((state: RootState) => state.userMachine);
  const { withdrawals } = useSelector((state: RootState) => state.withdrawal);
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const balance = useSelector((state: RootState) => state.balance.userBalance);

  console.log(balance);
  

  const formattedTotalBalance = balance?.balances?.total?.toLocaleString() || "0";
  const formattedMiningBalance = balance?.balances?.mining?.toLocaleString() || "0";

  useEffect(() => {
    if (user?.id && isAuthenticated) {
      Promise.all([
        dispatch(fetchUserMachines(user.id)).unwrap(),
        dispatch(fetchUserWithdrawals({ userId: user.id })).unwrap(),
        dispatch(getUserBalance(user.id)).unwrap(),
      ]).catch((err) => console.error("Error fetching dashboard data:", err));
    }
  }, [dispatch, user, isAuthenticated]);

  const dashboardCards: DashboardCardProps[] = [
    {
      icon: Wallet,
      title: "Total Balance",
      value: `$${formattedTotalBalance}`,
      subtitle: "Available funds",
      path: "/Dashboard/TotalMachine",
    },
    {
      icon: Coins,
      title: "Mining Profit",
      value: `$${formattedMiningBalance}`,
      subtitle: "Mining earnings",
      path: "/Dashboard/TotalMachine",
    },
  ];

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-6"
      >
        <h2 className="text-3xl font-semibold mb-2">
          Dashboard
        </h2>
        <p className="text-sm text-zinc-400">
          Track your activity and manage your account settings from your personalized dashboard.
        </p>
      </motion.div>

      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: {
            transition: { staggerChildren: 0.15 },
          },
        }}
      >
        {dashboardCards.map((card, index) => (
          <DashboardCard key={index} {...card} />
        ))}
      </motion.div>
    </div>
  );
};

export default DashboardHero;

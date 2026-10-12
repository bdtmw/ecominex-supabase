"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingCart, Cpu, Loader2, PieChart } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import {type ToastContentProps } from "react-toastify";
import Link from "next/link";
import "react-toastify/dist/ReactToastify.css";
import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { UserShare } from "@/lib/feature/shareMachine/shareMachineSlice";
import { fetchUserMachines } from "@/lib/feature/userMachine/usermachineApi";
import { getUserShareDetails } from "@/lib/feature/shareMachine/shareMachineSlice";
import { useGetAllMiningMachinesQuery } from "@/lib/feature/Machines/miningMachinesApiSlice";
import { purchaseAndAssignMachine, sellUserMachine } from "@/lib/feature/userMachine/transactionSlice";
import { AppDispatch, RootState } from '@/lib/store/store';
import { getSpecialShareMachine, purchaseSpecialShares, sellSharePurchase } from "@/lib/feature/shareMachine/shareMachineSlice";


export default function Machines() {
  const dispatch = useDispatch<AppDispatch>();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const { userMachines } = useSelector((state: RootState) => state.userMachine);
  const {
  userShares,
  specialMachine,
  loading: specialLoading,
  error: specialError,
} = useSelector((state: RootState) => state.shareMachine); // Update with your actual slice

  const [isLoading, setIsLoading] = useState(false);
  const [hasMachines, setHasMachines] = useState(false);
  const [hasShares, setHasShares] = useState(false);
  const [purchasingMachineId, setPurchasingMachineId] = useState<string | null>(null);
const [sellAmounts, setSellAmounts] = useState<Record<string, number>>({});
// key by machineName or a dedicated machineId if you add one
  // Fetch all mining machines for marketplace
  const { data: allMachines, isLoading: machinesLoading, error: machinesError } = useGetAllMiningMachinesQuery();
const getShareKey = (share: AggregatedShare) => share.machineName; // or share.machineId
  // const { specialMachine, loading: specialLoading, error: specialError } =
  //   useSelector((state: RootState) => state.shareMachine);

  console.log(userShares)

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user || !isAuthenticated) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        const fetchPromises = [];

        // Use email for machines and id for shares based on your existing implementation
        if (user.email) {
          fetchPromises.push(dispatch(fetchUserMachines(user.email)).unwrap());
        }

        if (user.id) {
          fetchPromises.push(dispatch(getUserShareDetails(user.id)).unwrap());
        }
        dispatch(getSpecialShareMachine());

        await Promise.all(fetchPromises);
      } catch (error) {
        console.error("Error fetching user data:", error);
        toast.error("Failed to load your machines data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [dispatch, user, isAuthenticated]);

  // Update state whenever the data changes
  useEffect(() => {
    // Check if user has active machines
    setHasMachines(
      userMachines &&
      Array.isArray(userMachines) &&
      userMachines.filter((machine) => machine.status === "active").length > 0
    );

    // Check if user has shares
    setHasShares(
      userShares &&
      userShares.shares &&
      Array.isArray(userShares.shares) &&
      userShares.shares.length > 0
    );
  }, [userMachines, userShares]);


  // BUY SHARE HANDLER
  const handleBuyShares = async (numberOfShares: number) => {
    if (!user || !isAuthenticated) {
      toast.error("Please login to buy shares");
      return;
    }

    if (!user.id) {
      toast.error("User ID not found");
      return;
    }

    try {
      setIsLoading(true);

      const result = await dispatch(
        purchaseSpecialShares({
          userId: user.id,
          numberOfShares,
        })
      ).unwrap();

      toast.success(result?.message || "Shares purchased successfully!");

      // Refresh user’s share details
      await dispatch(getUserShareDetails(user.id));
    } catch (error: any) {
      toast.error(error || "Failed to purchase shares");
      console.error("BUY SHARES ERROR:", error);
    } finally {
      setIsLoading(false);
    }
  };


const handleSellMachine = async (machine: any) => {
  try {
    const salePrice =
      parseFloat(machine.priceRange.toString().replace("$", "")) * 0.9;

    const result = await dispatch(sellUserMachine(machine._id)).unwrap();

    toast.success(
      result?.message ||
        `Machine sold for $${salePrice.toFixed(2)} (10% fee deducted)`
    );
  } catch (err: any) {
    console.error("SELL ERROR:", err);
    toast.error(err?.message || "Failed to sell machine");
  }
};

const showConfirmToast = (
  message: string,
  onConfirm: () => Promise<void> | void
) => {
  toast(
    (t: ToastContentProps) => (
      <div className="text-sm text-slate-100">
        <p className="mb-3">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => t.closeToast()}
            className="px-3 py-1.5 text-xs rounded bg-slate-700 hover:bg-slate-600 text-slate-100"
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              try {
                await onConfirm();
              } finally {
                t.closeToast();
              }
            }}
            className="px-3 py-1.5 text-xs rounded bg-red-500 hover:bg-red-600 text-white"
          >
            Confirm
          </button>
        </div>
      </div>
    ),
    {
      autoClose: false,
      closeOnClick: false,
      draggable: false,
      position: "top-center",
      className: "bg-[#050810] border border-slate-800",
    }
  );
};

const handleSellShares = async (share: AggregatedShare) => {
  const key = getShareKey(share);
  const amountToSell = sellAmounts[key] ?? 0;

  if (!user?.id) {
    toast.error("User not found");
    return;
  }
  if (!amountToSell || amountToSell <= 0) {
    toast.error("Enter how many shares you want to sell");
    return;
  }
  if (amountToSell > share.numberOfShares) {
    toast.error("You cannot sell more shares than you own");
    return;
  }

  try {
    let remaining = amountToSell;

    const sortedPurchases = [...share.purchases].sort(
      (a, b) =>
        new Date(a.purchaseDate).getTime() -
        new Date(b.purchaseDate).getTime()
    );

    for (const p of sortedPurchases) {
      if (remaining <= 0) break;
      const canSell = Math.min(p.numberOfShares, remaining);
      if (canSell <= 0) continue;

      await dispatch(
        sellSharePurchase({
          sharePurchaseId: p.id,
          payload: { numberOfSharesToSell: canSell },
        })
      ).unwrap();

      remaining -= canSell;
    }

    if (remaining > 0) {
      toast.error("Could not sell the requested number of shares.");
      return;
    }

    toast.success(
      `Sold ${amountToSell} share${amountToSell > 1 ? "s" : ""} successfully`
    );
    setSellAmounts((prev) => ({ ...prev, [key]: 0 }));
    await dispatch(getUserShareDetails(user.id));
  } catch (err: any) {
    console.error("SELL SHARE ERROR:", err);
    toast.error(err?.message || "Failed to sell shares");
  }
};


  


// Use fetched user machines data or fallback to empty array
const myMachines = Array.isArray(userMachines) ? userMachines : [];

// Raw purchases from API
const rawShares: UserShare[] = Array.isArray(userShares?.shares)
  ? userShares.shares
  : [];

// Aggregated type: one card per machine, but keep all purchases inside
type AggregatedShare = UserShare & { purchases: UserShare[] };

const grouped = rawShares.reduce<Record<string, AggregatedShare>>((acc, share) => {
  const key = share.machineName; // or share.machineId if you have it

  const existing = acc[key];

  if (!existing) {
    acc[key] = { ...share, purchases: [share] };
  } else {
    existing.numberOfShares += share.numberOfShares;
    existing.totalInvestment += share.totalInvestment;
    existing.expectedMonthlyProfit += share.expectedMonthlyProfit;
    // if you track this:
    // existing.totalProfitEarned += share.totalProfitEarned ?? 0;

    existing.purchases.push(share);

    // optional: earliest purchase date
    if (new Date(share.purchaseDate) < new Date(existing.purchaseDate)) {
      existing.purchaseDate = share.purchaseDate;
    }
    // optional: latest updates
    if (new Date(share.lastProfitUpdate) > new Date(existing.lastProfitUpdate)) {
      existing.lastProfitUpdate = share.lastProfitUpdate;
    }
    if (new Date(share.nextProfitUpdate) > new Date(existing.nextProfitUpdate)) {
      existing.nextProfitUpdate = share.nextProfitUpdate;
    }
  }

  return acc;
}, {});

// One item per machine
const sharedMachines: AggregatedShare[] = Object.values(grouped);

  
  // Get marketplace machines from API
  // Normalize API data shape to always return an array
  console.log("RAW MACHINES FROM API:", allMachines);
  console.log("SHared MACHINES FROM API:", userShares);
  const rawMachines: any = allMachines;

  const marketplaceMachines = Array.isArray(rawMachines)
    ? rawMachines
    : Array.isArray(rawMachines?.machines)
      ? rawMachines.machines
      : Array.isArray(rawMachines?.data)
        ? rawMachines.data
        : [];

  const activeMachines = myMachines.filter(
    (m: any) => m.status?.toLowerCase() === "active"
  );



  return (
    <div className="space-y-6 p-6 min-h-screen" style={{ backgroundColor: "#000000" }}>
      <ToastContainer position="top-right" autoClose={3000} theme="dark" />

      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white">Mining Machines</h2>
        <p className="text-slate-400">Purchase machines or manage your investments (10% fee on sales)</p>
      </div>

      <Tabs defaultValue="my-machines" className="space-y-4">
        <TabsList
          className="
    mb-4
    inline-flex items-center gap-2
    rounded-full border border-slate-800 bg-slate-900/80
    p-1 shadow-inner shadow-black/40
  "
        >
          <TabsTrigger
            value="my-machines"
            className="
      rounded-full data-[state=active]:rounded-full
      inline-flex items-center justify-center gap-2
      px-4 py-2 text-xs sm:text-sm font-medium
      text-slate-400 transition-all duration-200
      hover:text-slate-100 hover:bg-slate-800/60
      data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-emerald-600
      data-[state=active]:text-black
      data-[state=active]:shadow-[0_6px_20px_rgba(34,197,94,0.5)]
    "
          >
            <Cpu className="h-4 w-4" />
            <span>My Machines</span>
          </TabsTrigger>

          {/* <TabsTrigger
    value="shared-machines"
    className="
      rounded-full data-[state=active]:rounded-full
      inline-flex items-center justify-center gap-2
      px-4 py-2 text-xs sm:text-sm font-medium
      text-slate-400 transition-all duration-200
      hover:text-slate-100 hover:bg-slate-800/60
      data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-emerald-600
      data-[state=active]:text-black
      data-[state=active]:shadow-[0_6px_20px_rgba(34,197,94,0.5)]
    "
  >
    <PieChart className="h-4 w-4" />
    <span>Shared Machines</span>
  </TabsTrigger> */}
        </TabsList>
        <TabsContent value="my-machines" className="space-y-4">
          <Card className="border border-slate-800 bg-[#050810] shadow-[0_18px_45px_rgba(0,0,0,0.7)]">
            <CardHeader className="border-b border-slate-800 pb-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-white text-lg sm:text-xl">
                    Your Mining & Shared Machines
                  </CardTitle>
                  <CardDescription className="text-slate-400 text-sm">
                    Manage your invested machines (10% deduction fee when sold)
                  </CardDescription>
                </div>

                {/* Summary chips */}
                <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
                  <span className="rounded-full bg-slate-900/80 border border-slate-700 px-3 py-1 text-[11px] font-medium text-slate-300">
                    Total Machines: {activeMachines.length + sharedMachines.length}
                  </span>
                  <span className="rounded-full bg-emerald-500/10 border border-emerald-500/40 px-3 py-1 text-[11px] font-medium text-emerald-300">
                    Active Mining: {activeMachines.length}
                  </span>
                  <span className="rounded-full bg-yellow-500/10 border border-yellow-500/40 px-3 py-1 text-[11px] font-medium text-yellow-300">
                    Shared: {sharedMachines.length}
                  </span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-5 space-y-8">
              {isLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-green-500" />
                </div>
              ) : activeMachines.length === 0 && sharedMachines.length === 0 ? (
                <div className="text-center py-10">
  <p className="text-slate-200 text-sm sm:text-base">
    You do not have any machines yet.
  </p>
  <p className="text-xs sm:text-sm text-slate-500 mt-2">
    Purchase machines or invest in shared machines to get started.
  </p>

  <Link href="/shop">
    <button
      className="mt-4 inline-flex items-center px-4 py-2 rounded-lg 
                 bg-emerald-500 text-gray-900 text-sm font-semibold
                 hover:bg-emerald-400 hover:scale-105 transition-transform"
    >
      Go to Shop
    </button>
  </Link>
</div>
              ) : (
                <>
{/* ACTIVE MINING MACHINES */}
{activeMachines.length > 0 && (
  <section className="space-y-3">
    <div className="flex items-center justify-between">
      <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-[0.16em] text-slate-300">
        Active Mining Machines
      </h3>
      <div className="h-px flex-1 ml-4 bg-gradient-to-r from-emerald-500/60 via-emerald-500/10 to-transparent" />
    </div>

    {/* 2 machines per row */}
    <div className="grid gap-3 grid-cols-2">
      {activeMachines.map((machine: any, i: number) => {
        // Compute next profit date (prefer backend field, fallback to 30 days from last/assigned)
        let nextProfitDate: Date | null = null;
        if (machine.nextProfitUpdate) {
          nextProfitDate = new Date(machine.nextProfitUpdate);
        } else if (machine.lastProfitUpdate) {
          nextProfitDate = new Date(
            new Date(machine.lastProfitUpdate).getTime() +
              30 * 24 * 60 * 60 * 1000
          );
        } else if (machine.assignedDate) {
          nextProfitDate = new Date(
            new Date(machine.assignedDate).getTime() +
              30 * 24 * 60 * 60 * 1000
          );
        }

        let nextProfitLabel = "N/A";
        if (nextProfitDate && !isNaN(nextProfitDate.getTime())) {
          const now = new Date();
          const diffMs = nextProfitDate.getTime() - now.getTime();
          if (diffMs <= 0) {
            nextProfitLabel = "Due now";
          } else {
            const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
            nextProfitLabel = `${days} day${days > 1 ? "s" : ""}`;
          }
        }

        // Monthly profit: prefer machine.monthlyProfit, fallback to expectedMonthlyProfit, else 0
        const monthlyProfit = Number(
          machine.monthlyProfit ?? machine.expectedMonthlyProfit ?? 0
        ).toFixed(2);

        return (
          <div
            key={`mining-${i}`}
            className="group relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-slate-900 via-slate-900/80 to-emerald-900/40 px-4 py-4 sm:px-5 sm:py-5 shadow-lg shadow-emerald-500/15"
          >
            {/* Glow overlay */}
            <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-300 bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.35),transparent_55%)]" />

            <div className="relative flex h-full flex-col justify-between gap-4">
              {/* Top row */}
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-400/60 shadow-sm shadow-emerald-500/40">
                  <Cpu className="h-6 w-6 text-emerald-300" />
                </div>

                <div className="space-y-1">
                  <p className="text-sm sm:text-base font-semibold text-white">
                    {machine?.machineName || "Mining Machine"}
                  </p>
                  <p className="text-xs text-slate-400">
                    Purchased:{" "}
                    {new Date(machine.assignedDate).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Bottom row */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="inline-flex items-center rounded-full bg-black/40 px-2.5 py-1 text-[11px] text-slate-200 border border-slate-700/60">
                    <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Active Machine
                  </span>

                  {/* Price pill */}
                  <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-200 border border-emerald-500/40">
                    Price: ${machine.priceRange}
                  </span>

                  {/* Monthly profit pill */}
                  <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-200 border border-emerald-500/40">
                    Monthly Profit: ${monthlyProfit}
                  </span>

                  {/* Profit accumulated pill */}
                  <span className="inline-flex items-center rounded-full bg-emerald-500/5 px-2.5 py-1 text-[11px] text-emerald-200 border border-emerald-500/30">
                    Profit: $
                    {Number(machine.monthlyProfitAccumulated || 0).toFixed(2)}
                  </span>

                  {/* Next profit countdown pill */}
                  <span className="inline-flex items-center rounded-full bg-yellow-500/10 px-2.5 py-1 text-[11px] text-yellow-200 border border-yellow-500/40">
                    Next Profit In: {nextProfitLabel}
                  </span>
                </div>

                <div className="text-right space-y-1">
                  <Button
                    style={{ backgroundColor: "#0b0e13" }}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const salePrice =
                        parseFloat(
                          machine.priceRange.toString().replace("$", "")
                        ) * 0.9;

                      showConfirmToast(
                        `Are you sure you want to sell "${machine.machineName}" for $${salePrice.toFixed(
                          2
                        )}? A 10% fee will be deducted and this cannot be undone.`,
                        () => handleSellMachine(machine)
                      );
                    }}
                    className="border-slate-600 bg-black/60 text-slate-100 hover:bg-slate-900/80"
                  >
                    Sell (10% fee)
                  </Button>
                  <p className="text-[11px] text-slate-400">
                    Status:{" "}
                    <span className="text-emerald-300">
                      {machine.status}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </section>
)}

                  {/* SHARED MACHINES */}
                  {sharedMachines.length > 0 && (
  <section className="space-y-3 pt-2 border-t border-slate-800/70">
    <div className="flex items-center justify-between pt-2">
      <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-[0.16em] text-slate-300">
        Shared Machines
      </h3>
      <div className="h-px flex-1 ml-4 bg-gradient-to-r from-yellow-500/60 via-yellow-500/10 to-transparent" />
    </div>

   <div className="grid gap-3 md:grid-cols-2">
  {sharedMachines.map((share, i) => {
    const key = getShareKey(share);
    const currentValue = sellAmounts[key] ?? "";

    // Monthly profit = profit per share * number of shares
    const monthlyProfit =
      (share.profitPerShare ?? 0) * (share.numberOfShares ?? 0);

    // Compute next profit date (prefer backend field, fallback to 30 days from last/purchase)
    let nextProfitDate: Date | null = null;
    if (share.nextProfitUpdate) {
      nextProfitDate = new Date(share.nextProfitUpdate);
    } else if (share.lastProfitUpdate) {
      nextProfitDate = new Date(
        new Date(share.lastProfitUpdate).getTime() +
          30 * 24 * 60 * 60 * 1000
      );
    } else if (share.purchaseDate) {
      nextProfitDate = new Date(
        new Date(share.purchaseDate).getTime() +
          30 * 24 * 60 * 60 * 1000
      );
    }

    let nextProfitLabel = "N/A";
    if (nextProfitDate && !isNaN(nextProfitDate.getTime())) {
      const now = new Date();
      const diffMs = nextProfitDate.getTime() - now.getTime();
      if (diffMs <= 0) {
        nextProfitLabel = "Due now";
      } else {
        const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        nextProfitLabel = `${days} day${days > 1 ? "s" : ""}`;
      }
    }

    const totalValue = (share.numberOfShares * share.pricePerShare).toFixed(2);
    const totalEarned = Number(share.totalProfitEarned || 0).toFixed(2);
    const monthlyProfitStr = monthlyProfit.toFixed(2);

    return (
      <div
        key={key || `share-${i}`}
        className="group relative overflow-hidden rounded-2xl border border-yellow-500/25 bg-gradient-to-br from-slate-900 via-slate-900/80 to-amber-900/40 px-4 py-4 sm:px-5 sm:py-5 shadow-lg shadow-yellow-500/15"
      >
        <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-300 bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.35),transparent_55%)]" />

        <div className="relative flex h-full flex-col justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-400/15 border border-yellow-300/60 shadow-sm shadow-yellow-500/40">
              <Cpu className="h-6 w-6 text-yellow-200" />
            </div>

            <div className="space-y-1">
              <p className="text-sm sm:text-base font-semibold text-white">
                {share.machineName || "Shared Machine"}
              </p>
              <p className="text-xs text-slate-400">
                Purchased:{" "}
                {new Date(share.purchaseDate).toLocaleDateString()}
              </p>
              <p className="text-xs text-slate-400">
                Shares Owned:{" "}
                <span className="font-semibold text-slate-100">
                  {share.numberOfShares}
                </span>
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center rounded-full bg-black/40 px-2.5 py-1 text-[11px] text-slate-200 border border-slate-700/60">
                <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-yellow-300" />
                Shared Position
              </span>

              {/* Total earned */}
              <span className="inline-flex items-center rounded-full bg-emerald-500/5 px-2.5 py-1 text-[11px] text-emerald-200 border border-emerald-500/30">
                Earned: ${totalEarned}
              </span>

              {/* Monthly profit */}
              <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-200 border border-emerald-500/40">
                Monthly Profit: ${monthlyProfitStr}
              </span>

              {/* Next profit countdown */}
              <span className="inline-flex items-center rounded-full bg-yellow-500/10 px-2.5 py-1 text-[11px] text-yellow-200 border border-yellow-500/40">
                Next Profit In: {nextProfitLabel}
              </span>

              {/* Total value */}
              <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-200 border border-emerald-500/40">
                Value: ${totalValue}
              </span>
            </div>

            <div className="text-right space-y-1">
              <div className="flex items-center justify-end gap-2">
                <input
                  type="number"
                  min={1}
                  max={share.numberOfShares}
                  value={currentValue}
                  onChange={(e) => {
                    const raw = Number(e.target.value);
                    if (Number.isNaN(raw)) {
                      setSellAmounts((prev) => ({ ...prev, [key]: 0 }));
                      return;
                    }
                    const clamped = Math.max(
                      0,
                      Math.min(raw, share.numberOfShares)
                    );
                    setSellAmounts((prev) => ({ ...prev, [key]: clamped }));
                  }}
                  className="w-20 rounded-md border border-slate-600 bg-black/60 px-2 py-1 text-xs text-slate-100 focus:outline-none focus:border-yellow-400"
                  placeholder="Qty"
                />
                <span className="text-[11px] text-slate-400">
                  / {share.numberOfShares}
                </span>
              </div>

              <Button
                style={{ backgroundColor: "#0b0e13" }}
                variant="outline"
                size="sm"
                onClick={() => {
                  const key = getShareKey(share);
                  const amountToSell = sellAmounts[key] ?? 0;

                  if (!amountToSell || amountToSell <= 0) {
                    toast.error("Enter how many shares you want to sell");
                    return;
                  }

                  showConfirmToast(
                    `Sell ${amountToSell} share${
                      amountToSell > 1 ? "s" : ""
                    } of "${share.machineName}"? This will reduce your position and cannot be undone.`,
                    () => handleSellShares(share)
                  );
                }}
                className="border-slate-600 bg-black/60 text-slate-100 hover:bg-slate-900/80"
              >
                Sell Shares
              </Button>
              <p className="text-[11px] text-slate-400">
                Type:{" "}
                <span className="text-yellow-200">Shared Machine</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  })}
</div>
  </section>
)}              </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>


    </div>
  );
}
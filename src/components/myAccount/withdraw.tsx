// @ts-nocheck

import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  AlertCircle,
  TrendingUp,
  Coins,
  Loader2,
  ArrowUpRight,
  Wallet,
  DollarSign,
  Plus
} from "lucide-react";
import { fetchUserTotalProfit } from "@/lib/feature/userMachine/usermachineApi";
import { AppDispatch, RootState } from "@/lib/store/store";
import WithdrawalDialog from "./withdrawForm";
import TransactionHistory from "./TransactionHistory";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UserProfitSummary } from "@/types/userMachine";
import { getUserBalance } from "@/lib/feature/userMachine/balanceSlice";
import { Button } from "../ui/button";
import DepositForm from "./DepositForm";
import DepositStepForm from "./DepositStepForm";


interface StatsOverviewProps {
  profitData: UserProfitSummary;
  onWithdrawClick: () => void;
}

const WithdrawalDashboard = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading } = useSelector(
    (state: RootState) => state.userMachine
  );
  const { user, isAuthenticated } = useSelector(
    (state: RootState) => state.auth
  );
  const [totalProfitData, setTotalProfitData] = useState<UserProfitSummary | null>(null);
  const [profitLoading, setProfitLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = useState(false);
  const balance = useSelector((state: RootState) => state.balance.userBalance);

  useEffect(() => {
    let isMounted = true;
    let retryTimeout: NodeJS.Timeout | undefined;

    const fetchData = async () => {
      if (!user?.id || !isAuthenticated) {
        setProfitLoading(false);
        return;
      }

      try {
        if (isMounted) {
          setError(null);
          setProfitLoading(true);
        }

        const [profitResult] = await Promise.all([
          dispatch(getUserBalance(user.id)).unwrap()
        ]);

        if (isMounted && profitResult) {
          setTotalProfitData(profitResult);
          setIsInitialLoad(false);
          setRetryCount(0);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to fetch data");
          if (isInitialLoad && retryCount < 3) {
            setRetryCount((prev) => prev + 1);
            retryTimeout = setTimeout(() => {
              fetchData();
            }, 2000 * Math.pow(2, retryCount));
          }
        }
      } finally {
        if (isMounted) {
          setProfitLoading(false);
        }
      }
    };

    if (isAuthenticated || retryCount > 0) {
      fetchData();
    }

    return () => {
      isMounted = false;
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [dispatch, user?.id, isAuthenticated, retryCount]);

  const StatsOverview: React.FC<StatsOverviewProps & { balance: any }> = ({
    profitData,
    onWithdrawClick,
    balance
  }) => (
    <div className="space-y-6">
      {/* Total Balance Card */}
      <div className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-black p-8 transition-all duration-300 hover:border-[#21eb00]/50">
        <div className="absolute inset-0 bg-gradient-to-br from-[#21eb00]/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <div className="relative">
          <div className="flex items-center space-x-3">
            <div className="rounded-lg bg-[#21eb00]/10 p-3">
              <Wallet className="h-8 w-8 text-[#21eb00]" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-zinc-200">Total Balance</h3>
              <p className="text-sm text-zinc-400">Available funds</p>
            </div>
          </div>
          <p className="mt-6 text-5xl font-bold tracking-tight text-white">
            ${balance?.balances?.total?.toLocaleString() || '0'}
          </p>
          <div className="mt-4 flex items-center space-x-2 text-sm">
            <ArrowUpRight className="h-4 w-4 text-[#21eb00]" />
            <span className="text-zinc-400">Available funds</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {/* <div className="grid grid-cols-1 gap-4 px-4 sm:px-8 md:px-12 lg:px-48">
        Deposit Button
        <Button
          size="lg"
          onClick={() => window.open('https://wa.me/+971563605068', '_blank')}
          className="bg-gradient-to-br p-4 sm:p-8 from-blue-500 via-blue-600 to-blue-700 hover:from-blue-600 hover:via-blue-700 hover:to-blue-800 text-white font-medium shadow-lg shadow-blue-500/20 transition-all duration-300 ease-out hover:shadow-blue-500/30 hover:scale-[1.02]"
        >
          <Plus className="mr-2 h-6 w-6 sm:h-10 sm:w-10 text-2xl sm:text-4xl" />
          Deposit
        </Button>


      </div> */}
    </div>
  );

  if (!isAuthenticated) {
    return (
      <Alert className="border-yellow-500/20 bg-yellow-500/10">
        <AlertCircle className="h-4 w-4 text-yellow-500" />
        <AlertDescription className="text-yellow-500">
          Loading................
        </AlertDescription>
      </Alert>
    );
  }

  if (!user) {
    return (
      <div className="flex h-60 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#21eb00]" />
      </div>
    );
  }

  return (
    <div className="space-y-8 px-4 py-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold text-white">Payment Dashboard</h2>
        <p className="text-base text-zinc-400">
          Manage all your transactions, deposits, and withdrawals securely in one place.
        </p>
      </div>

      {profitLoading ? (
        <div className="flex h-60 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#21eb00]" />
        </div>
      ) : (
        <>
          {totalProfitData && (
            <>
              <StatsOverview
                profitData={totalProfitData}
                onWithdrawClick={() => setIsWithdrawDialogOpen(true)}
                balance={balance}
              />
               {isAuthenticated && (
                <DepositStepForm
                  userEmail={user.email}
                />
              )}
              {isAuthenticated && (
                <WithdrawalDialog
                  availableBalance={totalProfitData.totalProfit}
                  userEmail={user.email}
                />
              )}
            </>
          )}

          {user?.email && <TransactionHistory userEmail={user.email} />}

          {error && (
            <Alert className="border-red-500/20 bg-red-500/10">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-400">{error}</AlertDescription>
            </Alert>
          )}
        </>
      )}
    </div>
  );
};

export default WithdrawalDashboard;
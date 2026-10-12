// @ts-nocheck

import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Monitor,
  Calendar,
  DollarSign,
  AlertCircle,
  Coins,
  Activity,
  Clock,
  TrendingUp,
} from "lucide-react";
import {
  fetchUserMachines,
  fetchUserTotalProfit,
} from "@/lib/feature/userMachine/usermachineApi";
import { AppDispatch, RootState } from "@/lib/store/store";
import {
  UserMachine,
  ProfitUpdateStatus,
  UserProfitSummary,
} from "@/types/userMachine";
import { Button } from "@/components/ui/button";
import SaleMachineModal from "./SaleMachineModal";

const UserMachinesDashboard = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { userMachines, isLoading, error } = useSelector(
    (state: RootState) => state.userMachine,
  );
  const { user, isAuthenticated } = useSelector(
    (state: RootState) => state.auth,
  );
  const [totalProfitData, setTotalProfitData] =
    React.useState<UserProfitSummary | null>(null);
  const [profitLoading, setProfitLoading] = React.useState(true);
  const [error1, setError] = React.useState<string | null>(null);
  const [profitPercentages, setProfitPercentages] =
    React.useState<ProfitPercentageResponse | null>(null);

  const [selectedMachine, setSelectedMachine] =
    React.useState<UserMachine | null>(null);
  const [isSaleModalOpen, setSaleModalOpen] = React.useState(false);
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.email || !isAuthenticated) {
        setProfitLoading(false);
        return;
      }

      try {
        setError(null);
        setProfitLoading(true);
        const [machinesResult, profitResult, percentagesResult] =
          await Promise.all([
            dispatch(fetchUserMachines(user.email)).unwrap(),
            dispatch(fetchUserTotalProfit(user.email)).unwrap(),
            dispatch(fetchProfitPercentages(user.email)).unwrap(),
          ]);
        setTotalProfitData(profitResult);
        setProfitPercentages(percentagesResult);
      } catch (err: any) {
        setError(err.message || "Failed to fetch data");
      } finally {
        setProfitLoading(false);
      }
    };

    fetchData();
  }, [dispatch, user, isAuthenticated]);

  const handleSaleSuccess = () => {
    // Refresh the machines list
    if (user?.email) {
      dispatch(fetchUserMachines(user.email));
      dispatch(fetchUserTotalProfit(user.email));
    }
  };

  const MachineCard: React.FC<{
    machine: UserMachine;
    onSellClick: (machine: UserMachine) => void;
    profitPercentages?: ProfitPercentageResponse;
  }> = ({ machine, onSellClick }) => {
    const [profitStatus, setProfitStatus] =
      React.useState<ProfitUpdateStatus | null>(null);
    const [loading, setLoading] = React.useState(false);

    const calculateProgress = () => {
      if (!profitStatus) return 0;
      const daysLeft = profitStatus.daysUntilNextUpdate;
      return ((1 - daysLeft) / 1) * 100;
    };

    const getMachinePercentage = () => {
      if (!profitPercentages?.machines) return "0";
      const machineData = profitPercentages.machines.find(
        (m) =>
          m.machineId ===
          (typeof machine._id === "string" ? machine._id : machine.machine._id),
      );
      return machineData?.percentage || "0";
    };

    const getMachineIdentifier = () => {
      if (typeof machine.machine === "string") return machine.machine;
      if (machine.machine && typeof machine.machine === "object") {
        return (
          machine.machine.machineName ||
          machine.machine._id ||
          "Unknown Machine"
        );
      }
      return "Unknown Machine";
    };

    return (
      <div className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-black transition-all duration-500 hover:border-[#21eb00] hover:shadow-lg hover:shadow-[#21eb00]/10">
        <div className="absolute right-0 top-0 z-10 rounded-bl-lg bg-[#21eb00] px-3 py-1">
          <span className="text-sm font-bold text-black">
            {getMachinePercentage()}%
          </span>
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-[#21eb00]/5 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

        <div className="relative p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div
                className={`h-3 w-3 rounded-full ${
                  machine.status === "active"
                    ? "animate-pulse bg-[#21eb00]"
                    : "bg-red-500"
                }`}
              />
              <span className="text-sm font-medium text-zinc-400">active </span>
            </div>

            {!loading && profitStatus && (
              <div className="relative h-16 w-16">
                <svg
                  className="h-full w-full -rotate-90 transform"
                  viewBox="0 0 36 36"
                >
                  <circle
                    cx="18"
                    cy="18"
                    r="16"
                    className="fill-none stroke-zinc-800"
                    strokeWidth="3"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="16"
                    className="fill-none stroke-[#21eb00] transition-all duration-700 ease-in-out"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={`${calculateProgress()}, 100`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-lg font-bold text-white">
                    {Math.max(
                      0,
                      Math.floor(profitStatus?.daysUntilNextUpdate || 0),
                    )}
                  </span>
                  <span className="text-xs text-zinc-400">days</span>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6">
            <h3 className="text-xl font-bold text-white transition-colors duration-300 group-hover:text-[#21eb00]">
              {getMachineIdentifier()}
            </h3>
            <div className="mt-2 flex items-center space-x-2 text-sm text-zinc-400">
              <Monitor className="h-4 w-4" />
              <span>ID: {getMachineIdentifier()}</span>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div className="rounded-xl bg-zinc-900/50 p-4 transition-colors duration-300 group-hover:bg-zinc-900">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-5 w-5 text-[#21eb00]" />
                  <span className="text-zinc-400">Total Profit</span>
                </div>
                <p className="text-xl font-bold text-[#21eb00]">
                  ${machine.monthlyProfitAccumulated?.toFixed(0) || "0.00"}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2 text-zinc-400">
                <Calendar className="h-4 w-4" />
                <span>Activated:</span>
                <span className="text-white">
                  {new Date(machine.assignedDate).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center space-x-2 text-zinc-400">
                <Clock className="h-4 w-4" />
                <span>Uptime: 99.9%</span>
              </div>
            </div>
          </div>
          {machine.status === "active" && (
            <Button
              onClick={() => onSellClick(machine)}
              className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20 mt-4 w-full border"
            >
              Sell Machine
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen space-y-8 bg-zinc-950 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h2 className="mb-2 text-3xl font-bold text-white">
            Mining Dashboard
          </h2>
          <p className="text-zinc-400">
            Monitor your mining machines performance and profit accumulation in
            real-time.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {userMachines && userMachines.length > 0 ? (
            userMachines
              .filter((machine) => machine.status === "active")
              .map((machine) => (
                <MachineCard
                  key={
                    typeof machine._id === "string"
                      ? machine._id
                      : (typeof machine.machine === "object" &&
                          machine.machine._id) ||
                        "fallback-key"
                  }
                  machine={machine}
                  profitPercentages={profitPercentages}
                  onSellClick={(machine) => {
                    setSelectedMachine(machine);
                    setSaleModalOpen(true);
                  }}
                />
              ))
          ) : (
            <div className="col-span-full flex min-h-[200px] items-center justify-center rounded-2xl border border-zinc-800 bg-black">
              <p className="text-zinc-400">
                {isLoading
                  ? "Loading machines..."
                  : "No machines assigned yet."}
              </p>
            </div>
          )}
        </div>
      </div>

      {selectedMachine && (
        <SaleMachineModal
          isOpen={isSaleModalOpen}
          onClose={() => {
            setSaleModalOpen(false);
            setSelectedMachine(null);
          }}
          machine={selectedMachine}
          onSuccess={handleSaleSuccess}
        />
      )}
    </div>
  );
};

export default UserMachinesDashboard;

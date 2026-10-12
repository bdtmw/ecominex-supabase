// @ts-nocheck

"use client";
import React, { useEffect, useState } from "react";
import {
  Trash2,
  Server,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Users,
  Calendar,
  DollarSign,
  ChevronRight,
  Search,
} from "lucide-react";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import {
  fetchAllUserMachines,
  removeUserMachine,
} from "@/lib/feature/userMachine/usermachineApi";
import { UserMachine } from "@/types/userMachine";
import { useAppDispatch } from "@/lib/store/reduxHooks";

const UserMachineList: React.FC = () => {
  const dispatch = useAppDispatch();
  const [userMachines, setUserMachines] = useState<UserMachine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const loadUserMachines = async () => {
      try {
        setIsLoading(true);
        const response = await dispatch(fetchAllUserMachines()).unwrap();
        setUserMachines(response);
        setError(null);
      } catch (err: any) {
        const errorMessage = err.message || "Failed to fetch user machines";
        setError(errorMessage);
        toast.error(errorMessage, { theme: "dark" });
      } finally {
        setIsLoading(false);
      }
    };

    loadUserMachines();
  }, [dispatch]);

  const handleRemoveMachine = async (userMachineId: string) => {
    if (
      !window.confirm(
        "Are you sure you want to remove this machine assignment?",
      )
    ) {
      return;
    }

    try {
      await dispatch(removeUserMachine(userMachineId)).unwrap();
      setUserMachines((prev) => prev.filter((um) => um._id !== userMachineId));
      toast.success("Machine assignment removed successfully", {
        theme: "dark",
      });
    } catch (err: any) {
      const errorMessage = err.message || "Failed to remove machine assignment";
      toast.error(errorMessage, { theme: "dark" });
    }
  };

  const filteredMachines = userMachines.filter(
    (machine) =>
      machine.user?.firstName
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      machine.user?.lastName
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      machine.machine?.machineName
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()),
  );

  if (isLoading) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-black p-8">
        <div className="absolute inset-0 bg-gradient-to-br from-[#21eb00]/5 via-transparent to-transparent opacity-50" />
        <div className="relative flex min-h-[400px] flex-col items-center justify-center">
          <Loader2 className="mb-4 h-12 w-12 animate-spin text-[#21eb00]" />
          <p className="text-zinc-400">Loading machine assignments...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border-red-800/50 relative overflow-hidden rounded-2xl border bg-black p-8">
        <div className="from-red-500/5 absolute inset-0 bg-gradient-to-br via-transparent to-transparent opacity-50" />
        <div className="relative flex min-h-[400px] flex-col items-center justify-center">
          <AlertTriangle className="text-red-500 mb-4 h-12 w-12" />
          <p className="text-red-400 mb-4 text-center">{error}</p>
          <button
            onClick={() => dispatch(fetchAllUserMachines())}
            className="group flex items-center rounded-xl bg-zinc-900 px-6 py-2 text-white transition-all duration-300 hover:bg-zinc-800"
          >
            <RefreshCw className="mr-2 h-4 w-4 transition-transform duration-700 group-hover:rotate-180" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (userMachines.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-black p-8">
        <div className="absolute inset-0 bg-gradient-to-br from-[#21eb00]/5 via-transparent to-transparent opacity-50" />
        <div className="relative flex min-h-[400px] flex-col items-center justify-center">
          <Server className="mb-4 h-12 w-12 text-zinc-500" />
          <p className="text-center text-zinc-400">
            No machine assignments found
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-black transition-all duration-500 hover:border-[#21eb00] hover:shadow-lg hover:shadow-[#21eb00]/10">
      <div className="absolute inset-0 bg-gradient-to-br from-[#21eb00]/5 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

      <div className="relative border-b border-zinc-800 bg-zinc-900/30 p-6 backdrop-blur-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center">
            <div className="mr-4 rounded-xl bg-zinc-900/50 p-3">
              <Server className="h-6 w-6 text-[#21eb00]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">
                Machine Assignments
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                Manage user machine connections
              </p>
            </div>
          </div>

          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search assignments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 py-2 pl-12 pr-4 text-white outline-none backdrop-blur-sm transition-all duration-300 hover:border-[#21eb00]/50 focus:border-[#21eb00] focus:ring-1 focus:ring-[#21eb00]"
            />
          </div>
        </div>
      </div>

      <div className="relative overflow-x-auto">
        <table className="w-full">
          <thead className="bg-zinc-900/50 text-zinc-400">
            <tr>
              <th className="p-4 text-left">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>User</span>
                </div>
              </th>
              <th className="p-4 text-left">
                <div className="flex items-center space-x-2">
                  <Server className="h-4 w-4" />
                  <span>Machine</span>
                </div>
              </th>
              <th className="p-4 text-left">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>Assigned Date</span>
                </div>
              </th>
              <th className="p-4 text-left">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4" />
                  <span>Monthly Profit</span>
                </div>
              </th>
              <th className="p-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {filteredMachines.map((assignment) => (
              <tr
                key={assignment._id}
                className="group transition-colors hover:bg-zinc-900/30"
              >
                <td className="p-4">
                  <div className="flex flex-col">
                    <span className="font-medium text-white">
                      {assignment.user?.firstName} {assignment.user?.lastName}
                    </span>
                    <span className="text-sm text-zinc-400">
                      {assignment.user?.email}
                    </span>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex flex-col">
                    <span className="font-medium text-white">
                      {assignment.machine?.machineName}
                    </span>
                    <span className="text-sm text-zinc-400">
                      {assignment.machine?.model}
                    </span>
                  </div>
                </td>
                <td className="p-4 text-zinc-400">
                  {new Date(assignment.assignedDate).toLocaleDateString()}
                </td>
                <td className="p-4">
                  <span className="font-medium text-[#21eb00]">
                    ${assignment.monthlyProfitAccumulated.toFixed(0)|| "0.00"}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex justify-center">
                    <button
                      onClick={() => handleRemoveMachine(assignment._id)}
                      className="hover:bg-red-500/10 hover:text-red-500 rounded-lg p-2 text-zinc-400 transition-all duration-300 group-hover:scale-105"
                      title="Remove Assignment"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserMachineList;

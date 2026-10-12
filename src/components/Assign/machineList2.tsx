// @ts-nocheck

"use client";
import React, { useState } from "react";
import {
  Trash2,
  Eye,
  Server,
  DollarSign,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";

import {
  fetchAllUserMachines,
  removeUserMachine,
} from "@/lib/feature/userMachine/usermachineApi";
import { useAppSelector } from "@/lib/store/reduxHooks";

const SerMachineList: React.FC = () => {
  const dispatch = useDispatch();
  const [selectedMachine, setSelectedMachine] = useState<string | null>(null);

  // Fetch all user machines
  const {
    allUserMachines = [],
    isLoading,
    error,
  } = useAppSelector((state) => state.userMachine);

  // Handle machine removal
  const handleRemoveMachine = async (userMachineId: string) => {
    try {
      await dispatch(removeUserMachine(userMachineId)).unwrap();
      toast.success("Machine assignment removed successfully", {
        position: "top-right",
        theme: "dark",
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to remove machine assignment", {
        position: "top-right",
        theme: "dark",
      });
    }
  };

  // Fetch machines on component mount
  React.useEffect(() => {
    dispatch(fetchAllUserMachines());
  }, [dispatch]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl bg-gray-800 p-6">
        <Loader2 className="mb-4 h-12 w-12 animate-spin text-blue-500" />
        <p className="text-gray-300">Loading user machines...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-900/20 flex min-h-[400px] flex-col items-center justify-center rounded-2xl p-6">
        <AlertTriangle className="text-red-500 mb-4 h-12 w-12" />
        <p className="text-red-400 mb-4 text-center">
          Failed to load user machines
        </p>
        <button
          onClick={() => dispatch(fetchAllUserMachines())}
          className="flex items-center rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-700 bg-gray-800 shadow-2xl">
      <div className="flex items-center border-b border-gray-700 p-6">
        <Server className="mr-4 h-8 w-8 text-secondary" />
        <h2 className="text-2xl font-bold text-white">
          User Machine Assignments
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-700 text-gray-300">
            <tr>
              <th className="p-4 text-left">User</th>
              <th className="p-4 text-left">Machine</th>
              <th className="p-4 text-center">Accumulated Profit</th>
              <th className="p-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {allUserMachines.map((userMachine) => (
              <tr
                key={userMachine._id}
                className="border-b border-gray-700 transition-colors hover:bg-gray-700/50"
              >
                <td className="p-4">
                  <div className="flex items-center">
                    <span className="font-medium text-white">
                      {userMachine.user?.firstName} {userMachine.user?.lastName}
                    </span>
                    <span className="ml-2 text-gray-400">
                      ({userMachine.user?.email})
                    </span>
                  </div>
                </td>
                <td className="p-4">
                  <span className="text-white">
                    {userMachine.machine?.machineName}
                  </span>
                </td>
                <td className="p-4 text-center">
                  <div className="flex items-center justify-center">
                    <DollarSign className="mr-2 h-4 w-4 text-green-500" />
                    <span className="font-bold text-green-400">
                      ${userMachine.monthlyProfitAccumulated || "0.00"}
                    </span>
                  </div>
                </td>
                <td className="p-4 text-center">
                  <div className="flex justify-center space-x-2">
                    <button
                      onClick={() => handleRemoveMachine(userMachine._id)}
                      className="text-red-500 hover:text-red-600 transition-colors"
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
        {allUserMachines.length === 0 && (
          <div className="p-6 text-center text-gray-400">
            No user machine assignments found
          </div>
        )}
      </div>
    </div>
  );
};

export default SerMachineList;

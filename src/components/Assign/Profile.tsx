// @ts-nocheck
"use client";
import React, { useState, useEffect } from "react";
import {
  DollarSign,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";

import {
  fetchAllUserMachines,
  updateMonthlyProfit,
  fetchProfitUpdateStatus,
} from "@/lib/feature/userMachine/usermachineApi";
import { useUpdateProfileMutation } from "@/lib/feature/auth/authThunk";

const UserMachineProfitUpdate: React.FC = () => {
  const dispatch = useDispatch();
  const [selectedUserMachine, setSelectedUserMachine] = useState("");
  const [profitAmount, setProfitAmount] = useState("");
  const [updateStatus, setUpdateStatus] = useState<any>(null);

  const { allUserMachines } = useUpdateProfileMutation(
    (state) => state.userMachine,
  );

  // Fetch user machines on mount
  useEffect(() => {
    dispatch(fetchAllUserMachines());
  }, [dispatch]);

  // Fetch profit update status when a user machine is selected
  useEffect(() => {
    if (selectedUserMachine) {
      dispatch(fetchProfitUpdateStatus(selectedUserMachine)).then(
        (response: any) => {
          setUpdateStatus(response.payload);
        },
      );
    }
  }, [selectedUserMachine, dispatch]);

  const handleProfitUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUserMachine) {
      toast.error("Please select a user machine", {
        position: "top-right",
        theme: "dark",
      });
      return;
    }

    if (!profitAmount || isNaN(Number(profitAmount))) {
      toast.error("Please enter a valid profit amount", {
        position: "top-right",
        theme: "dark",
      });
      return;
    }

    try {
      await dispatch(
        updateMonthlyProfit({
          userMachineId: selectedUserMachine,
          profitAmount: Number(profitAmount),
        }),
      ).unwrap();

      toast.success("Profit updated successfully", {
        position: "top-right",
        theme: "dark",
      });

      // Reset form and refetch status
      setProfitAmount("");
      dispatch(fetchProfitUpdateStatus(selectedUserMachine)).then(
        (response: any) => {
          setUpdateStatus(response.payload);
        },
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to update profit", {
        position: "top-right",
        theme: "dark",
      });
    }
  };

  return (
    <div className="rounded-2xl border border-gray-700 bg-gray-800 shadow-2xl">
      <div className="flex items-center border-b border-gray-700 p-6">
        <DollarSign className="mr-4 h-8 w-8 text-green-500" />
        <h2 className="text-2xl font-bold text-white">Update Machine Profit</h2>
      </div>

      <form onSubmit={handleProfitUpdate} className="space-y-4 p-6">
        <div>
          <label
            htmlFor="userMachine"
            className="mb-2 block text-sm font-medium text-gray-300"
          >
            Select User Machine
          </label>
          <select
            id="userMachine"
            value={selectedUserMachine}
            onChange={(e) => setSelectedUserMachine(e.target.value)}
            className="w-full rounded-lg bg-gray-700 px-4 py-3 text-white focus:ring-2 focus:ring-green-500"
          >
            <option value="">Select a user machine</option>
            {allUserMachines?.map((um) => (
              <option key={um._id} value={um._id}>
                {um.user?.firstName} {um.user?.lastName} -{" "}
                {um.machine?.machineName}
              </option>
            ))}
          </select>
        </div>

        {selectedUserMachine && updateStatus && (
          <div className="space-y-2 rounded-lg bg-gray-700 p-4">
            <div className="flex justify-between">
              <span className="text-gray-400">Current Accumulated Profit:</span>
              <span className="font-bold text-green-400">
                ${updateStatus.currentAccumulatedProfit}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Days Since Last Update:</span>
              <span>{updateStatus.daysSinceLastUpdate} days</span>
            </div>
          </div>
        )}

        <div>
          <label
            htmlFor="profitAmount"
            className="mb-2 block text-sm font-medium text-gray-300"
          >
            Profit Amount
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <DollarSign className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="number"
              id="profitAmount"
              value={profitAmount}
              onChange={(e) => setProfitAmount(e.target.value)}
              className="w-full rounded-lg bg-gray-700 px-4 py-3 pl-10 text-white focus:ring-2 focus:ring-green-500"
              placeholder="Enter profit amount"
            />
          </div>
        </div>

        <button
          type="submit"
          className="flex w-full items-center justify-center rounded-lg bg-green-600 py-3 text-white transition-colors hover:bg-green-700"
        >
          <CheckCircle2 className="mr-2 h-5 w-5" />
          Update Profit
        </button>
      </form>
    </div>
  );
};

export default UserMachineProfitUpdate;

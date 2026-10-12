// app/dashboard/machines/page.tsx
// @ts-nocheck

"use client";

import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

import { RootState, AppDispatch } from "@/lib/store/store";
import { UserMachine } from "@/types/userMachine";
import {
  fetchUserMachines,
  removeUserMachine,
} from "@/lib/feature/userMachine/usermachineApi";

export default function UserMachineDashboard() {
  const dispatch = useDispatch<AppDispatch>();
  const { userMachines, isLoading, error } = useSelector(
    (state: RootState) => state.userMachine,
  );
  const [selectedMachine, setSelectedMachine] = useState<UserMachine | null>(
    null,
  );

  useEffect(() => {
    // Assuming you have a way to get the current user's ID
    const userId = "current-user-id";
    dispatch(fetchUserMachines(userId));
  }, [dispatch]);

  const handleRemoveMachine = (userMachineId: string) => {
    dispatch(removeUserMachine(userMachineId));
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-32 w-32 animate-spin rounded-full border-t-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="bg-red-100 border-red-400 text-red-700 relative rounded border px-4 py-3"
        role="alert"
      >
        {error}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">My Mining Machines</h1>

      {userMachines.length === 0 ? (
        <div className="rounded-lg bg-gray-100 py-10 text-center">
          <p className="text-gray-600">No machines assigned yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {userMachines.map((machine) => (
            <div
              key={machine._id}
              className="overflow-hidden rounded-lg bg-white shadow-md transition-shadow duration-300 hover:shadow-xl"
            >
              <div className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold">
                    {machine.machine.machineName}
                  </h2>
                  <span className="text-sm font-medium text-green-600">
                    Active
                  </span>
                </div>

                <div className="space-y-2">
                  <p className="text-gray-600">
                    <span className="font-medium">Assigned Date:</span>{" "}
                    {new Date(machine.assignedDate).toLocaleDateString()}
                  </p>
                  <p className="text-gray-600">
                    <span className="font-medium">Monthly Profit:</span> $
                    {machine.monthlyProfitAccumulated || "0.00"}
                  </p>
                </div>

                <div className="mt-6 flex space-x-4">
                  <button
                    onClick={() => setSelectedMachine(machine)}
                    className="flex-1 rounded-md bg-blue-500 py-2 text-white transition-colors hover:bg-blue-600"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => handleRemoveMachine(machine._id)}
                    className="bg-red-500 hover:bg-red-600 flex-1 rounded-md py-2 text-white transition-colors"
                  >
                    Remov
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Machine Details Modal (optional) */}
      {selectedMachine && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-8">
            <h2 className="mb-4 text-2xl font-bold">
              {selectedMachine.machine.machineName} Details
            </h2>
            <div className="space-y-2">
              <p>
                <strong>Model:</strong> {selectedMachine.machine.model}
              </p>
              <p>
                <strong>Total Accumulated Profit:</strong>$
                {selectedMachine.monthlyProfitAccumulated || "0.00"}
              </p>
              {/* Add more details as needed */}
            </div>
            <div className="mt-6 flex justify-end space-x-4">
              <button
                onClick={() => setSelectedMachine(null)}
                className="rounded-md bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

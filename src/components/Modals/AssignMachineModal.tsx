"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Swal from "sweetalert2";
import { useAppDispatch } from "@/lib/store/reduxHooks";
import { assignMachineToUser } from "@/lib/feature/userMachine/usermachineApi";

interface UserData {
  _id: string;
  email: string;
}

interface AssignMachineModalProps {
  open: boolean;
  onClose: () => void;
  machineName: string;
  machineId: string;
  users: UserData[];
}

export default function AssignMachineModal({
  open,
  onClose,
  machineName,
  machineId,
  users,
}: AssignMachineModalProps) {
  const dispatch = useAppDispatch();
  const [selectedUser, setSelectedUser] = useState("");
  const [isLoading, setIsLoading] = useState(false); // ✅ loader state

  const handleAssign = async () => {
    if (!selectedUser) {
      return Swal.fire({
        title: "Select a user",
        text: "You must choose a user before assigning.",
        icon: "error",
        background: "#121212",
        color: "#fff",
      });
    }

    setIsLoading(true); // ✅ start loader

    try {
      await dispatch(
        assignMachineToUser({
          userId: selectedUser,
          machineId: machineId,
        })
      ).unwrap();

      Swal.fire({
        title: "Success!",
        text: "Machine assigned successfully.",
        icon: "success",
        background: "#121212",
        color: "#fff",
        confirmButtonColor: "#22c55e",
      });

      setSelectedUser("");
      onClose();
    } catch (err) {
      Swal.fire({
        title: "Failed!",
        text: "Could not assign the machine.",
        icon: "error",
        background: "#121212",
        color: "#fff",
      });
    } finally {
      setIsLoading(false); // ✅ stop loader
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#1e1e1e] text-white max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Machine</DialogTitle>
        </DialogHeader>

        <div className="mt-4 flex flex-col gap-4">
          {/* MACHINE NAME */}
          <div>
            <p className="text-gray-300 mb-1">Machine:</p>
            <div className="p-2 rounded-md bg-[#2a2a2a] border border-white/10">
              {machineName}
            </div>
          </div>

          {/* USER DROPDOWN */}
          <div>
            <p className="text-gray-300 mb-1">Select User:</p>
            <select
              className="w-full p-2 rounded-md bg-[#2a2a2a] border border-white/20"
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              disabled={isLoading} // ✅ disable while loading
            >
              <option value="">Choose user</option>
              {users?.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.email}
                </option>
              ))}
            </select>
          </div>

          {/* SUBMIT BUTTON */}
          <Button
            className="bg-green-600 hover:bg-green-700 flex items-center justify-center gap-2"
            onClick={handleAssign}
            disabled={isLoading} // ✅ disable while loading
          >
            {isLoading ? (
              <span className="animate-spin border-2 border-white border-t-transparent w-4 h-4 rounded-full"></span>
            ) : null}
            Confirm Assignment
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// @ts-nocheck

import React from "react";
import { useDispatch } from "react-redux";
import { AlertTriangle, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { sellUserMachine } from "@/lib/feature/userMachine/transactionSlice";
import { toast } from "react-toastify";

const SaleMachineModal = ({ isOpen, onClose, machine, onSuccess }) => {
  const dispatch = useDispatch();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  

  const originalPrice = machine.priceRange || 0;
  const deduction = originalPrice * 0.1;
  const sellingPrice = originalPrice - deduction;

const handleSell = async () => {
  try {
    setLoading(true);
    setError("");
    const result = await dispatch(sellUserMachine(machine._id)).unwrap();
    
    // Show success message with updated balance
    toast.success(`Machine sold successfully! $${sellingPrice.toFixed(2)} has been added to your balance.`);
    
    onSuccess?.();
    onClose();
  } catch (err) {
    setError(err.message || "Failed to sell machine");
  } finally {
    setLoading(false);
  }
};

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="border border-zinc-800 bg-zinc-900">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">
            Confirm Machine Sale
          </DialogTitle>
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-zinc-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-yellow-500/10 p-4 text-yellow-500">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <p className="text-sm">
                You are about to sell your mining machine. This action cannot be
                undone.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-zinc-400">
              <span>Original Price:</span>
              <span className="text-white">${originalPrice.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-zinc-400">
              <span>Deduction (10%):</span>
              <span className="text-red-500">-${deduction.toFixed(2)}</span>
            </div>
            <div className="border-t border-zinc-800 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Final Selling Price:</span>
                <span className="text-xl font-bold text-[#21eb00]">
                  ${sellingPrice.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 text-red-500 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-zinc-800 bg-transparent text-zinc-400 hover:bg-zinc-800"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSell}
            disabled={loading}
            className="bg-[#21eb00] text-black hover:bg-[#21eb00]/90"
          >
            {loading ? "Processing..." : "Confirm Sale"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SaleMachineModal;

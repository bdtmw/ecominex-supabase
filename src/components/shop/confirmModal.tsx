// @ts-nocheck

import React from "react";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DollarSign, AlertCircle, Wallet, PieChart } from "lucide-react";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";

const PurchaseConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  product,
  quantity,
  balances,
  isProcessing,
  isShareMachine = false,
  sharePrice,
  profitPerShare
}) => {
    const depositAddresses = {
    ERC20: {
      address: "0xE997EA28dA5Bcf59bED6e36245DF080DE8DA2358",
      qr: "/erc20.jpg",
    },
    TRC20: {
      address: "TV7d8mrM6MpCecbDQ2tifG19YNDJmcvRHc",
      qr: "/trc20.jpg",
    },
  };

  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [depositNetwork, setDepositNetwork] = useState<NetworkType | null>(
    "TRC20"
  );
  // Calculate total cost based on machine type
  const totalCost = isShareMachine 
    ? sharePrice * quantity 
    : product.priceRange * quantity;
    
  const hasEnoughBalance = balances?.total >= totalCost;
  console.log("Modal Balance Data:", balances);

  const handleConfirmClick = () => {
    console.log("Confirm button clicked"); // Debug log
    if (onConfirm) {
      onConfirm();
    }
  };
  
  return (
    <>
      {/* MAIN CONFIRM PURCHASE DIALOG */}
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="border border-gray-800 bg-gray-900 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {isShareMachine ? "Confirm Share Purchase" : "Confirm Purchase"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Balance Display */}
            <div className="rounded-xl border border-gray-700/30 bg-gray-800/60 p-4 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="text-green-400" />
                  <span className="text-gray-300">Your Balance:</span>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-green-400">
                    ${(balances?.total || 0).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Purchase Details */}
            <div
              className={`space-y-3 rounded-lg ${
                isShareMachine ? "bg-purple-900/20" : "bg-gray-800/60"
              } p-4`}
            >
              {isShareMachine ? (
                <>
                  <div className="flex items-center mb-2">
                    <PieChart className="mr-2 h-5 w-5 text-purple-400" />
                    <span className="font-medium text-purple-300">
                      Share-Based Mining
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Share Machine:</span>
                    <span className="font-medium">
                      {product.machineName}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Share Price:</span>
                    <span className="font-medium">
                      ${sharePrice.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Number of Shares:</span>
                    <span className="font-medium">{quantity}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Profit Per Share:</span>
                    <span className="font-medium text-purple-400">
                      ${profitPerShare}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">
                      Expected Monthly Profit:
                    </span>
                    <span className="font-medium text-purple-400">
                      ${(profitPerShare * quantity).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-700 pt-2 text-lg">
                    <span className="text-gray-300">Total Cost:</span>
                    <span className="font-bold text-purple-400">
                      ${totalCost.toLocaleString()}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Machine:</span>
                    <span className="font-medium">
                      {product.machineName}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Quantity:</span>
                    <span className="font-medium">{quantity}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-gray-700 pt-2 text-lg">
                    <span className="text-gray-300">Total Cost:</span>
                    <span className="font-bold text-green-400">
                      ${totalCost.toLocaleString()}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Insufficient Balance + Deposit Button */}
            {!hasEnoughBalance && (
              <div className="bg-red-900/50 border-red-700 flex flex-col gap-3 rounded-lg border p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-red-400 mt-0.5 h-5 w-5" />
                  <div className="space-y-1">
                    <p className="text-red-400 font-medium">
                      Insufficient Balance
                    </p>
                    <p className="text-red-300 text-sm">
                      You need $
                      {(
                        totalCost - (balances?.total || 0)
                      ).toLocaleString()}{" "}
                      more to complete this{" "}
                      {isShareMachine ? "share purchase" : "purchase"}.
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={() => setIsDepositOpen(true)}
                  className="self-start bg-green-600 hover:bg-green-700 text-white mt-1"
                >
                  <ArrowDownToLine className="mr-2 h-4 w-4" />
                  Deposit Funds
                </Button>
              </div>
            )}
          </div>

          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              onClick={() => onClose(false)}
              className="border-gray-700 bg-gray-800 text-white hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmClick}
              disabled={!hasEnoughBalance || isProcessing}
              className={`${
                isShareMachine
                  ? "bg-purple-600 hover:bg-purple-700"
                  : "bg-green-600 hover:bg-green-700"
              } text-white`}
            >
              {isProcessing
                ? "Processing..."
                : isShareMachine
                ? "Confirm Share Purchase"
                : "Confirm Purchase"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DEPOSIT FUNDS DIALOG */}
      <Dialog open={isDepositOpen} onOpenChange={setIsDepositOpen}>
        <DialogContent
          className="border-slate-700 max-w-md"
          style={{ backgroundColor: "#000000" }}
        >
          <DialogHeader>
            <DialogTitle className="text-white text-xl font-semibold">
              Deposit Funds
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Select network and send USDT
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Label className="text-white font-medium">Select Network</Label>

            <div className="grid grid-cols-2 gap-3">
              {/* ERC20 */}
              <div
                onClick={() => setDepositNetwork("ERC20")}
                className={`cursor-pointer rounded-lg border p-4 hover:bg-slate-800 transition text-center ${
                  depositNetwork === "ERC20"
                    ? "border-green-500"
                    : "border-slate-700"
                }`}
                style={{ backgroundColor: "#1b1b1b" }}
              >
                <img
                  src="https://cryptologos.cc/logos/ethereum-eth-logo.png"
                  className="w-12 h-12 mx-auto"
                />
                <p className="text-white font-semibold mt-2">Ethereum</p>
                <p className="text-slate-400 text-xs">ERC 20</p>
              </div>

              {/* TRC20 */}
              <div
                onClick={() => setDepositNetwork("TRC20")}
                className={`cursor-pointer rounded-lg border p-4 hover:bg-slate-800 transition text-center ${
                  depositNetwork === "TRC20"
                    ? "border-green-500"
                    : "border-slate-700"
                }`}
                style={{ backgroundColor: "#1b1b1b" }}
              >
                <img
                  src="https://cryptologos.cc/logos/tron-trx-logo.png"
                  className="w-12 h-12 mx-auto"
                />
                <p className="text-white font-semibold mt-2">TRON</p>
                <p className="text-slate-400 text-xs">TRC 20</p>
              </div>
            </div>

            {/* QR + Address + Buttons */}
            {depositNetwork && (
              <div className="space-y-3 pt-2">
                <div className="flex justify-center">
                  <img
                    src={depositAddresses[depositNetwork].qr}
                    alt="QR Code"
                    className="w-36 h-36 rounded-lg border border-slate-700"
                  />
                </div>

                <div className="p-3 bg-slate-800 rounded border border-slate-700 text-white text-center text-sm break-all">
                  {depositAddresses[depositNetwork].address}
                </div>

                <Button
                  onClick={() =>
                    navigator.clipboard.writeText(
                      depositAddresses[depositNetwork].address
                    )
                  }
                  variant="outline"
                  className="w-full"
                >
                  Copy Address
                </Button>

                <Button
                  onClick={() => {
                    const msg = `Send USDT to this address:\n\n${depositAddresses[depositNetwork].address}`;
                    const url = `https://wa.me/18079074455?text=${encodeURIComponent(
                      msg
                    )}`;
                    window.open(url, "_blank");
                  }}
                  className="w-full bg-green-600 text-white"
                >
                  Share on WhatsApp
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PurchaseConfirmationModal;
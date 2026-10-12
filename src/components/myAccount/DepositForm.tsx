// @ts-nocheck
import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  DollarSign,
  Loader2,
  ArrowRight,
  AlertCircle,
  Check,
  Info,
  TicketCheck,
  Copy,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AppDispatch, RootState } from "@/lib/store/store";
import { requestDeposit } from "@/lib/feature/Deposit/depositSlice"; // ✅ Correct import
import Image from "next/image";

const MIN_WITHDRAWAL = 50;

const DepositForm = ({ onSuccess }) => {
  const balance = useSelector((state: RootState) => state.balance.userBalance);
  const availableBalance = balance?.balances?.total || 0;
  const dispatch = useDispatch<AppDispatch>();
  const { user, isAuthenticated } = useSelector(
    (state: RootState) => state.auth
  );
  const [amount, setAmount] = useState("");
  const [network, setNetwork] = useState("ERC");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [transId, setTransId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const resetState = () => {
    setAmount("");
    setTransId("");
    setAttachment(null);
    setError("");
    // ✅ reset success message
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setShowSuccess(false);
      resetState();
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setAttachment(file);
  };

  const validateAmount = (value: string): string | null => {
    const withdrawalAmount = parseFloat(value);
    if (isNaN(withdrawalAmount) || withdrawalAmount <= 0)
      return "Please enter a valid amount";
    if (withdrawalAmount < MIN_WITHDRAWAL)
      return `Minimum Deposit amount is $${MIN_WITHDRAWAL}`;
    return null;
  };

  const handleDeposit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const validationError = validateAmount(amount);
    if (validationError) return setError(validationError);
    if (!transId) return setError("Please enter a Transition Id");
    if (!attachment) return setError("Please upload an attachment image");

    const token = localStorage.getItem("token");
    if (!token) return setError("Authentication token missing");
    if (!user) return setError("User missing");

    setError("");
    setIsLoading(true);

    try {
      const payload = {
        userId: user.id,
        amount,
        transactionId: transId,
        attachment,
        accountType: network,
        token,
      };

      const resultAction = await dispatch(requestDeposit(payload));

      if (resultAction) {
        console.log("✅ Deposit success:", resultAction.payload);
        setShowSuccess(true);
        if (onSuccess) onSuccess();
        resetState();
      } else {
        setError(resultAction.payload || "Deposit failed");
      }
    } catch (err) {
      console.error("❌ Deposit Error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <div className="px-4 sm:px-8 md:px-12 lg:px-48">
          <Button
            size="lg"
            className="bg-gradient-to-br p-4 sm:p-8 from-blue-500 via-blue-600 to-blue-700 hover:from-blue-600 hover:via-blue-700 hover:to-blue-800 text-white font-medium shadow-lg shadow-blue-500/20 transition-all duration-300 ease-out hover:shadow-blue-500/30 hover:scale-[1.02] w-full"
          >
            <DollarSign className="mr-2 h-6 w-6 sm:h-10 sm:w-10 text-2xl sm:text-4xl" />
            Deposit Funds
          </Button>
        </div>
      </DialogTrigger>

      <DialogContent className="sm:max-w-3xl bg-zinc-900 border border-zinc-800 shadow-2xl shadow-emerald-500/10 mx-4 sm:mx-auto pb-10">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl text-emerald-50 font-bold flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <DollarSign className="h-6 w-6 sm:h-7 sm:w-7 text-emerald-400" />
            </div>
            Deposit Funds
          </DialogTitle>
          <DialogDescription className="space-y-4">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-zinc-300 bg-zinc-950/50 p-2 sm:p-3 rounded-lg">
              <Info className="h-4 w-4 text-emerald-400" />
              Minimum Deposit amount is ${MIN_WITHDRAWAL}
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2">


          <div>
            {showSuccess ? (
              <div className="py-6 sm:py-8 text-center">
                <div className="mx-auto mb-4 h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-emerald-500/20 p-3 text-emerald-400 animate-bounce">
                  <Check className="h-6 w-6 sm:h-8 sm:w-8" />
                </div>
                <h3 className="mb-2 text-base sm:text-lg font-bold text-emerald-400">
                  Deposit Successful!
                </h3>
                <p className="text-sm sm:text-base text-zinc-400">
                  Your deposit of  has been received.
                </p>
              </div>
            ) : (
              <form onSubmit={handleDeposit} className="mt-4 space-y-4 sm:space-y-6">
                <div className="space-y-3">
                  {/* --- Network Selection --- */}
                  <div>
                    <label className="text-sm font-medium text-zinc-300">Network</label>
                    <div className="flex gap-6 pt-3">
                      {["ERC", "TRC"].map((type) => (
                        <label
                          key={type}
                          className="flex items-center text-sm font-medium text-zinc-300 gap-2 cursor-pointer"
                        >
                          <input
                            type="radio"
                            name="network"
                            value={type}
                            checked={network === type}
                            onChange={(e) => setNetwork(e.target.value)}
                          />
                          <span>{type} 20</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* --- Amount --- */}
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-emerald-500" />
                    <Input
                      id="amount"
                      type="number"
                      placeholder="Enter amount"
                      value={amount}
                      onChange={(e) => {
                        setAmount(e.target.value);
                        setError("");
                      }}
                      step="0.01"
                      disabled={isLoading}
                      className="pl-10 bg-zinc-950 border-zinc-800 focus:border-emerald-500 focus:ring-emerald-500 text-emerald-400 font-bold text-base sm:text-lg h-10 sm:h-12"
                    />
                  </div>

                  {/* --- Transaction ID --- */}
                  <div className="relative">
                    <TicketCheck className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-emerald-500" />
                    <Input
                      id="transId"
                      type="text"
                      placeholder="Enter Transaction Id"
                      value={transId}
                      onChange={(e) => {
                        setTransId(e.target.value);
                        setError("");
                      }}
                      disabled={isLoading}
                      className="pl-10 bg-zinc-950 border-zinc-800 focus:border-emerald-500 focus:ring-emerald-500 text-emerald-400 font-bold text-base sm:text-lg h-10 sm:h-12"
                    />
                  </div>

                  {/* --- Attachment --- */}
                  <div>
                    <label className="text-sm font-medium text-zinc-300">Attachment</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="flex h-13 w-full rounded-md border text-white border-zinc-800 bg-zinc-950 px-3 py-3.5 text-base ring-offset-white file:border-0 file:text-sm file:font-medium file:text-emerald-400 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2"
                    />
                  </div>
                </div>

                {error && (
                  <Alert className="border-orange-500/20 bg-orange-500/10">
                    <AlertCircle className="h-4 w-4 text-orange-400" />
                    <AlertDescription className="ml-2 text-orange-400 font-medium">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}

                <DialogFooter>
                  <div className="flex w-full flex-col gap-3">
                    <Button
                      type="submit"
                      disabled={isLoading || !amount}
                      className="w-full bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 hover:from-emerald-600 hover:via-emerald-700 hover:to-emerald-800 text-white font-medium h-10 sm:h-12 text-base sm:text-md shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all duration-300 disabled:opacity-50"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 sm:h-6 sm:w-6 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          Confirm Deposit
                          <ArrowRight className="ml-2 h-5 w-5 sm:h-6 sm:w-6" />
                        </>
                      )}
                    </Button>

                  </div>
                </DialogFooter>
              </form>
            )}
          </div>


          {network && <div className="flex flex-col justify-end items-center px-7 gap-3">

            <div className="flex items-center gap-2">
              <Image src={"/usdt.svg"}
                width={20} height={20} />
              <h4 className="text-white font-[500] text-[18px]">USDT</h4>
              <button className="text-white ml-1 rounded-full bg-emerald-500 px-2  text-[12px]">{network === "ERC" ? "ERC 20" : "TRC 20"}</button>
            </div>
            <div>
              <Image

                src={"/erc20.jpg"}
                width={320}
                height={150}
              />
            </div>
            <div className="relative w-full">
              <Input
                id="amount"
                type="text"
                value="0xE997EA28dA5Bcf59bED6e36245DF080DE8DA2358"
                readOnly
                className="bg-zinc-950 w-full border-zinc-800 focus:border-emerald-500 focus:ring-emerald-500 
               text-emerald-400 font-bold text-base sm:text-lg h-10 sm:h-12 
               pr-10 truncate overflow-hidden text-ellipsis"
              />
              <Copy className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" />
            </div>

          </div>
          }


        </div>
      </DialogContent>

    </Dialog>
  );
};

export default DepositForm;

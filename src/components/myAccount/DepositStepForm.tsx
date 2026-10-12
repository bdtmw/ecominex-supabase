// @ts-nocheck
import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  DollarSign,
  Info,
  Copy,
  Check,
  ArrowLeft,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { AppDispatch, RootState } from "@/lib/store/store";

const MIN_WITHDRAWAL = 50;

const DepositStepForm = ({style }) => {
  const dispatch = useDispatch<AppDispatch>();
  const balance = useSelector((state: RootState) => state.balance.userBalance);
  const availableBalance = balance?.balances?.total || 0;

  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedNetwork, setSelectedNetwork] = useState("");
  const [copied, setCopied] = useState(false);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    setStep(1); 
    setSelectedNetwork("");
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

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

  const networkData = depositAddresses[selectedNetwork];

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <div className={`${!style && "px-4 sm:px-8 md:px-12 lg:px-48" }`}>
          <Button
            size="lg"
            className={`bg-gradient-to-br  ${style ? "from-[#21eb00] via-[#138901] to-[#176b0a] p-4 sm:px-4.5 sm:py-3" : "from-blue-500 via-blue-600 to-blue-700  p-4 sm:p-8" } hover:from-blue-600 hover:via-blue-700  hover:to-blue-800 text-white font-medium shadow-lg shadow-blue-500/20 transition-all duration-300 ease-out hover:shadow-blue-500/30 hover:scale-[1.02] w-full`}
          >
            <DollarSign className="mr-2 h-6 w-6 sm:h-10 sm:w-10" />
            Deposit Funds
          </Button>
        </div>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md bg-zinc-900 border border-zinc-800 shadow-2xl shadow-emerald-500/10 mx-4 sm:mx-auto pb-10">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl text-emerald-50 font-bold flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <DollarSign className="h-6 w-6 sm:h-7 sm:w-7 text-emerald-400" />
            </div>
            {step === 1 ? "Deposit Funds" : `${selectedNetwork} Deposit`}
          </DialogTitle>
          <DialogDescription>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-zinc-300 bg-zinc-950/50 p-2 sm:p-3 rounded-lg">
              <Info className="h-4 w-4 text-emerald-400" />
              Minimum deposit amount is ${MIN_WITHDRAWAL}
            </div>
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="flex flex-col mt-3">
            <div className="flex items-center gap-3">
              <Image src="/usdt.svg" alt="usdt" width={35} height={35} />
              <h1 className="text-white text-[22px] font-[500]">USDT</h1>
            </div>

            <div className="mt-5">
              <label className="text-[16px] font-medium text-zinc-300">
                Select Network
              </label>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <button
                  onClick={() => {
                    setSelectedNetwork("ERC20");
                    setStep(2);
                  }}
                  className="border border-[#8e8e8e] rounded-[3px] flex justify-center items-center flex-col py-6 hover:border-emerald-500 transition"
                >
                  <Image
                    src="/erclogo.png"
                    alt="erc"
                    width={43}
                    height={43}
                  />
                  <h1 className="text-white text-[18.5px] font-[500] mt-2">
                    Ethereum
                  </h1>
                  <h1 className="text-white text-[14px] font-[400]">ERC 20</h1>
                </button>

                <button
                  onClick={() => {
                    setSelectedNetwork("TRC20");
                    setStep(2);
                  }}
                  className="border border-[#8e8e8e] rounded-[3px] flex justify-center items-center flex-col py-5 hover:border-emerald-500 transition"
                >
                  <Image
                    src="/trcIcon.png"
                    alt="trc"
                    width={40}
                    height={40}
                  />
                  <h1 className="text-white text-[18.5px] font-[500] mt-2">
                    TRON
                  </h1>
                  <h1 className="text-white text-[14px] font-[400]">TRC 20</h1>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2 — Show Deposit Info */}
        {step === 2 && networkData && (
          <div className="flex flex-col gap-4 mt-5">
            <button
              onClick={() => setStep(1)}
              className="flex items-center text-emerald-400 text-sm mb-2 hover:text-emerald-300 transition"
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </button>

            <div className="flex justify-center">
              <Image
                src={networkData.qr}
                alt="QR Code"
                width={200}
                height={160}
                className="border border-zinc-700"
              />
            </div>

            <div className="text-center">
              <div className="relative mt-3">
                <Input
                  type="text"
                  value={networkData.address}
                  readOnly
                  title={networkData.address} 
                  className="bg-zinc-950 w-full border-zinc-800 focus:border-emerald-500 
                             text-emerald-400 font-bold text-base sm:text-lg h-10 sm:h-12 
                             pr-10 truncate overflow-hidden text-ellipsis"
                />
                <button
                  onClick={() => handleCopy(networkData.address)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 hover:text-emerald-400 transition"
                >
                  {copied ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Copy className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <Button
              onClick={() => window.open('https://wa.me/+971563605068', '_blank')}
              className="mt-1 bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 hover:from-emerald-600 hover:via-emerald-700 hover:to-emerald-800 text-white font-medium h-10 sm:h-12 text-base sm:text-[14px] shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all duration-300"
            >
              Share the screenshot on WhatsApp now
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DepositStepForm;

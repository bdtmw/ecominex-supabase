"use client";

import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/store/store";
import { validateWalletAddress } from "@/utils/walletValidation";
import { getUserBalance } from "@/lib/feature/userMachine/balanceSlice";
import { fetchUserWithdrawals } from "@/lib/feature/withdraw/withdrawalSlice";
import { requestWithdrawal } from "@/lib/feature/withdraw/withdrawalSlice";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axiosInstance from "@/utils/axiosInstance";


export default function Wallet() {
  const dispatch = useDispatch<AppDispatch>();


  const { user, isAuthenticated } = useSelector(
    (state: RootState) => state.auth
  );

console.log("something ",user)
  const { userBalance, loading: balanceLoading, error: balanceError } = useSelector(
    (state: RootState) => state.balance
  );

  // ================================
  // 🔥 REDUX STATE (Withdrawals)
  // ================================
  const { withdrawals, isLoading: withdrawalsLoading, error: withdrawalsError } = useSelector(
    (state: RootState) => state.withdrawal
  );
console.log(withdrawals)
  // ================================
  // 🔥 API CALL ON PAGE LOAD
  // ================================
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.id) dispatch(getUserBalance(user.id));
      if (user.email) dispatch(fetchUserWithdrawals({ email: user.email }));
    }
  }, [dispatch, isAuthenticated, user]);



  // ================================
  // 🔥 WITHDRAW UI STATES
  // ================================
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [withdrawNetwork, setWithdrawNetwork] = useState("");
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  type NetworkType = "TRC20" | "ERC20";
   
  const [depositNetwork, setDepositNetwork] = useState<NetworkType | "">("");
  const [depositAmount, setDepositAmount] = useState("");
  const [isCreatingNowPayment, setIsCreatingNowPayment] = useState(false);

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



  const handleNowPaymentsDeposit = async () => {
    const amount = Number(depositAmount);

    if (!amount || amount <= 0) {
      toast.error("Please enter a valid deposit amount");
      return;
    }

    if (!depositNetwork) {
      toast.error("Please select a payment network");
      return;
    }

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

    if (!token) {
      toast.error("Not authorized, please login again");
      return;
    }

    const payCurrency = depositNetwork === "TRC20" ? "usdttrc20" : "usdterc20";

    try {
      setIsCreatingNowPayment(true);

      const response = await axiosInstance.post(
        "/api/v1/deposit/nowpayments",
        {
          amount,
          payCurrency,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const invoiceUrl =
        response.data?.invoiceUrl ||
        response.data?.data?.invoiceUrl ||
        response.data?.invoice_url ||
        response.data?.data?.invoice_url;

      if (!invoiceUrl) {
        toast.error("Payment invoice URL not received from server");
        return;
      }

      toast.success("Redirecting to NOWPayments...");
      window.location.href = invoiceUrl;
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to create NOWPayments invoice");
    } finally {
      setIsCreatingNowPayment(false);
    }
  };

const handleWithdrawrequest = async () => {
  if (!withdrawAmount || parseFloat(withdrawAmount) < 59.2) {
    toast.error("Minimun Amount is 50$");
    return;
  }

  if (!withdrawAddress || !withdrawNetwork) {
    toast.error("Please fill all fields");
    return;
  }

if (!withdrawNetwork) {
  toast.error("Please select a network");
  return;
}

if (!validateWalletAddress(withdrawAddress, withdrawNetwork as NetworkType)) {
  toast.error("Please enter a valid wallet address for the selected network.");
  return;
}

    if (!user?.id || !user?.email) {
      toast.error("User not authenticated");
      return;
    }

    const payload = {
      userId: user.id,
    email: user.email,
    amount: parseFloat(withdrawAmount),
    walletAddress: withdrawAddress.trim(),
    network: withdrawNetwork,
  };

  try {
    const result = await dispatch(requestWithdrawal(payload)).unwrap();
    toast.success(result?.message || "Withdrawal request submitted successfully");
    setIsWithdrawOpen(false);
    setWithdrawAmount("");
    setWithdrawAddress("");
    setWithdrawNetwork("");
  } catch (error: any) {
    let errorMessage = "Failed to submit withdrawal request";

    if (typeof error === "string") errorMessage = error;
    else if (error?.message) errorMessage = error.message;
    else if (error?.data?.message) errorMessage = error.data.message;

    console.error("Withdrawal API Error:", error);
    toast.error(errorMessage);
  }
};




  return (
    <div className="space-y-6 p-4 md:p-6 min-h-screen" style={{ backgroundColor: "#000000" }}>
      <ToastContainer position="top-right" autoClose={3000} theme="dark" />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-white">
            Wallet
          </h2>
          <p className="text-sm text-slate-400">
            Manage your funds and view transaction history
          </p>
        </div>

        <div className="flex gap-2">
          {/* Deposit */}
          <Dialog open={isDepositOpen} onOpenChange={setIsDepositOpen}>
            <DialogTrigger asChild>
              <Button className="text-white" style={{ backgroundColor: "#22c55e" }}>
                <ArrowDownToLine className="mr-2 h-4 w-4" />
                Deposit
              </Button>
            </DialogTrigger>

            <DialogContent className=" border-slate-700 max-w-md" style={{ backgroundColor: "#000000" }}>
              <DialogHeader>
                <DialogTitle className="text-white text-xl font-semibold">
                  Deposit Funds
                </DialogTitle>
                <DialogDescription className="text-slate-400">
                  Select network and send USDT
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-white font-medium">Enter Amount</Label>
                  <Input
                    type="number"
                    min="1"
                    step="0.01"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="Enter amount in USD"
                    className="bg-slate-900 border-slate-700 text-white"
                  />
                </div>

                {/* Select Network Title */}
                <Label className="text-white font-medium">Select Network</Label>

                {/* Network Cards */}
                <div className="grid grid-cols-2 gap-3">

                  {/* ERC20 */}
                  <div
                    onClick={() => setDepositNetwork("ERC20")}
                    className={`cursor-pointer rounded-lg border p-4  hover:bg-slate-800 transition text-center
          ${depositNetwork === "ERC20" ? "border-green-500" : "border-slate-700"}`}
                    style={{ backgroundColor: "#1b1b1b" }}>
                    <img src="https://cryptologos.cc/logos/ethereum-eth-logo.png" className="w-12 h-12 mx-auto" />
                    <p className="text-white font-semibold mt-2">Ethereum</p>
                    <p className="text-slate-400 text-xs">ERC 20</p>
                  </div>

                  {/* TRC20 */}
                  <div
                    onClick={() => setDepositNetwork("TRC20")}
                    className={`cursor-pointer rounded-lg border p-4 bg-slate-800/40 hover:bg-slate-800 transition text-center
          ${depositNetwork === "TRC20" ? "border-green-500" : "border-slate-700"}`}
                    style={{ backgroundColor: "#1b1b1b" }}
                  >
                    <img src="https://cryptologos.cc/logos/tron-trx-logo.png" className="w-12 h-12 mx-auto" />
                    <p className="text-white font-semibold mt-2">TRON</p>
                    <p className="text-slate-400 text-xs">TRC 20</p>
                  </div>
                </div>

                {/* NOWPayments Button */}
                {depositNetwork && (
                  <div className="space-y-3 pt-2">
                    <div className="rounded-lg border border-green-700 bg-green-950/30 p-3 text-sm text-green-200">
                      You selected {depositNetwork}. Click below to create a secure NOWPayments invoice and proceed with payment.
                    </div>

                    <Button
                      onClick={handleNowPaymentsDeposit}
                      disabled={isCreatingNowPayment}
                      className="w-full bg-green-600 text-white hover:bg-green-700"
                    >
                      {isCreatingNowPayment ? "Creating payment..." : "Pay with NOWPayments"}
                    </Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
           {/* Withdraw */}
          <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
            <DialogTrigger asChild>
              <Button className="bg-red-600 text-white" style={{ backgroundColor: "red" }}>
                <ArrowUpFromLine className="mr-2 h-4 w-4" />
                Withdraw
              </Button>
            </DialogTrigger>
 
            <DialogContent className="border-slate-700" style={{ backgroundColor: "#000000" }}>
              <DialogHeader>
                <DialogTitle className="text-white text-2xl font-semibold">
                  Withdraw Funds
                </DialogTitle>
                <DialogDescription className="text-slate-400">
                  Minimum withdrawal: $50.00
                </DialogDescription>
              </DialogHeader>
 
              <div className="space-y-6"> 
                {/* Amount */}
                <Label className="text-slate-300">Amount</Label>
                <Input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="text-white"
                  style={{ backgroundColor: "#1b1b1b" }}
                  placeholder="50.00"
                />

                {/* Network */}
                <div className="space-y-3">
                  <Label className="text-white text-lg font-semibold">
                    Select Network
                  </Label>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Ethereum Card */}
                    <div
                      onClick={() => setWithdrawNetwork("ERC20")}
                      className={`cursor-pointer rounded-xl border p-5  hover:bg-slate-800 transition 
            ${withdrawNetwork === "ERC20" ? "border-green-500" : "border-slate-700"}`}
                      style={{ backgroundColor: "#1b1b1b" }}
                    >
                      <div className="flex flex-col items-center gap-3">
                        <img
                          src="https://cryptologos.cc/logos/ethereum-eth-logo.png"
                          className="w-12 h-12"
                        />
                        <span className="text-white font-semibold text-lg">Ethereum</span>
                        <span className="text-slate-400 text-sm">ERC 20</span>
                      </div>
                    </div>

                    {/* Tron Card */}
                    <div
                      onClick={() => setWithdrawNetwork("TRC20")}
                      className={`cursor-pointer rounded-xl border p-5  hover:bg-slate-800 transition 
            ${withdrawNetwork === "TRC20" ? "border-green-500" : "border-slate-700"}`}
                      style={{ backgroundColor: "#1b1b1b" }}
                    >
                      <div className="flex flex-col items-center gap-3">
                        <img
                          src="https://cryptologos.cc/logos/tron-trx-logo.png"
                          className="w-12 h-12"
                        />
                        <span className="text-white font-semibold text-lg">TRON</span>
                        <span className="text-slate-400 text-sm">TRC 20</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Wallet Address */}
                <Label className="text-slate-300">Wallet Address</Label>
                <Input
                  value={withdrawAddress}
                  onChange={(e) => setWithdrawAddress(e.target.value)}
                  className="bg-slate-800 text-white"
                  placeholder="Enter address"
                  style={{ backgroundColor: "#1b1b1b" }}
                />

                <Button
                  onClick={handleWithdrawrequest}
                  className="w-full bg-red-600 text-white text-lg py-3" style={{ backgroundColor: "#22c55e" }}
                >
                  Submit Withdrawal
                </Button>
              </div>
            </DialogContent>
          </Dialog>


        </div>
      </div>

      {/* BALANCE CARDS */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-slate-800" style={{ backgroundColor: "#1b1b1b" }}>
          <CardHeader>
            <CardTitle className="text-slate-400 text-sm">
              Available Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl text-white font-bold">
              {balanceLoading
                ? "Loading..."
                : `$${Number(userBalance?.balances.total ?? 0).toLocaleString()}`}
            </div>
          </CardContent>
        </Card>

        <Card className=" border-slate-800" style={{ backgroundColor: "#1b1b1b" }}>
          <CardHeader>
            <CardTitle className="text-slate-400 text-sm">
              Mining Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl text-white font-bold">
              {balanceLoading
                ? "Loading..."
                : `$${userBalance?.balances?.mining ?? 0}`}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800" style={{ backgroundColor: "#1b1b1b" }}>
          <CardHeader>
            <CardTitle className="text-slate-400 text-sm">
              Admin Added
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl text-white font-bold">
              {balanceLoading ? "Loading..." : `$${(userBalance?.balances?.adminAdd ?? 0).toLocaleString()}`}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TRANSACTION HISTORY */}
      <Card className="border-slate-800" style={{ backgroundColor: "#1b1b1b" }}>
        <CardHeader>
          <CardTitle className="text-white">
            Transaction History
          </CardTitle>
          <CardDescription className="text-slate-400">
            Your recent withdrawals
          </CardDescription>
        </CardHeader>

        <CardContent>
  {withdrawalsLoading && (
    <p className="text-white">Loading transactions...</p>
  )}

  {!withdrawalsLoading && withdrawals?.length === 0 && (
    <p className="text-slate-400">No withdrawal history found</p>
  )}

  <div className="space-y-3">
    {withdrawals?.map((w) => {
      const isWithdrawal = w.type === "withdrawal";
      const isDeposit = w.type === "ADMIN_ADD";

      const title = isWithdrawal
        ? "Withdrawal"
        : isDeposit
        ? "Deposit"
        : "Transaction";

      const amountPrefix = isWithdrawal ? "-" : "+";

      return (
        <div
          key={w._id}
          className="flex justify-between items-center p-3 border border-slate-700 rounded-lg"
          style={{ backgroundColor: "#1b1b1b" }}
        >
          <div>
            <p className="text-white font-medium">{title}</p>
            <p className="text-slate-400 text-sm">
              {new Date(w.transactionDate).toLocaleDateString()}
            </p>
          </div>

          <div className="text-right">
            {/* amount styling unchanged */}
            <p className="text-white font-bold">
              {amountPrefix}${Number(w.amount).toLocaleString()}
            </p>

            {/* status styling unchanged */}
            <p
              className={`text-xs ${
                w.status === "pending"
                  ? "text-yellow-400"
                  : w.status === "rejected"
                  ? "text-[#ff0000]"
                  : "text-emerald-400"
              }`}
            >
              {w.status}
            </p>
          </div>
        </div>
      );
    })}
  </div>
</CardContent>
      </Card>
    </div>
  );
}

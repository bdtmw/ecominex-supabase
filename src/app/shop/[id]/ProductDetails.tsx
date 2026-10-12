
// @ts-nocheck
"use client";

import React, { useEffect, useState } from "react";
import { useGetAllMiningMachinesQuery } from "@/lib/feature/Machines/miningMachinesApiSlice";
import {
  ChevronLeft,
  ShoppingCart,
  Bolt,
  Zap,
  DollarSign,
  Minus,
  Plus,
  Wallet,
  PieChart,
} from "lucide-react";
import Link from "next/link";
import { toast, ToastContainer } from "react-toastify";
import LandingLayout from "@/components/Layouts/LandingLayout";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { AppDispatch, RootState } from "@/lib/store/store";
import { useDispatch, useSelector } from "react-redux";
import { purchaseAndAssignMachine } from "@/lib/feature/userMachine/transactionSlice";
import PurchaseConfirmationModal from "@/components/shop/confirmModal";
import {
  purchaseSpecialShares,
  getSpecialShareMachine,
} from "@/lib/feature/shareMachine/shareMachineSlice";
import { getUserBalance } from "@/lib/feature/userMachine/balanceSlice";
import "react-toastify/dist/ReactToastify.css";


const ProductDetails = ({ params }) => {
  const [quantity, setQuantity] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [shareQuantity, setShareQuantity] = useState(1);
  const [isShareRoute, setIsShareRoute] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [displayBalance, setDisplayBalance] = useState(0);

  const { data: products, isLoading: productsLoading } =
    useGetAllMiningMachinesQuery();
  const dispatch = useDispatch<AppDispatch>();

  const { user, isAuthenticated } = useSelector(
    (state: RootState) => state.auth
  );

  const balanceData = useSelector(
    (state: RootState) => state.balance.userBalance
  );
  const { specialMachine, loading: shareLoading } = useSelector(
    (state: RootState) => state.shareMachine
  );

  useEffect(() => {
    if (balanceData?.balances?.total !== undefined) {
      setDisplayBalance(balanceData.balances.total);
    }
  }, [balanceData]);

  useEffect(() => {
    if (params.id.includes("share")) {
      setIsShareRoute(true);
      dispatch(getSpecialShareMachine());
    } else if (
      specialMachine &&
      specialMachine.machineName.toLowerCase().replace(/\s+/g, "-") ===
        params.id
    ) {
      setIsShareRoute(true);
    }
  }, [params.id, dispatch]);

  useEffect(() => {
    if (!specialMachine && isShareRoute) {
      dispatch(getSpecialShareMachine());
    }
  }, [dispatch, specialMachine, isShareRoute]);

  const product = isShareRoute
    ? specialMachine
    : products?.data?.find(
        (p) =>
          p.machineName.toLowerCase().replace(/\s+/g, "-") === params.id
      );

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      dispatch(getUserBalance(user.id));
    }
  }, [isAuthenticated, user, dispatch]);

  const handleBuyClick = () => {
    if (!isAuthenticated || !user) {
      toast.error("Please login to make a purchase");
      return;
    }
    setIsModalOpen(true);
  };

  const handleConfirmPurchase = async () => {
    if (!isAuthenticated) {
      toast.error("Please login to make a purchase");
      return;
    }
    const userId = user?.id;
    if (!userId) {
      toast.error("User ID is missing");
      return;
    }
    if (!product?._id) {
      toast.error("Machine ID is missing");
      return;
    }

    setIsProcessing(true);
    try {
      if (isShareRoute || product.isShareBased) {
        const sharePurchasePayload = {
          userId,
          numberOfShares: parseInt(shareQuantity, 10),
        };
        const resultAction = await dispatch(
          purchaseSpecialShares(sharePurchasePayload)
        );
        if (purchaseSpecialShares.fulfilled.match(resultAction)) {
          toast.success("Share purchase successful!");
          setIsModalOpen(false);
          await dispatch(getUserBalance(userId));
          const totalCost =
            shareQuantity * (product?.sharePrice || 0);
          setDisplayBalance((prev) => Math.max(0, prev - totalCost));
        } else {
          const errorMessage =
            resultAction.error?.message ||
            "Share purchase failed. Please try again.";
          toast.error(errorMessage);
        }
      } else {
        const purchasePayload = {
          userId,
          machineId: product._id,
          quantity: 1,
          machineDetails: product,
        };
        const resultAction = await dispatch(
          purchaseAndAssignMachine(purchasePayload)
        );
        if (purchaseAndAssignMachine.fulfilled.match(resultAction)) {
          toast.success("Purchase successful!");
          setIsModalOpen(false);
          await dispatch(getUserBalance(userId));
          const totalCost = product.priceRange || 0;
          setDisplayBalance((prev) => Math.max(0, prev - totalCost));
        } else {
          const errorMessage =
            resultAction.error?.message ||
            "Purchase failed. Please try again.";
          toast.error(errorMessage);
        }
      }
    } catch (error) {
      toast.error("An unexpected error occurred during purchase");
    } finally {
      setIsProcessing(false);
    }
  };

  const isShareMachine = isShareRoute || product?.isShareBased;
  const sharePrice = product?.sharePrice || 0;
  const availableShares = product?.availableShares || 0;
  const profitPerShare = product?.profitPerShare || 0;

  const handleQuantityChange = (newQuantity) => {
    if (isShareMachine) {
      if (newQuantity >= 1 && newQuantity <= availableShares) {
        setShareQuantity(newQuantity);
      }
    }
  };

  const BalanceDisplay = () =>
    isAuthenticated && (
      <div className="mb-6 rounded-xl border border-gray-700/30 bg-gray-800/60 p-4 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="text-green-400" />
            <span className="text-gray-300">Your Balance:</span>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-green-400">
              ${displayBalance.toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    );

  const isInitialLoading =
    productsLoading ||
    (isShareRoute && shareLoading && !specialMachine);

  if (isInitialLoading && !isPurchasing) {
    return (
      <LandingLayout>
        <div className="flex min-h-screen items-center justify-center bg-primary">
          <div className="text-xl text-white">
            Loading machine details...
          </div>
        </div>
      </LandingLayout>
    );
  }

  if (!product) {
    return (
      <LandingLayout>
        <div className="flex min-h-screen items-center justify-center bg-primary">
          <div className="text-xl text-white">
            Machine not found. Please try again later.
          </div>
        </div>
      </LandingLayout>
    );
  }

  const unitPrice = isShareMachine ? sharePrice : product.priceRange;
  const totalPrice = isShareMachine
    ? sharePrice * shareQuantity
    : product.priceRange;

  return (
    <LandingLayout>
      
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
      <div className="min-h-screen bg-gradient-to-b from-primary to-primary/95 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <Link
              href="/shop"
              className="inline-flex items-center rounded-xl bg-gray-800/60 px-4 py-2 text-white backdrop-blur-sm transition-colors hover:text-green-400"
            >
              <ChevronLeft className="mr-2" /> Back to Shop
            </Link>
          </div>

          <BalanceDisplay />

          <div className="grid gap-12 lg:grid-cols-2">
            <div className="max-h-[600px] rounded-3xl border bg-white p-8">
              <div className="group relative">
                <Image
                  src={product.images?.[0] || "/placeholder.jpg"}
                  alt={product.machineName}
                  className="h-auto w-full transform rounded-2xl object-contain transition-transform duration-300 group-hover:scale-105"
                  width={700}
                  height={700}
                />
              </div>
            </div>

            <div className="space-y-6">
              {/* ... rest of your JSX stays exactly the same ... */}
              <div className="space-y-4">
                {isShareMachine ? (
                  <Badge className="bg-purple-500/20 text-purple-400 hover:bg-purple-500/30">
                    Share Based Machine
                  </Badge>
                ) : (
                  <Badge className="bg-green-500/20 text-green-400 hover:bg-green-500/30">
                    In Stock
                  </Badge>
                )}
                <h1
                  className={`bg-gradient-to-r ${isShareMachine ? "from-purple-400 to-blue-500" : "from-green-400 to-blue-500"} bg-clip-text text-4xl font-bold text-transparent`}
                >
                  {product.machineName}
                </h1>
                {isShareMachine && (
                  <div className="rounded-lg bg-blue-500/20 p-3 text-blue-300">
                    <div className="mb-2 flex items-center">
                      <PieChart className="mr-2 h-5 w-5 text-purple-400" />
                      <span className="font-semibold">
                        Share-Based Mining
                      </span>
                    </div>
                    <p className="text-sm">
                      This is a share-based machine. Instead of
                      purchasing the entire machine, you can buy shares
                      and earn proportional profit.
                    </p>
                  </div>
                )}
              </div>

              <div
                className={`rounded-2xl border border-gray-700/30 ${isShareMachine ? "bg-purple-900/20" : "bg-gray-800/60"} p-6 backdrop-blur-xl`}
              >
                <div className="flex flex-col space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400">
                        {isShareMachine
                          ? "Price per share"
                          : "Price"}
                      </p>
                      <p
                        className={`text-3xl font-bold ${isShareMachine ? "text-purple-400" : "text-green-400"}`}
                      >
                        ${unitPrice.toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-col items-end">
                      <p className="text-sm text-gray-400">
                        Total Price
                      </p>
                      <p
                        className={`text-2xl font-semibold ${isShareMachine ? "text-purple-400" : "text-green-400"}`}
                      >
                        ${totalPrice.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {isShareMachine && (
                    <div className="flex items-center justify-between rounded-xl bg-gray-700/30 p-4">
                      <span className="text-gray-300">
                        Share Quantity:
                      </span>
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() =>
                            handleQuantityChange(shareQuantity - 1)
                          }
                          className="rounded-lg bg-gray-600/50 p-2 transition-colors hover:bg-gray-600"
                          disabled={shareQuantity <= 1}
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="min-w-[2rem] text-center text-xl font-semibold">
                          {shareQuantity}
                        </span>
                        <button
                          onClick={() =>
                            handleQuantityChange(shareQuantity + 1)
                          }
                          className="rounded-lg bg-gray-600/50 p-2 transition-colors hover:bg-gray-600"
                          disabled={
                            shareQuantity >= availableShares
                          }
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {isShareMachine && (
                <div className="rounded-2xl border border-gray-700/30 bg-purple-900/20 p-6 backdrop-blur-xl">
                  <h2 className="mb-4 flex items-center text-xl font-semibold">
                    <DollarSign className="mr-2 text-purple-400" />{" "}
                    Share Investment Details
                  </h2>
                  <div className="space-y-4">
                    <div className="flex justify-between rounded-lg bg-gray-700/30 p-3">
                      <span>Total Shares:</span>
                      <span className="font-medium">
                        {product.totalShares}
                      </span>
                    </div>
                    <div className="flex justify-between rounded-lg bg-gray-700/30 p-3">
                      <span>Profit per share (monthly):</span>
                      <span className="font-medium text-purple-400">
                        ${profitPerShare}
                      </span>
                    </div>
                    <div className="flex justify-between rounded-lg bg-gray-700/30 p-3">
                      <span>Your shares:</span>
                      <span className="font-medium">
                        {shareQuantity}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={handleBuyClick}
                  className={`flex flex-1 transform items-center justify-center gap-3 rounded-xl ${
                    isShareMachine
                      ? "bg-gradient-to-r from-purple-500 to-blue-600 shadow-purple-500/20"
                      : "bg-gradient-to-r from-green-500 to-green-600 shadow-green-500/20"
                  } px-6 py-4 text-white shadow-lg transition-all duration-300 hover:scale-[1.02] ${
                    isShareMachine
                      ? "hover:from-purple-600 hover:to-blue-700"
                      : "hover:from-green-600 hover:to-green-700"
                  }`}
                >
                  <ShoppingCart className="h-5 w-5" />
                  <span className="font-semibold">
                    {isShareMachine ? "Buy Shares" : "Buy Now"}
                  </span>
                </button>
              </div>

              <div
                className={`rounded-2xl border border-gray-700/30 ${isShareMachine ? "bg-purple-900/20" : "bg-gray-800/60"} p-6 backdrop-blur-xl`}
              >
                <h2 className="mb-4 flex items-center text-xl font-semibold">
                  <Zap
                    className={`mr-2 ${isShareMachine ? "text-blue-400" : "text-yellow-400"}`}
                  />{" "}
                  Technical Specifications
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 rounded-xl bg-gray-700/30 p-4">
                    <Bolt className="h-8 w-8 text-blue-400" />
                    <div>
                      <p className="text-sm text-gray-400">
                        Hashrate
                      </p>
                      <p className="font-medium">
                        {product.hashrate}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl bg-gray-700/30 p-4">
                    <Zap className="h-8 w-8 text-yellow-400" />
                    <div>
                      <p className="text-sm text-gray-400">Power</p>
                      <p className="font-medium">
                        {product.powerConsumption} W
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl bg-gray-700/30 p-4">
                    <DollarSign
                      className={`h-8 w-8 ${isShareMachine ? "text-purple-400" : "text-green-400"}`}
                    />
                    <div>
                      <p className="text-sm text-gray-400">
                        {isShareMachine
                          ? "Profit per Share"
                          : "Monthly Profit"}
                      </p>
                      <p
                        className={`font-medium ${isShareMachine ? "text-purple-400" : "text-green-400"}`}
                      >
                        $
                        {isShareMachine
                          ? profitPerShare
                          : product.monthlyProfit}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl bg-gray-700/30 p-4">
                    <div>
                      <p className="text-sm text-gray-400">
                        Coins Mined
                      </p>
                      <p className="font-medium">
                        {product.coinsMined}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-700/30 bg-gray-800/60 p-6 backdrop-blur-xl">
                <h2 className="mb-4 text-xl font-semibold">
                  Product Description
                </h2>
                <p className="leading-relaxed text-gray-300">
                  {product.description}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <PurchaseConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmPurchase}
        product={product}
        quantity={isShareMachine ? shareQuantity : 1}
        isShareMachine={isShareMachine}
        sharePrice={sharePrice}
        profitPerShare={profitPerShare}
        balances={{
          total: displayBalance,
          available: displayBalance,
        }}
        isProcessing={isProcessing}
      />
    </LandingLayout>
  );
};

export default ProductDetails;
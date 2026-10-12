"use client";
import { ArrowUpRight, Ban, DollarSign, Users } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import TransactionsTable from "../TransactionHistory/TransactionHistory";
import PendingRequest from "../PendingRequest/PendingRequest";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/store/store";
import { fetchPendingWithdrawals, fetchWithdrawalStats } from "@/lib/feature/withdraw/withdrawalSlice";
import { useEffect, useState } from "react";

export default function Transactions() {

    const ITEMS_PER_PAGE = 10;

    const dispatch = useDispatch<AppDispatch>();
    const [currentPage, setCurrentPage] = useState(1);
    const [flippedIndex, setFlippedIndex] = useState<number | null>(null);
    const withdrawalState = useSelector((state: RootState) => state.withdrawal);
    const { pendingWithdrawals, stats, isLoading, error, pagination } = withdrawalState;

    console.log(pendingWithdrawals);

    const handleFlip = (index: number) => {
        setFlippedIndex(flippedIndex === index ? null : index);
    };

    useEffect(() => {
        dispatch(fetchPendingWithdrawals({ page: currentPage, limit: ITEMS_PER_PAGE }));
        dispatch(fetchWithdrawalStats());
    }, [dispatch, currentPage]);


    function formatAmount(amount?: number) {
        if (!amount && amount !== 0) return "0";
        if (amount >= 1_000_000_000) return (amount / 1_000_000_000).toFixed(1) + "B";
        if (amount >= 1_000_000) return (amount / 1_000_000).toFixed(1) + "M";
        if (amount >= 1_000) return (amount / 1_000).toFixed(1) + "K";
        return amount.toLocaleString("en-US");
    }



    const statss = [

        {
            icons: <Users className="size-4.5" />,
            title: "Approved",
            value: stats?.approved.count,
            amount: formatAmount(stats?.approved.amount),
            note: "Successfully processed",
            gradient: false,
        },
        {
            icons: <DollarSign className="size-4.5" />,
            title: "Pending",
            value: stats?.pending.count,
            amount: formatAmount(stats?.pending.amount),
            note: "Awaiting processing",
            gradient: true,
        },
        {
            icons: <Ban className="size-4.5" />,
            title: "Rejected",
            value: stats?.rejected.count,
            note: "Declined requests",
            gradient: false,
        }

    ];


    if (!stats) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-transparent">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-green-500"></div>
            </div>
        );
    }



    return (
        <>

            <div className="!-mt-4 mb-6 ml-3">
                <p className="text-gray-200 text-[15px]"> Process and manage user withdrawal requests

                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {statss.map((item, index) => (
                    <div
                        key={index}
                        className="relative perspective"
                    >
                        <div
                            className={`relative w-full h-[32vh] transition-transform duration-500 transform-style-preserve-3d ${item.amount && flippedIndex === index ? "rotate-y-180" : ""
                                }`}
                        >
                            {/* Front Side */}
                            <div
                                className={`absolute w-full h-[32vh] backface-hidden rounded-[25px] shadow-sm flex flex-col gap-4.5 justify-between p-5
                                ${item.gradient
                                        ? "bg-gradient-to-b from-[#1dae52] to-[#08381a] border-none"
                                        : "bg-[#1b1b1b]"
                                    }`}
                            >
                                {/* Arrow */}
                                {item.amount && <div
                                    className={`absolute top-3 right-3 p-1.5 text-lg border-[1.5px] rounded-full ${item.gradient ? "!bg-[#fff]" : "bg-transparent"} border-gray-200 cursor-pointer`}
                                    onClick={() => handleFlip(index)}
                                >
                                    <ArrowUpRight className={`size-5.5 ${item.gradient ? "text-[#000]" : "text-gray-200"}`} />
                                </div>}


                                <h3 className="text-[16px] py-1 font-medium text-gray-100 flex gap-1 items-center">{item.icons} {item.title}</h3>
                                <p className="text-[54px] leading-[55px] font-medium text-gray-200">{item.value || 0}</p>
                                <span className={`text-[13.5px] ${item.gradient ? "text-gray-200" : "text-gray-300"}`}>{item.note}</span>
                            </div>




                            <div
                                className={`absolute w-full h-full backface-hidden gap-2 rotate-y-180 rounded-[25px] shadow-sm flex flex-col items-center justify-center p-5
                ${item.gradient
                                        ? "bg-gradient-to-b from-[#08381a] to-[#1dae52]"
                                        : "bg-[#1b1b1b]"
                                    }`}
                            >
                                {item.amount && <div
                                    className={`absolute top-3 right-3 p-1.5 text-lg border-[1.5px] rounded-full ${item.gradient ? "!bg-[#fff]" : "bg-transparent"} border-gray-200 cursor-pointer`}
                                    onClick={() => setFlippedIndex(null)}
                                >
                                    <ArrowUpRight className={`size-5.5 ${item.gradient ? "text-[#000]" : "text-gray-200"}`} />
                                </div>}


                                <h3 className="text-[16px] py-1 font-medium text-gray-100 flex gap-1 items-center">{item.icons} {item.title}</h3>
                                <p className="text-[50px] leading-[55px] font-medium text-gray-200">${item.amount ?? 0}</p>
                                <span className={`text-[13.5px] ${item.gradient ? "text-gray-200" : "text-gray-300"}`}>{item.note}</span>
                            </div>

                        </div>
                    </div>
                ))}
            </div>

            <div className="w-full px-1 mt-7">

                <Tabs defaultValue="pending" className="w-full">

                    <TabsList className="grid grid-cols-2 mb-8 gap-10 w-[300px] bg-transparent text-white text-[15.5px]">
                        <TabsTrigger value="pending">Pending Request</TabsTrigger>
                        <TabsTrigger value="history">Transactions History</TabsTrigger>
                    </TabsList>

                    {/* TAB 1 — Assign Machine */}
                    <TabsContent value="pending">
                        <PendingRequest pendingWithdrawals={pendingWithdrawals || []}
                            isLoading={isLoading}
                            currentPage={currentPage}
                            ITEMS_PER_PAGE={ITEMS_PER_PAGE} />
                    </TabsContent>

                    {/* TAB 2 — Machine Assigned */}
                    <TabsContent value="history">
                        <TransactionsTable />
                    </TabsContent>
                </Tabs>
            </div>
        </>
    );
}

// @ts-nocheck

'use client'
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useDebounce } from 'use-debounce';

import {
  ArrowDownUp,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Search,
  AlertCircle,
  ArrowDownRight,
  History,
  Filter
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AppDispatch, RootState } from "@/lib/store/store";
import { Withdrawal } from "@/types/withdrawals";
import { fetchAllWithdrawals } from "@/lib/feature/withdraw/withdrawalSlice";

const AdminTransactionHistory = () => {
  const dispatch = useDispatch<AppDispatch>();
  const ITEMS_PER_PAGE = 10;

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("transactionDate");
  const [sortOrder, setSortOrder] = useState("desc");
  const [isMobileView, setIsMobileView] = useState(false);

  const withdrawalState = useSelector((state: RootState) => state.withdrawal);
  const { allWithdrawals: withdrawals, isLoading, error, pagination } = withdrawalState;

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [debouncedSearchQuery] = useDebounce(searchQuery, 500);

 // In your component
 useEffect(() => {
  dispatch(fetchAllWithdrawals({
    page: currentPage,
    limit: ITEMS_PER_PAGE,
    status: statusFilter !== "all" ? statusFilter : undefined,
    sortBy: sortField,
    sortOrder,
    search: debouncedSearchQuery
  }));
}, [dispatch, currentPage, statusFilter, sortField, sortOrder, debouncedSearchQuery]);

// Add this to check the data
useEffect(() => {
  console.log('Current withdrawals:', withdrawals);
}, [withdrawals]);

  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case "approved":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "pending":
        return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
      case "rejected":
        return "bg-red-500/10 text-red border-red-500/20";
      default:
        return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: isMobileView ? undefined : "2-digit",
      minute: isMobileView ? undefined : "2-digit",
    });
  };

  const formatAmount = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const MobileTransactionCard = ({ withdrawal }: { withdrawal: Withdrawal }) => (
    <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-800 mb-3">
      <div className="flex justify-between items-start mb-3">
        <div className="flex flex-col">
          <span className="text-sm text-zinc-400">{formatDate(withdrawal.transactionDate)}</span>
          <span className="text-sm text-zinc-300 mt-1">{withdrawal.user.email}</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="capitalize font-medium text-emerald-100">
              Withdrawal
            </span>
            <ArrowDownRight className="h-4 w-4 text-emerald-400" />
          </div>
        </div>
        <Badge
          className={`${getStatusColor(withdrawal.status)} capitalize border px-2 py-0.5 text-xs`}
        >
          {withdrawal.status}
        </Badge>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-sm text-zinc-400">Amount</span>
        <span className="font-bold text-[#21df03]">
          -{formatAmount(withdrawal.amount)}
        </span>
      </div>
    </div>
  );

  return (
    <Card className="border-zinc-800 bg-black/50 backdrop-blur-sm shadow-lg">
      <CardHeader className="pb-4 px-4 sm:px-6">
        <div className="flex flex-col space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <History className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-xl sm:text-2xl font-bold text-white">
                All Withdrawals
              </CardTitle>
              <p className="mt-1 text-sm text-zinc-400">
                Manage and track all withdrawal requests
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 w-full">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500" />
              <Input
                placeholder="Search by email or amount..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-full bg-zinc-900 border-zinc-800 text-white focus:border-emerald-500 focus:ring-emerald-500 placeholder-zinc-500"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] bg-zinc-900 border-green-800 text-white font-bold">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>

              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          </div>
        ) : error ? (
          <Alert className="border-red-500/20 bg-red-500/10">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-400">
              {error}
            </AlertDescription>
          </Alert>
        ) : withdrawals.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-zinc-400">
            <div className="p-4 rounded-full bg-zinc-800/50 mb-4">
              <Clock className="h-8 w-8" />
            </div>
            <p className="text-lg font-medium">No withdrawals found</p>
            <p className="text-sm text-zinc-500 mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="space-y-3">
            {isMobileView ? (
              <div className="space-y-2">
                {withdrawals.map((withdrawal) => (
                  <MobileTransactionCard key={withdrawal._id} withdrawal={withdrawal} />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-zinc-800 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800 hover:bg-zinc-800/50">
                      <TableHead 
                        className="text-zinc-400 font-medium cursor-pointer"
                        onClick={() => handleSort("transactionDate")}
                      >
                        <div className="flex items-center gap-2">
                          Date
                          {sortField === "transactionDate" && (
                            <ArrowDownUp className={`h-4 w-4 ${sortOrder === "asc" ? "rotate-180" : ""}`} />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="text-zinc-400 font-medium">User Email</TableHead>
                      <TableHead className="text-zinc-400 font-medium">Status</TableHead>
                      <TableHead 
                        className="text-right text-zinc-400 font-medium cursor-pointer"
                        onClick={() => handleSort("amount")}
                      >
                        <div className="flex items-center justify-end gap-2">
                          Amount
                          {sortField === "amount" && (
                            <ArrowDownUp className={`h-4 w-4 ${sortOrder === "asc" ? "rotate-180" : ""}`} />
                          )}
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withdrawals.map((withdrawal) => (
                      <TableRow
                        key={withdrawal._id}
                        className="border-zinc-800 hover:bg-zinc-800/50 transition-colors duration-200"
                      >
                        <TableCell className="text-zinc-400 font-medium">
                          {formatDate(withdrawal.transactionDate)}
                        </TableCell>
                      
                        <TableCell className="text-zinc-300">
                        <div className="text-white font-bold">   {withdrawal.user.firstName}
                        {withdrawal.user.lastName}</div>

                          {withdrawal.user.email}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`${getStatusColor(withdrawal.status)} capitalize border px-3 py-1`}
                          >
                            {withdrawal.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold text-[#21df03]">
                          -{formatAmount(withdrawal.amount)}
                        </TableCell>
                      
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1 py-2">
              <p className="text-xs sm:text-sm text-zinc-400 text-center sm:text-left">
                Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, pagination.totalWithdrawals)} to{" "}
                {Math.min(currentPage * ITEMS_PER_PAGE, pagination.totalWithdrawals)} of{" "}
                {pagination.totalWithdrawals} withdrawals
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => prev - 1)}
                  className="h-8 w-8 sm:h-9 sm:w-9 border-zinc-800 bg-zinc-900 hover:bg-zinc-800 hover:text-emerald-400 transition-colors duration-200"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={currentPage === pagination.totalPages}
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                  className="h-8 w-8 sm:h-9 sm:w-9 border-zinc-800 bg-zinc-900 hover:bg-zinc-800 hover:text-emerald-400 transition-colors duration-200"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminTransactionHistory;
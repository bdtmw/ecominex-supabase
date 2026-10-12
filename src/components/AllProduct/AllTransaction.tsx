// @ts-nocheck

'use client'
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  Search,
  Clock,
  ChevronLeft,
  ChevronRight,
  BanIcon,
  Users,
  DollarSign,
} from "lucide-react";
import { AppDispatch, RootState } from "@/lib/store/store";
import {
  fetchPendingWithdrawals,
  processWithdrawalRequest,
  fetchWithdrawalStats,
} from "@/lib/feature/withdraw/withdrawalSlice";

import {
  Card,
  CardContent,
  CardDescription,
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
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@radix-ui/react-select";

const AdminWithdrawalDashboard = () => {
  const dispatch = useDispatch<AppDispatch>();
  const ITEMS_PER_PAGE = 10;

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<any>(null);
  const [adminComment, setAdminComment] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const withdrawalState = useSelector((state: RootState) => state.withdrawal);
  const { pendingWithdrawals, stats, isLoading, error, pagination } = withdrawalState;

  useEffect(() => {
    dispatch(fetchPendingWithdrawals({ page: currentPage, limit: ITEMS_PER_PAGE }));
    dispatch(fetchWithdrawalStats());
  }, [dispatch, currentPage]);

  const formatAmount = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleProcess = async (action: 'approved' | 'rejected') => {
    if (!selectedWithdrawal) return;

    setIsProcessing(true);
    try {
      await dispatch(processWithdrawalRequest({
        transactionId: selectedWithdrawal._id,
        action,
        adminComment,
      })).unwrap();
      
      // Refresh data
      dispatch(fetchPendingWithdrawals({ page: currentPage, limit: ITEMS_PER_PAGE }));
      dispatch(fetchWithdrawalStats());
      
      setSelectedWithdrawal(null);
      setAdminComment("");
    } catch (error) {
      console.error("Error processing withdrawal:", error);
    }
    setIsProcessing(false);
  };

  const filteredWithdrawals = pendingWithdrawals.filter(withdrawal =>
    withdrawal.user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    withdrawal.amount.toString().includes(searchQuery)
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
    {/* Header */}
    <div className="space-y-2">
      <h1 className="text-3xl font-bold text-white">Withdrawal Management</h1>
      <p className="text-zinc-400">Process and manage user withdrawal requests</p>
    </div>
  
    {/* Stats Cards */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="bg-black border-emerald-500/20">
        <CardHeader className="pb-2">
          <div className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5 text-emerald-400" />
            <CardTitle className="text-sm font-medium text-zinc-200">Pending</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-baseline">
            <div className="text-3xl font-bold text-white">{stats?.pending.count || 0}</div>
            <div className="text-lg font-semibold text-emerald-400">
              {formatAmount(stats?.pending.amount || 0)}
            </div>
          </div>
          <p className="text-xs text-zinc-400 mt-2">Awaiting processing</p>
        </CardContent>
      </Card>
  
      <Card className="bg-black border-blue-500/20">
        <CardHeader className="pb-2">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-blue-400" />
            <CardTitle className="text-sm font-medium text-zinc-200">Approved</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-baseline">
            <div className="text-3xl font-bold text-white">{stats?.approved.count || 0}</div>
            <div className="text-lg font-semibold text-blue-400">
              {formatAmount(stats?.approved.amount || 0)}
            </div>
          </div>
          <p className="text-xs text-zinc-400 mt-2">Successfully processed</p>
        </CardContent>
      </Card>
  
      <Card className="bg-black">
        <CardHeader className="pb-2">
          <div className="flex items-center space-x-2">
            <BanIcon className="h-5 w-5 text-red-400" />
            <CardTitle className="text-sm font-medium text-zinc-200">Rejected</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-baseline">
            <div className="text-3xl font-bold text-white">{stats?.rejected.count || 0}</div>
            <div className="text-lg font-semibold text-red">
              {formatAmount(stats?.rejected.amount || 0)}
            </div>
          </div>
          <p className="text-xs text-zinc-400 mt-2">Declined requests</p>
        </CardContent>
      </Card>
    </div>
  
    {/* Main Content */}
    <Card className="border-zinc-800/50 bg-black/30 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <CardTitle className="text-xl font-bold text-white">Pending Requests</CardTitle>
            <CardDescription className="text-zinc-400">
              Review and process withdrawal requests
            </CardDescription>
          </div>
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500" />
            <Input
              placeholder="Search by email or amount..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-zinc-900/50 border-zinc-800 focus:ring-emerald-500/20 focus:border-emerald-500/20"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
              <p className="text-sm text-zinc-400">Loading requests...</p>
            </div>
          </div>
        ) : error ? (
          <Alert className="border-red-500/20 bg-red-500/10">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-400">{error}</AlertDescription>
          </Alert>
        ) : filteredWithdrawals.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-zinc-400">
            <Clock className="h-12 w-12 mb-4 text-zinc-500" />
            <p className="text-lg font-medium">No pending withdrawals</p>
            <p className="text-sm text-zinc-500">All caught up!</p>
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-800/50 overflow-hidden">
            <Table>
             <TableHeader>
  <TableRow className="border-zinc-800 hover:bg-zinc-900/50">
    <TableHead className="text-zinc-400 font-medium">User</TableHead>
    <TableHead className="text-zinc-400 font-medium">Request Date</TableHead>
    <TableHead className="text-zinc-400 font-medium">Wallet Details</TableHead>
    <TableHead className="text-right text-zinc-400 font-medium">Amount</TableHead>
    <TableHead className="text-right text-zinc-400 font-medium">Actions</TableHead>
  </TableRow>
</TableHeader>
<TableBody>
  {filteredWithdrawals.map((withdrawal) => (
    <TableRow
      key={withdrawal._id}
      className="border-zinc-800 hover:bg-zinc-900/50"
    >
      <TableCell>
        <div className="flex flex-col">
          <span className="text-white font-bold text-lg">
            {withdrawal.user.firstName} {""} {withdrawal.user.lastName}
          </span>
          <span className="font-medium text-white mt-1">{withdrawal.user.email}</span>
          <span className="text-xs text-zinc-500">ID: {withdrawal._id}</span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col">
          <span className="text-zinc-200">{formatDate(withdrawal.transactionDate)}</span>
          <span className="text-xs text-zinc-500">
            {new Date(withdrawal.transactionDate).toLocaleTimeString()}
          </span>
        </div>
      </TableCell>

      {/* ✅ New Wallet Details Column */}
      <TableCell>
        <div className="flex flex-col gap-1">
          <Badge
            variant="outline"
            className="w-fit border-blue-500/20 bg-blue-500/10 text-blue-400 text-xs"
          >
            {withdrawal.network}
          </Badge>
          <span
            className="text-xs text-zinc-400 font-mono max-w-[180px] truncate"
            title={withdrawal.walletAddress}
          >
            {withdrawal.walletAddress}
          </span>
        </div>
      </TableCell>

      <TableCell className="text-right">
        <div className="flex flex-col items-end">
          <span className="font-bold text-emerald-400">
            {formatAmount(withdrawal.amount)}
          </span>
          <Badge variant="outline" className="border-emerald-500/20 text-emerald-400">
            Pending
          </Badge>
        </div>
      </TableCell>
      <TableCell className="text-right">
        <Button
          onClick={() => setSelectedWithdrawal(withdrawal)}
          variant="outline"
          size="sm"
          className="border-emerald-500/20 hover:bg-emerald-500/10 text-emerald-900 bg-gray-100"
        >
          Process Request
        </Button>
      </TableCell>
    </TableRow>
  ))}
</TableBody>
            </Table>
          </div>
        )}
  
        {/* Pagination */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mt-4 gap-4">
          <p className="text-sm text-zinc-400">
            Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, pagination.totalWithdrawals)} to{" "}
            {Math.min(currentPage * ITEMS_PER_PAGE, pagination.totalWithdrawals)} of{" "}
            {pagination.totalWithdrawals} requests
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => prev - 1)}
              className="border-zinc-800 hover:bg-zinc-900"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === pagination.totalPages}
              onClick={() => setCurrentPage((prev) => prev + 1)}
              className="border-zinc-800 hover:bg-zinc-900"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  
    {/* Process Withdrawal Dialog */}
    <Dialog open={!!selectedWithdrawal} onOpenChange={() => setSelectedWithdrawal(null)}>
      <DialogContent className="bg-zinc-900 border-zinc-800 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl text-white">Process Withdrawal Request</DialogTitle>
          
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="grid gap-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-zinc-400">Request Details</h4>
              <Separator className="bg-zinc-800" />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-500">User Email</label>
                  <p className="font-medium text-white">{selectedWithdrawal?.user.email}</p>
                </div>
                <div>
                 
                </div>
                <div>
                  <label className="text-xs text-zinc-500">Request Date</label>
                  <p className="font-medium text-white">
                    {selectedWithdrawal && formatDate(selectedWithdrawal.transactionDate)}
                  </p>
                </div>
                <div>
                <label className="text-xs text-zinc-500">Amount</label>
                  <p className="font-medium text-emerald-400">
                    {selectedWithdrawal && formatAmount(selectedWithdrawal.amount)}
                  </p>
                </div>
                 <div className="col-span-2">
    <label className="text-xs text-zinc-500">Wallet Address</label>
    <p
      className="font-mono text-sm text-white break-all bg-zinc-800 rounded-md px-3 py-2 mt-1"
    >
      {selectedWithdrawal?.walletAddress}
    </p>
  </div>
              </div>
            </div>
            
            {/* <div className="space-y-2">
              <label className="text-sm text-zinc-400">Admin Comment</label>
              <Textarea
                value={adminComment}
                onChange={(e) => setAdminComment(e.target.value)}
                placeholder="Add a comment (optional)"
                className="bg-zinc-800 border-zinc-700 focus:ring-emerald-500/20 focus:border-emerald-500/20"
              />
            </div> */}
          </div>
        </div>
  
        <DialogFooter className="gap-2">
          <Button
            onClick={() => handleProcess('rejected')}
            variant="destructive"
            disabled={isProcessing}
            className="flex-1"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Reject
          </Button>
          <Button
            onClick={() => handleProcess('approved')}
            className="flex-1 bg-emerald-500 hover:bg-emerald-600"
            disabled={isProcessing}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
  );
};

export default AdminWithdrawalDashboard;
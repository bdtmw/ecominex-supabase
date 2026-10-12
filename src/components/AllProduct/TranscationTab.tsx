// @ts-nocheck

import React from 'react';
import { Activity, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

const TransactionsTab = ({ 
  isLoading, 
  withdrawals, 
  pagination, 
  currentPage, 
  setCurrentPage, 
  handleRefresh 
}) => {
  // Enhanced date formatting to include time
  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getStatusStyles = (status) => {
    const styles = {
      pending: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
      completed: "bg-green-500/10 text-green-400 border border-green-500/20",
      failed: "bg-red-500/10 text-red-400 border border-red-500/20",
      processing: "bg-blue-500/10 text-blue-400 border border-blue-500/20"
    };
    return styles[status.toLowerCase()] || styles.pending;
  };

  const TransactionTypeIcon = ({ type }) => {
    return type.toLowerCase() === 'withdrawal' ? (
      <ArrowUpRight className="h-4 w-4 text-red-400" />
    ) : (
      <ArrowDownLeft className="h-4 w-4 text-green-400" />
    );
  };

  return (
    <Card className="border-gray-800 bg-gray-900/50">
      <CardHeader className="flex flex-row items-center justify-between pb-6">
        <div className="flex flex-col gap-1">
          <CardTitle className="flex items-center gap-3">
            <Activity className="h-6 w-6 text-blue-400" />
            <span className="text-xl font-semibold text-white">Transaction History</span>
          </CardTitle>
          <p className="text-sm text-gray-400">View and manage your transaction history</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading}
          className="flex items-center gap-2 border-gray-700 bg-gray-800/50 text-gray-300 hover:bg-gray-700 hover:text-white"
        >
          <svg className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-[450px] rounded-md">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3 text-blue-400">
                <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-lg">Loading transactions...</span>
              </div>
            </div>
          ) : !withdrawals?.length ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Activity className="mb-4 h-16 w-16 opacity-40" />
              <p className="text-lg font-medium">No transactions found</p>
              <p className="mt-2 text-sm text-gray-500">Your transaction history will appear here</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800 bg-gray-900/80">
                  <TableHead className="w-48 py-4 font-medium text-gray-400">Date & Time</TableHead>
                  <TableHead className="w-32 font-medium text-gray-400">Type</TableHead>
                  <TableHead className="font-medium text-gray-400 text-right">Amount</TableHead>
                  <TableHead className="w-32 font-medium text-gray-400">Status</TableHead>
                  <TableHead className="font-medium text-gray-400">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {withdrawals.map((transaction) => (
                  <TableRow
                    key={transaction._id}
                    className="border-gray-800 text-gray-300 transition-colors hover:bg-gray-800/40"
                  >
                    <TableCell className="py-4 font-medium">
                      {formatDateTime(transaction.transactionDate)}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-2">
                        <TransactionTypeIcon type={transaction.type || 'withdrawal'} />
                        <span className="capitalize">{transaction.type || 'Withdrawal'}</span>
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <span className={transaction.type?.toLowerCase() === 'deposit' ? 'text-green-400' : 'text-red-400'}>
                        {formatCurrency(transaction.amount)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusStyles(transaction.status)}`}>
                        {transaction.status}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-gray-400">
                      {transaction.description || 'Withdrawal request'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ScrollArea>

        {pagination && withdrawals?.length > 0 && (
          <div className="mt-6 flex items-center justify-between border-t border-gray-800 px-2 pt-4">
            <div className="text-sm text-gray-400">
              Showing {withdrawals.length} of {pagination.totalWithdrawals} transactions
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="text-gray-400 hover:bg-gray-800 hover:text-white disabled:opacity-50"
              >
                Previous
              </Button>
              <span className="text-sm text-gray-400">
                Page {currentPage} of {pagination.totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                disabled={currentPage === pagination.totalPages}
                className="text-gray-400 hover:bg-gray-800 hover:text-white disabled:opacity-50"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TransactionsTab;
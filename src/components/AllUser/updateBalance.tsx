//@ts-nocheck

import React, { useState, useEffect } from 'react';
import { Plus, DollarSign, RefreshCw } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppDispatch, RootState } from '@/lib/store/store';
import { getUserBalance, updateBalance } from '@/lib/feature/userMachine/balanceSlice';

interface UserBalanceUpdateProps {
  userId: string;
  userName: string;
}

const UserBalanceUpdate: React.FC<UserBalanceUpdateProps> = ({ userId, userName }) => {
  const dispatch = useDispatch<AppDispatch>();
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const balanceData = useSelector((state: RootState) => state.balance.userBalance);
  const loading = useSelector((state: RootState) => state.balance.loading);

  useEffect(() => {
    if (userId) {
      dispatch(getUserBalance(userId));
    }
  }, [dispatch, userId]);

  const handleBalanceUpdate = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error('Please enter a valid amount greater than 0');
      return;
    }

    setIsLoading(true);
    try {
      const updateData = {
        userId,
        amount: Number(amount),
        type: 'profit'
      };

      const result = await dispatch(updateBalance(updateData)).unwrap();
      toast.success('Admin balance updated successfully');
      
      dispatch(getUserBalance(userId));
      setAmount('');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update balance');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  if (loading && !balanceData) {
    return (
      <div className="flex justify-center items-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-gray-800 border-none">
        <CardHeader>
          <CardTitle className="text-x2l font-bold flex items-center gap-2 text-green-400">
            <DollarSign className="h-6 w-6 text-green-400" />
            Balance Management
          </CardTitle>
          <CardDescription className="text-gray-400">
            <div className="space-y-2 mt-3">
              <p className="flex items-center justify-between">
                <span>Total Balance:</span> 
                <span className="font-medium text-white">
                  {formatCurrency(balanceData?.totalBalance || balanceData?.balances?.total || 0)}
                </span>
              </p>
              <p className="flex items-center justify-between">
                <span>Admin Balance:</span> 
                <span className="font-medium text-blue-300">
                  {formatCurrency(balanceData?.adminAdd || balanceData?.balances?.adminAdd || balanceData?.balances?.main || 0)}
                </span>
              </p>
              <p className="flex items-center justify-between">
                <span>Mining Profit:</span> 
                <span className="font-medium text-green-300">
                  {formatCurrency(balanceData?.miningBalance || balanceData?.balances?.miningBalance || balanceData?.balances?.mining || 0)}
                </span>
              </p>
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-gray-400">Add funds to user admin balance</p>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount to add"
                className="pl-10 bg-gray-700 border-gray-600 text-white"
                min="0"
                step="0.01"
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            onClick={handleBalanceUpdate}
            disabled={isLoading || !amount}
            className="bg-green-400 hover:bg-blue-600 text-white"
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Add Admin Balance
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default UserBalanceUpdate;
// types/withdrawal.ts

export interface Withdrawal {
    _id: string;
    user: {
      _id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
    type: string;
    amount: number;
    status: 'pending' | 'approved' | 'rejected';
    network: string,
    walletAddress: string,
    transactionDate: string;
    adminComment?: string;
    processedBy?: string;
    processedAt?: string;
  }
  
  export interface WithdrawalRequest {
    email: string;
    amount: number;
  }
  
  export interface ProcessWithdrawalPayload {
    transactionId: string;
    action: 'approved' | 'rejected';
    adminComment?: string;
  }
  
  export interface WithdrawalResponse {
    message: string;
    transaction: Withdrawal;
    availableProfit?: number;
  }
  
  export interface WithdrawalListResponse {
    withdrawals: Withdrawal[];
    
    totalPages: number;
    currentPage: number;
    totalWithdrawals: number;
  }
  
  export interface WithdrawalStats {
    pending: {
      count: number;
      amount: number;
    };
    approved: {
      count: number;
      amount: number;
    };
    rejected: {
      count: number;
    };
  }
  
  export interface WithdrawalState {
    withdrawals: Withdrawal[];
    pendingWithdrawals: Withdrawal[];
    stats: WithdrawalStats | null;
    allWithdrawals: Withdrawal[]; 
    pagination: {
      currentPage: number;
      totalPages: number;
      totalWithdrawals: number;
    };
    isLoading: boolean;
    error: string | null;
  }


  export interface FetchAllWithdrawalsParams {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    status?: 'pending' | 'approved' | 'rejected';
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }



  export interface BalanceUpdateRequest {
    userId: string;
    amount: number;
    reason?: string;
  }
  
  export interface BalanceUpdateResponse {
    message: string;
    user: {
      id: string;
      email: string;
      name: string;
    };
    balanceUpdate: {
      amount: number;
      previousBalance: number;
      newBalance: number;
    };
    transaction: {
      _id: string;
      amount: number;
      type: string;
      status: string;
      details: string;
      processedAt: string;
    };
  }
  
  export interface UserBalanceResponse {
    userId: string;
    userName: string;
    email: string;
    mainBalance: number;
    machineProfitsTotal: number;
    totalBalance: number;
    machineCount: number;
  }
  
  export interface BalanceHistoryParams {
    userId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }
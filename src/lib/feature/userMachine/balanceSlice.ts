import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '@/utils/axiosInstance';
import { RootState } from '@/lib/store/store';

// Updated types to match backend schema
interface Balance {
  totalBalance: number;
  adminAdd: number;
  miningBalance: number;
  lastUpdated: Date;
}

interface BalanceWithMachines extends Balance {
  balances: {
    total: number;
    adminAdd: number;
    mining: number;
  };
  machines: {
    count: number;
    details: Array<{
      machineId: string;
      name: string;
      accumulatedProfit: number;
      lastProfitUpdate: Date;
    }>;
  };
}


// Simplified UpdateBalancePayload to remove balanceType
interface UpdateBalancePayload {
  userId: string;
  amount: number;
  type: 'withdrawal' | 'profit';
}

interface Transaction {
  _id: string;
  user: string;
  amount: number;
  type: 'withdrawal' | 'profit';
  status: 'pending' | 'approved' | 'rejected';
  adminComment?: string;
  processedBy?: string;
  processedAt?: Date;
  transactionDate: Date;
  details?: string;
}

interface BalanceUpdateResponse {
  message: string;
  balances: Balance;
  transaction: Transaction;
}

interface ProcessWithdrawalPayload {
  transactionId: string;
  status: 'approved' | 'rejected';
  adminComment?: string;
}


interface Stats {
  totalUsers: number;
  totalMining: number;
  totalProfit: number;
  lastUpdated: string;
  [key: string]: any;
}



// Async Thunks
export const getUserBalance = createAsyncThunk(
  'balance/getUserBalance',
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/api/v1/balance/${userId}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch balance');
    }
  }
);

export const updateBalance = createAsyncThunk<
  BalanceUpdateResponse,
  UpdateBalancePayload,
  { state: RootState; rejectValue: string }
>(
  'balance/updateBalance',
  async (updateData, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post<BalanceUpdateResponse>(
        '/api/v1/balance/update',
        updateData
      );
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update balance');
    }
  }
);

export const processWithdrawal = createAsyncThunk<
  BalanceUpdateResponse,
  ProcessWithdrawalPayload,
  { state: RootState; rejectValue: string }
>(
  'balance/processWithdrawal',
  async (processData, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post<BalanceUpdateResponse>(
        '/api/v1/balance/process-withdrawal',
        processData
      );
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to process withdrawal');
    }
  }
);

export const getTransactions = createAsyncThunk(
  'balance/getTransactions',
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/api/v1/transactions/${userId}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch transactions');
    }
  }
);



export const getStats = createAsyncThunk(
  'balance/getStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get('/api/v1/stats');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch stats');
    }
  }
);




interface BalanceState {
  userBalance: BalanceWithMachines | null;
  lastTransaction: Transaction | null;
  transactions: Transaction[];
  loading: boolean;
  stats: Stats | null;
  error: string | null;
  pendingWithdrawals: Transaction[];
}

const initialState: BalanceState = {
  userBalance: null,
  lastTransaction: null,
  transactions: [],
  loading: false,
  stats: null,
  error: null,
  pendingWithdrawals: []
};

const balanceSlice = createSlice({
  name: 'balance',
  initialState,
  reducers: {
    clearBalanceError: (state) => {
      state.error = null;
    },
    clearLastTransaction: (state) => {
      state.lastTransaction = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(getUserBalance.pending, (state) => {
        state.loading = true;
      })
      .addCase(getUserBalance.fulfilled, (state, action) => {
        state.loading = false;
        state.userBalance = action.payload;
        state.error = null;
      })
      .addCase(getUserBalance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(updateBalance.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateBalance.fulfilled, (state, action) => {
        state.loading = false;
        state.lastTransaction = action.payload.transaction;
        if (state.userBalance) {
          state.userBalance = {
            ...state.userBalance,
            ...action.payload.balances
          };
        }
        if (action.payload.transaction.type === 'withdrawal' &&
          action.payload.transaction.status === 'pending') {
          state.pendingWithdrawals = [
            ...state.pendingWithdrawals,
            action.payload.transaction
          ];
        }
        state.error = null;
      })
      .addCase(updateBalance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(processWithdrawal.pending, (state) => {
        state.loading = true;
      })
      .addCase(processWithdrawal.fulfilled, (state, action) => {
        state.loading = false;
        state.lastTransaction = action.payload.transaction;
        if (state.userBalance) {
          state.userBalance = {
            ...state.userBalance,
            ...action.payload.balances
          };
        }
        state.pendingWithdrawals = state.pendingWithdrawals.filter(
          w => w._id !== action.payload.transaction._id
        );
        state.error = null;
      })
      .addCase(processWithdrawal.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(getStats.pending, (state) => {
        state.loading = true;
      })
      .addCase(getStats.fulfilled, (state, action) => {
        state.loading = false;
        state.stats = action.payload;
        state.error = null;
      })
      .addCase(getStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  }
});

export const { clearBalanceError, clearLastTransaction } = balanceSlice.actions;
export default balanceSlice.reducer;
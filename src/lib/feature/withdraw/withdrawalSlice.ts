// features/withdrawalSlice.ts

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '@/utils/axiosInstance';
import { RootState } from '@/lib/store/store';

import {
  WithdrawalState, Withdrawal,
  WithdrawalRequest,
  WithdrawalResponse,
  WithdrawalListResponse,
  WithdrawalStats,
  ProcessWithdrawalPayload,
  FetchAllWithdrawalsParams,
  BalanceHistoryParams,
  UserBalanceResponse,
  BalanceUpdateResponse,
  BalanceUpdateRequest
} from '@/types/withdrawals';



export const requestWithdrawal = createAsyncThunk<
  WithdrawalResponse,
  WithdrawalRequest,
  { state: RootState; rejectValue: string }
>(
  "withdrawal/request",
  async (withdrawalData, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const token = state.auth.token;

      const response = await axiosInstance.post<WithdrawalResponse>(
        "/api/v1/withdrawals/request",
        withdrawalData,
        {
          headers: token
            ? { Authorization: `Bearer ${token}` }
            : undefined,
        }
      );

      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error?.response?.data?.message || "Failed to request withdrawal"
      );
    }
  }
);

export const createWithdrawal = createAsyncThunk<
  WithdrawalResponse,              // expected success type
  { amount: number; walletNumber: string; walletType: string; walletName: string }, // request payload
  { rejectValue: string }          // error type
>(
  'withdrawal/create',
  async (withdrawalData, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post<WithdrawalResponse>(
        '/api/v1/withdrawals/create',
        withdrawalData
      );
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create withdrawal');
    }
  }
);


export const processWithdrawalRequest = createAsyncThunk<
  WithdrawalResponse,
  ProcessWithdrawalPayload,
  { rejectValue: string }
>(
  'withdrawal/process',
  async (processData, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post<WithdrawalResponse>(
        '/api/v1/withdrawals/process',
        processData
      );
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to process withdrawal');
    }
  }
);

export const fetchPendingWithdrawals = createAsyncThunk<
  WithdrawalListResponse,
  { page?: number; limit?: number },
  { rejectValue: string }
>(
  'withdrawal/fetchPending',
  async ({ page = 1, limit = 20 }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get<WithdrawalListResponse>(
        '/api/v1/withdrawals/pending',
        { params: { page, limit } }
      );
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch pending withdrawals');
    }
  }
);

export const fetchUserWithdrawals = createAsyncThunk<
  WithdrawalListResponse,
  { email: string; page?: number; limit?: number },
  { rejectValue: string }
>(
  'withdrawal/fetchUserWithdrawals',
  async ({ email, page = 1, limit = 10 }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get<WithdrawalListResponse>(
        `/api/v1/withdrawals/by-email`, // Change endpoint
        {
          params: {
            email,  // Pass email as query parameter
            page,
            limit
          }
        }
      );
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch user withdrawals');
    }
  }
);

export const fetchWithdrawalStats = createAsyncThunk<
  WithdrawalStats,
  void,
  { rejectValue: string }
>(
  'withdrawal/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get<WithdrawalStats>(
        '/api/v1/withdrawals/stats'
      );
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch withdrawal statistics');
    }
  }
);

export const fetchAllWithdrawals = createAsyncThunk<
  WithdrawalListResponse,
  FetchAllWithdrawalsParams,
  { rejectValue: string }
>(
  'withdrawal/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get<WithdrawalListResponse>(
        '/api/v1/withdrawals/all',
        { params }
      );
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch all withdrawals'
      );
    }
  }
);



// export const updateUserBalance = createAsyncThunk<
//   BalanceUpdateResponse,
//   BalanceUpdateRequest,
//   { rejectValue: string }
// >(
//   'balance/update',
//   async (balanceData, { rejectWithValue }) => {
//     try {
//       const response = await axiosInstance.post<BalanceUpdateResponse>(
//         '/api/v1/balanceUpade/update',
//         balanceData
//       );
//       return response.data;
//     } catch (error: any) {
//       return rejectWithValue(
//         error.response?.data?.message || 'Failed to update user balance'
//       );
//     }
//   }
// );

// export const getUserBalance = createAsyncThunk<
//   UserBalanceResponse,
//   string,  // userId
//   { rejectValue: string }
// >(
//   'balance/getUser',
//   async (userId, { rejectWithValue }) => {
//     try {
//       const response = await axiosInstance.get<UserBalanceResponse>(
//         `/api/v1/balanceUpade/${userId}`
//       );
//       return response.data;
//     } catch (error: any) {
//       return rejectWithValue(
//         error.response?.data?.message || 'Failed to fetch user balance'
//       );
//     }
//   }
// );

export const getBalanceHistory = createAsyncThunk<
  WithdrawalListResponse,  // Reusing the withdrawal list response type since structure is similar
  BalanceHistoryParams,
  { rejectValue: string }
>(
  'balance/history',
  async (params, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get<WithdrawalListResponse>(
        '/api/v1/balanceUpade/history',
        { params }
      );
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch balance history'
      );
    }
  }
);

const initialState: WithdrawalState = {
  withdrawals: [],
  pendingWithdrawals: [], // array
  allWithdrawals: [], // Add this line

  stats: null,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalWithdrawals: 0
  },
  isLoading: false,
  error: null
};

// Slice
const withdrawalSlice = createSlice({
  name: 'withdrawal',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    resetWithdrawalState: () => initialState
  },
  extraReducers: (builder) => {
    // Request Withdrawal
    builder.addCase(requestWithdrawal.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(requestWithdrawal.fulfilled, (state, action) => {
      state.isLoading = false;
      state.withdrawals.unshift(action.payload.transaction);
    });
    builder.addCase(requestWithdrawal.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload || 'Failed to request withdrawal';
    });

    // Process Withdrawal
    builder.addCase(processWithdrawalRequest.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(processWithdrawalRequest.fulfilled, (state, action) => {
      state.isLoading = false;
      // Update both withdrawals and pending withdrawals lists
      const updatedWithdrawal = action.payload.transaction;
      state.withdrawals = state.withdrawals.map(w =>
        w._id === updatedWithdrawal._id ? updatedWithdrawal : w
      );
      state.pendingWithdrawals = state.pendingWithdrawals.filter(w =>
        w._id !== updatedWithdrawal._id
      );
    });
    builder.addCase(processWithdrawalRequest.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload || 'Failed to process withdrawal';
    });

    // Fetch Pending Withdrawals
    builder.addCase(fetchPendingWithdrawals.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchPendingWithdrawals.fulfilled, (state, action) => {
      state.isLoading = false;
      state.pendingWithdrawals = action.payload.withdrawals;
      state.pagination = {
        currentPage: action.payload.currentPage,
        totalPages: action.payload.totalPages,
        totalWithdrawals: action.payload.totalWithdrawals
      };
    });
    builder.addCase(fetchPendingWithdrawals.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload || 'Failed to fetch pending withdrawals';
    });

    // Fetch User Withdrawals
    builder.addCase(fetchUserWithdrawals.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchUserWithdrawals.fulfilled, (state, action) => {
      state.isLoading = false;
      state.withdrawals = action.payload.withdrawals;
      state.pagination = {
        currentPage: action.payload.currentPage,
        totalPages: action.payload.totalPages,
        totalWithdrawals: action.payload.totalWithdrawals
      };
    });
    builder.addCase(fetchUserWithdrawals.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload || 'Failed to fetch user withdrawals';
    });

    // Fetch Withdrawal Stats
    builder.addCase(fetchWithdrawalStats.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchWithdrawalStats.fulfilled, (state, action) => {
      state.isLoading = false;
      state.stats = action.payload;
    });
    builder.addCase(fetchWithdrawalStats.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload || 'Failed to fetch withdrawal statistics';
    });
    builder.addCase(fetchAllWithdrawals.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });

    builder.addCase(fetchAllWithdrawals.fulfilled, (state, action) => {
      state.isLoading = false;
      state.allWithdrawals = action.payload.withdrawals; // Verify this matches the API response structure
      state.pagination = {
        currentPage: action.payload.currentPage,
        totalPages: action.payload.totalPages,
        totalWithdrawals: action.payload.totalWithdrawals
      };
    });

    builder.addCase(fetchAllWithdrawals.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload || 'Failed to fetch all withdrawals';
    });

    // Create Withdrawal
    builder.addCase(createWithdrawal.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(createWithdrawal.fulfilled, (state, action) => {
      state.isLoading = false;
      // Add new withdrawal to the list
      state.withdrawals.unshift(action.payload.transaction);
    });
    builder.addCase(createWithdrawal.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload || 'Failed to create withdrawal';
    });

  }
});

export const { clearError, resetWithdrawalState } = withdrawalSlice.actions;
export default withdrawalSlice.reducer;
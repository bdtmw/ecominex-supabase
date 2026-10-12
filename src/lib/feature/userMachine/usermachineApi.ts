import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axiosInstance from '@/utils/axiosInstance';


import { RootState } from '@/lib/store/store';
import { UpdateProfitPayload,UserMachine, 
    UserMachineState, 
    AssignMachinePayload, 
    ProfitUpdateStatus,
    UserProfitSummary,
    Transaction,
    WithdrawalPayload,
    TransactionResponse,
    WithdrawalResponse,
    PurchaseResponse,
    PurchaseMachinePayload,
    EligibilityResponse} from '@/types/userMachine';

// Async Thunks
export const assignMachineToUser = createAsyncThunk<
  UserMachine, 
  AssignMachinePayload, 
  { state: RootState, rejectValue: string }
>(
  'userMachine/assignMachine',
  async ({ userId, machineId }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post<UserMachine>('/api/v1/assign', { 
        userId, 
        machineId 
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to assign machine');
    }
  }
);
// In usermachineApi.ts

export const fetchUserMachines = createAsyncThunk<
  UserMachine[], 
  string,  // This can be either userId or email
  { state: RootState, rejectValue: string }
>(
  'userMachine/fetchUserMachines',
  async (userIdentifier, { rejectWithValue }) => {
    try {
      console.log('Fetching with identifier:', userIdentifier);
      const response = await axiosInstance.get<UserMachine[]>(`/api/v1/userMachine/${userIdentifier}`);
      console.log('Response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Full error:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch user machines');
    }
  }
);
export const updateMonthlyProfit = createAsyncThunk<
  UserMachine, 
  UpdateProfitPayload, 
  { state: RootState, rejectValue: string }
>(
  'userMachine/updateProfit',
  async ({ userMachineId, profitAmount }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.patch<UserMachine>(`/api/v1/profit/${userMachineId}`, { 
        profitAmount 
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update profit');
    }
  }
);

export const removeUserMachine = createAsyncThunk<
  string, 
  string, 
  { state: RootState, rejectValue: string }
>(
  'userMachine/removeMachine',
  async (userMachineId, { rejectWithValue }) => {
    try {
      await axiosInstance.delete(`/api/v1/${userMachineId}`);
      return userMachineId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to remove machine');
    }
  }
);

export const fetchAllUserMachines = createAsyncThunk<
  UserMachine[], 
  void, 
  { state: RootState, rejectValue: string }
>(
  'userMachine/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get<UserMachine[]>('/api/v1/admin/all');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch all user machines');
    }
  }
);

export const fetchProfitUpdateStatus = createAsyncThunk<
  ProfitUpdateStatus, 
  string, 
  { state: RootState, rejectValue: string }
>(
  'userMachine/fetchProfitUpdateStatus',
  async (userMachineId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get<ProfitUpdateStatus>(`/api/v1/profit/update-status/${userMachineId}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch profit update status');
    }
  }
);





export const fetchUserTotalProfit = createAsyncThunk<
  UserProfitSummary,
  string,
  { state: RootState; rejectValue: string }
>(
  'userMachine/fetchTotalProfit',
  async (userIdentifier, { rejectWithValue }) => {
    try {
      if (!userIdentifier || typeof userIdentifier !== 'string') {
        return rejectWithValue('Invalid user identifier');
      }

      // URL encode the identifier in case it's an email address
      const encodedIdentifier = encodeURIComponent(userIdentifier);
      const response = await axiosInstance.get<UserProfitSummary>(
        `/api/v1/total-profit/${encodedIdentifier}`
      );
      
      // Validate response data
      if (!response.data || typeof response.data.totalProfit === 'undefined') {
        return rejectWithValue('Invalid response data');
      }

      return response.data;
    } catch (error: any) {
      console.error('Total profit fetch error:', error);
      return rejectWithValue(
        error.response?.data?.message || 
        error.message || 
        'Failed to fetch total profit'
      );
    }
  }
);




// Admin Transactions Thunk
export const fetchAdminTransactions = createAsyncThunk<
  TransactionResponse,
  { page?: number; limit?: number; sortBy?: string; order?: 'asc' | 'desc' },
  { state: RootState; rejectValue: string }
>(
  'userMachine/fetchAdminTransactions',
  async ({ page = 1, limit = 20, sortBy = 'transactionDate', order = 'desc' }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get<TransactionResponse>(
        '/api/v1/admin/transactions',
        { params: { page, limit, sortBy, order } }
      );
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch admin transactions');
    }
  }
);

// Process Withdrawal Thunk
export const processWithdrawal = createAsyncThunk<
  WithdrawalResponse,
  WithdrawalPayload,
  { state: RootState; rejectValue: string }
>(
  'userMachine/processWithdrawal',
  async (withdrawalData, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post<WithdrawalResponse>(
        '/api/v1/withdrawal', 
        withdrawalData
      );
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to process withdrawal';
      return rejectWithValue(errorMessage);
    }
  }
);



export const fetchUserTransactions = createAsyncThunk<
  TransactionResponse,
  { userIdentifier: string; page?: number; limit?: number },
  { state: RootState; rejectValue: string }
>(
  'userMachine/fetchTransactions',
  async ({ userIdentifier, page = 1, limit = 10 }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get<TransactionResponse>(
        `/api/v1/transactions/${userIdentifier}`,
        { params: { page, limit } }
      );
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch transactions');
    }
  }
);





// Check purchase eligibility thunk
export const checkPurchaseEligibility = createAsyncThunk<
  EligibilityResponse,
  PurchaseMachinePayload,
  { state: RootState; rejectValue: string }
>(
  'userMachine/checkEligibility',
  async ({ userId, machineId, quantity = 1 }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get<EligibilityResponse>('/api/v1/check-eligibility', {
        params: {
          userId,
          machineId,
          quantity
        }
      });
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to check purchase eligibility';
      return rejectWithValue(errorMessage);
    }
  }

)

// Initial State
const initialState: UserMachineState = {
  userMachines: [],
  allUserMachines: [],
  transactionData: {
    transactions: [],
    totalPages: 1,
    currentPage: 1,
    totalTransactions: 0
  },
  userProfit: null,
  isLoading: false,
  error: null
};


// Slice
const userMachineSlice = createSlice({
  name: 'userMachine',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    // Assign Machine
    builder.addCase(assignMachineToUser.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(assignMachineToUser.fulfilled, (state, action) => {
      state.isLoading = false;
      state.userMachines.push(action.payload);
    });
    builder.addCase(assignMachineToUser.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload || 'Failed to assign machine';
    });

    // Fetch User Machines
    builder.addCase(fetchUserMachines.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchUserMachines.fulfilled, (state, action) => {
      state.isLoading = false;
      state.userMachines = action.payload;
    });
    builder.addCase(fetchUserMachines.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload || 'Failed to fetch user machines';
    });

    // Fetch All User Machines
    builder.addCase(fetchAllUserMachines.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchAllUserMachines.fulfilled, (state, action) => {
      state.isLoading = false;
      state.allUserMachines = action.payload;
    });
    builder.addCase(fetchAllUserMachines.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload || 'Failed to fetch all user machines';
    });

    // Update Monthly Profit
    builder.addCase(updateMonthlyProfit.fulfilled, (state, action) => {
      const index = state.userMachines.findIndex(
        (um) => um._id === action.payload._id
      );
      if (index !== -1) {
        state.userMachines[index] = action.payload;
      }
    });

    // Remove User Machine
    builder.addCase(removeUserMachine.fulfilled, (state, action) => {
      state.userMachines = state.userMachines.filter(
        (um) => um._id !== action.payload
      );
    });
    builder.addCase(processWithdrawal.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
 
    builder.addCase(processWithdrawal.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload || 'Failed to process withdrawal';
    });

    // Fetch User Transactions
    builder.addCase(fetchUserTransactions.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchUserTransactions.fulfilled, (state, action) => {
      state.isLoading = false;
      state.transactionData = action.payload;  // Assuming action.payload has the correct shape
    });
    builder.addCase(fetchUserTransactions.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload || 'Failed to fetch transactions';
    });

    // Fetch User Total Profit
    builder.addCase(fetchUserTotalProfit.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchUserTotalProfit.fulfilled, (state, action) => {
      state.isLoading = false;
      state.userProfit = action.payload;
    });
    builder.addCase(fetchUserTotalProfit.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload || 'Failed to fetch total profit';
    });
    builder.addCase(fetchAdminTransactions.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchAdminTransactions.fulfilled, (state, action) => {
      state.isLoading = false;
      state.transactionData = {
        transactions: action.payload.transactions,
        totalPages: action.payload.totalPages,
        currentPage: action.payload.currentPage,
        totalTransactions: action.payload.totalTransactions
      };
    });
    builder.addCase(fetchAdminTransactions.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload || 'Failed to fetch admin transactions';
    });
  }
});

export const { clearError } = userMachineSlice.actions;
export default userMachineSlice.reducer;
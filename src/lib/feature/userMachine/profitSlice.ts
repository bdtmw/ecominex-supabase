  // src/lib/features/profit/profitSlice.ts
  import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
  import axiosInstance from '@/utils/axiosInstance';
  import { RootState } from '@/lib/store/store';
  import { 
    UpdateProfitPayload,
    UserMachine,
    ProfitUpdateStatus,
    UserProfitSummary, 
    ProfitPercentageResponse
  } from '@/types/userMachine';

  // Async Thunks
  export const updateMonthlyProfit = createAsyncThunk<
    UserMachine, 
    UpdateProfitPayload, 
    { state: RootState, rejectValue: string }
  >(
    'profit/updateProfit',
    async ({ userMachineId, profitAmount }, { rejectWithValue }) => {
      try {
        const response = await axiosInstance.patch<UserMachine>(
          `/api/v1/profit/${userMachineId}`, 
          { profitAmount }
        );
        return response.data;
      } catch (error: any) {
        return rejectWithValue(error.response?.data?.message || 'Failed to update profit');
      }
    }
  );

  export const getProfitUpdateStatus = createAsyncThunk<
    ProfitUpdateStatus, 
    string, 
    { state: RootState, rejectValue: string }
  >(
    'profit/getProfitUpdateStatus',
    async (userMachineId, { rejectWithValue }) => {
      try {
        const response = await axiosInstance.get<ProfitUpdateStatus>(
          `/api/v1/profit/status/${userMachineId}`
        );
        return response.data;
      } catch (error: any) {
        return rejectWithValue(error.response?.data?.message || 'Failed to fetch profit update status');
      }
    }
  );

  export const manualProfitUpdate = createAsyncThunk<
    UserMachine,
    UpdateProfitPayload,
    { state: RootState, rejectValue: string }
  >(
    'profit/manualUpdate',
    async ({ userMachineId, profitAmount }, { rejectWithValue }) => {
      try {
        const response = await axiosInstance.patch<UserMachine>(
          `/api/v1/profit/manual/${userMachineId}`,
          { profitAmount }
        );
        return response.data;
      } catch (error: any) {
        return rejectWithValue(error.response?.data?.message || 'Failed to update profit manually');
      }
    }
  );

  export const fetchUserTotalProfit = createAsyncThunk<
    UserProfitSummary,
    string,
    { state: RootState, rejectValue: string }
  >(
    'profit/fetchTotalProfit',
    async (userIdentifier, { rejectWithValue }) => {
      try {
        const encodedIdentifier = encodeURIComponent(userIdentifier);
        const response = await axiosInstance.get<UserProfitSummary>(
          `/api/v1/total-profit/${encodedIdentifier}`
        );
        return response.data;
      } catch (error: any) {
        return rejectWithValue(error.response?.data?.message || 'Failed to fetch total profit');
      }
    }
  );

  export const fetchProfitPercentages = createAsyncThunk<
    ProfitPercentageResponse,
    string,
    { state: RootState, rejectValue: string }
  >(
    'profit/fetchPercentages',
    async (userId, { rejectWithValue }) => {
      try {
        const response = await axiosInstance.get<ProfitPercentageResponse>(
          `/api/v1/profit/percentages/${userId}`
        );
        return response.data;
      } catch (error: any) {
        return rejectWithValue(
          error.response?.data?.message || 'Failed to fetch profit percentages'
        );
      }
    }
  );
  export interface Referral {
    firstName: string;
    lastName: string;
    email: string;
    createdAt: string;
    deposit_count: number;
    discount: string;
    referralStatus: "active" | "inactive" | string; 

  }

  // update async thunk to match API
  export const getReferralById = createAsyncThunk<
    Referral[], // array
    string,       
    { state: RootState, rejectValue: string }
  >(
    'referrals/getReferralById',
    async (id, { rejectWithValue }) => {
      try {
        const response = await axiosInstance.get<{ success: boolean; total: number; users: Referral[] }>(
          `/api/v1/referrals/${id}`
        );
        return response.data.users;
      } catch (error: any) {
        return rejectWithValue(error.response?.data?.message || 'Failed to fetch referral');
      }
    }
  );

  interface ReferralState {
    referralData: Referral[];
    loading: boolean;
    error: string | null;
  }

  interface ProfitState {
    profitUpdates: Record<string, ProfitUpdateStatus>;
    totalProfit: UserProfitSummary | null;
    loading: boolean;
    error: string | null;
    profitPercentages: ProfitPercentageResponse | null; // Add this
    referrals: ReferralState;

  }


  const initialState: ProfitState = {
    profitUpdates: {},
    totalProfit: null,
    loading: false,
    error: null,
    profitPercentages: null,
    referrals: {
    referralData: [], 
      loading: false,
      error: null,
    },
  };



  const profitSlice = createSlice({
    name: 'profit',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
      builder
        // updateMonthlyProfit
        .addCase(updateMonthlyProfit.pending, (state) => {
          state.loading = true;
        })
        .addCase(updateMonthlyProfit.fulfilled, (state) => {
          state.loading = false;
          state.error = null;
        })
        .addCase(updateMonthlyProfit.rejected, (state, action) => {
          state.loading = false;
          state.error = action.payload || 'Failed to update profit';
        })
        // getProfitUpdateStatus
        .addCase(getProfitUpdateStatus.fulfilled, (state, action) => {
          state.profitUpdates[action.meta.arg] = action.payload;
          state.error = null;
        })
        // manualProfitUpdate
        .addCase(manualProfitUpdate.pending, (state) => {
          state.loading = true;
        })
        .addCase(manualProfitUpdate.fulfilled, (state) => {
          state.loading = false;
          state.error = null;
        })
        .addCase(manualProfitUpdate.rejected, (state, action) => {
          state.loading = false;
          state.error = action.payload || 'Failed to update profit manually';
        })
        // fetchUserTotalProfit
        .addCase(fetchUserTotalProfit.pending, (state) => {
          state.loading = true;
        })
        .addCase(fetchUserTotalProfit.fulfilled, (state, action) => {
          state.loading = false;
          state.totalProfit = action.payload;
          state.error = null;
        })
        .addCase(fetchUserTotalProfit.rejected, (state, action) => {
          state.loading = false;
          state.error = action.payload || 'Failed to fetch total profit';
        })
        .addCase(fetchProfitPercentages.pending, (state) => {
          state.loading = true;
        })
        .addCase(fetchProfitPercentages.fulfilled, (state, action) => {
          state.loading = false;
          state.profitPercentages = action.payload;
          state.error = null;
        })
        .addCase(fetchProfitPercentages.rejected, (state, action) => {
          state.loading = false;
          state.error = action.payload || 'Failed to fetch profit percentages';
        })

        .addCase(getReferralById.pending, (state) => {
          state.referrals.loading = true;
          state.referrals.error = null;
          state.referrals.referralData = [];
        })
        .addCase(getReferralById.fulfilled, (state, action) => {
          state.referrals.loading = false;
          state.referrals.referralData = action.payload;
          state.referrals.error = null;
        })
        .addCase(getReferralById.rejected, (state, action) => {
          state.referrals.loading = false;
          state.referrals.error = action.payload || 'Failed to fetch referral';
          state.referrals.referralData = [];
        })
    },
  });

  export default profitSlice.reducer;
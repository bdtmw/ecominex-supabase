import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '@/utils/axiosInstance';
import { RootState } from '@/lib/store/store';

export interface ShareMachine {
  _id: string;
  machineName: string;
  sharePrice: number;
  totalShares: number;
  availableShares: number;
  profitPerShare: number;
  hashrate: string;
  powerConsumption: number;
  description: string;
  images: string[];
  isShareBased: boolean;
  priceRange: number;
  coinsMined: string;
  monthlyProfit: number;
  soldShares: number;  
  totalProfitEarned: number;

}

export interface UserShare {
  id: string;
  machineName: string;
  numberOfShares: number;
  pricePerShare: number;
  profitPerShare: number;
  totalInvestment: number;
  expectedMonthlyProfit: number;
  purchaseDate: string;
  lastProfitUpdate: string;
  nextProfitUpdate: string;
  totalProfitEarned?: number;
}

interface SharePurchasePayload {
  userId: string;
  numberOfShares: number;
}

interface ShareSalePayload {
  numberOfSharesToSell: number;
}

export interface ShareSummary {
  shares: UserShare[];
  summary: {
    totalShares: number;
    totalInvestment: number;
    expectedMonthlyProfit: number;
    totalProfitEarned: number;
  };
}

interface PurchaseResponse {
  success: boolean;
  message: string;
  data: {
    purchase: any;
    transaction: any;
    newBalance: number;
    expectedMonthlyProfit: number;
  }
}

interface SaleResponse {
  success: boolean;
  message: string;
  data: {
    sale: {
      originalValue: number;
      deduction: number;
      sellingPrice: number;
      soldShares: number;
      remainingShares: number;
      machineDetails: {
        name: string;
        id: string;
      }
    };
    transaction: any;
    newBalance: {
      total: number;
      main: number;
      mining: number;
    }
  }
}

// Existing Async Thunks
export const getSpecialShareMachine = createAsyncThunk<
  { success: boolean; data: ShareMachine },
  void, 
  { state: RootState; rejectValue: string }
>('shareMachine/getSpecialMachine', async (_, { rejectWithValue }) => {
  try {
    const response = await axiosInstance.get('/api/v1/special-machine');
    return response.data;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Failed to fetch special share machine');
  }
});

export const getUserShareDetails = createAsyncThunk<
  { success: boolean; data: ShareSummary },
  string,
  { state: RootState; rejectValue: string }
>('shareMachine/getUserShareDetails', async (userId, { rejectWithValue }) => {
  try {
    const response = await axiosInstance.get(`/api/v1/user-shares/${userId}`);
    return response.data;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Failed to fetch user shares');
  }
});

export const purchaseSpecialShares = createAsyncThunk<
  PurchaseResponse,
  SharePurchasePayload,
  { state: RootState; rejectValue: string }
>('shareMachine/purchaseShares', async (purchaseData, { rejectWithValue }) => {
  try {
    const response = await axiosInstance.post('/api/v1/purchase', purchaseData);
    return response.data;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Failed to purchase shares');
  }
});

export const updateAllShareProfits = createAsyncThunk<
  { success: boolean; message: string; updatedCount: number; updates: any[] },
  void,
  { state: RootState; rejectValue: string }
>('shareMachine/updateAllProfits', async (_, { rejectWithValue }) => {
  try {
    const response = await axiosInstance.post('/api/v1/update-profits');
    return response.data;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Failed to update share profits');
  }
});

// New Async Thunk for selling shares
export const sellSharePurchase = createAsyncThunk<
  SaleResponse,
  { sharePurchaseId: string; payload: ShareSalePayload },
  { state: RootState; rejectValue: string }
>('shareMachine/sellShares', async ({ sharePurchaseId, payload }, { rejectWithValue }) => {
  try {
    const response = await axiosInstance.post(`/api/v1/sell/${sharePurchaseId}`, payload);
    return response.data;
  } catch (error: any) {
    return rejectWithValue(
      error.response?.data?.message || 'Failed to sell shares'
    );
  }
});

// State interface
interface ShareMachineState {
  specialMachine: ShareMachine | null;
  userShares: {
    shares: UserShare[];
    summary: {
      totalShares: number;
      totalInvestment: number;
      expectedMonthlyProfit: number;
    } | null;
  };
  loading: boolean;
  error: string | null;
  purchaseSuccess: boolean;
  saleSuccess: boolean;
  updateSuccess: boolean;
}

const initialState: ShareMachineState = {
  specialMachine: null,
  userShares: {
    shares: [],
    summary: null
  },
  loading: false,
  error: null,
  purchaseSuccess: false,
  saleSuccess: false,
  updateSuccess: false
};

// Create the slice
const shareMachineSlice = createSlice({
  name: 'shareMachine',
  initialState,
  reducers: {
    resetShareMachineState: (state) => {
      state.error = null;
      state.purchaseSuccess = false;
      state.saleSuccess = false;
      state.updateSuccess = false;
    }
  },
  extraReducers: (builder) => {
    builder
      // getSpecialShareMachine
      .addCase(getSpecialShareMachine.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getSpecialShareMachine.fulfilled, (state, action) => {
        state.loading = false;
        state.specialMachine = action.payload.data;
      })
      .addCase(getSpecialShareMachine.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // getUserShareDetails
      .addCase(getUserShareDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getUserShareDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.userShares = action.payload.data;
      })
      .addCase(getUserShareDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // purchaseSpecialShares
      .addCase(purchaseSpecialShares.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.purchaseSuccess = false;
      })
      .addCase(purchaseSpecialShares.fulfilled, (state) => {
        state.loading = false;
        state.purchaseSuccess = true;
      })
      .addCase(purchaseSpecialShares.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.purchaseSuccess = false;
      })
      
      // updateAllShareProfits
      .addCase(updateAllShareProfits.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.updateSuccess = false;
      })
      .addCase(updateAllShareProfits.fulfilled, (state) => {
        state.loading = false;
        state.updateSuccess = true;
      })
      .addCase(updateAllShareProfits.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.updateSuccess = false;
      })
      
      // sellSharePurchase (new)
      .addCase(sellSharePurchase.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.saleSuccess = false;
      })
      .addCase(sellSharePurchase.fulfilled, (state) => {
        state.loading = false;
        state.saleSuccess = true;
      })
      .addCase(sellSharePurchase.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.saleSuccess = false;
      });
  }
});

export const { resetShareMachineState } = shareMachineSlice.actions;
export default shareMachineSlice.reducer;
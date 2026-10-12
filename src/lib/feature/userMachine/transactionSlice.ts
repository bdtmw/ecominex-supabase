// src/lib/features/userMachine/transactionSlice.ts
// @ts-nocheck

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "@/utils/axiosInstance";
import { RootState } from "@/lib/store/store";
import {
  Transaction,
  WithdrawalPayload,
  TransactionResponse,
  WithdrawalResponse,
  PurchaseResponse,
  PurchaseMachinePayload,
  EligibilityResponse,
  SaleResponse,
} from "@/types/userMachine";

// Purchase and Eligibility Thunks
export const purchaseAndAssignMachine = createAsyncThunk<
  PurchaseResponse,
  {
    userId: string;
    machineId: string;
    quantity?: number;
    machineDetails?: any; // Optional full machine details
  },
  { state: RootState; rejectValue: string }
>(
  "transaction/purchaseAndAssign",
  async (
    { userId, machineId, quantity = 1, machineDetails },
    { rejectWithValue },
  ) => {
    try {
      const response = await axiosInstance.post<PurchaseResponse>(
        "/api/v1/purchaseMAchine",
        {
          userId,
          machineId,
          quantity,
          machineDetails, // Pass additional details if available
          type: "MACHINE_PURCHASE",
          status: "completed",
        },
      );
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to purchase machine",
      );
    }
  },
);
export const checkPurchaseEligibility = createAsyncThunk<
  EligibilityResponse,
  PurchaseMachinePayload,
  { state: RootState; rejectValue: string }
>(
  "transaction/checkEligibility",
  async ({ userId, machineId, quantity = 1 }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get<EligibilityResponse>(
        "/api/v1/check-eligibility",
        {
          params: { userId, machineId, quantity },
        },
      );
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to check purchase eligibility",
      );
    }
  },
);

// Sale Related Thunks
export const sellUserMachine = createAsyncThunk<
  SaleResponse,
  string,
  { state: RootState; rejectValue: string }
>("transaction/sellMachine", async (userMachineId, { rejectWithValue }) => {
  try {
    const response = await axiosInstance.post<SaleResponse>(
      `/api/v1/sell-machine/${userMachineId}`,
    );
    return response.data;
  } catch (error: any) {
    return rejectWithValue(
      error.response?.data?.message || "Failed to sell machine",
    );
  }
});

export const getSaleHistory = createAsyncThunk<
  Transaction[],
  string,
  { state: RootState; rejectValue: string }
>("transaction/getSaleHistory", async (userId, { rejectWithValue }) => {
  try {
    const response = await axiosInstance.get<{ sales: Transaction[] }>(
      `/api/v1/sales-history/${userId}`,
    );
    return response.data.sales;
  } catch (error: any) {
    return rejectWithValue(
      error.response?.data?.message || "Failed to fetch sale history",
    );
  }
});

// Transaction History Thunks
export const fetchUserTransactions = createAsyncThunk<
  TransactionResponse,
  { userIdentifier: string; page?: number; limit?: number },
  { state: RootState; rejectValue: string }
>(
  "transaction/fetchUserTransactions",
  async ({ userIdentifier, page = 1, limit = 10 }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get<TransactionResponse>(
        `/api/v1/transactions/${userIdentifier}`,
        { params: { page, limit } },
      );
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch transactions",
      );
    }
  },
);

export const fetchAdminTransactions = createAsyncThunk<
  TransactionResponse,
  { page?: number; limit?: number; sortBy?: string; order?: "asc" | "desc" },
  { state: RootState; rejectValue: string }
>(
  "transaction/fetchAdminTransactions",
  async (
    { page = 1, limit = 20, sortBy = "transactionDate", order = "desc" },
    { rejectWithValue },
  ) => {
    try {
      const response = await axiosInstance.get<TransactionResponse>(
        "/api/v1/admin/transactions",
        { params: { page, limit, sortBy, order } },
      );
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch admin transactions",
      );
    }
  },
);

// Withdrawal Thunk
export const processWithdrawal = createAsyncThunk<
  WithdrawalResponse,
  WithdrawalPayload,
  { state: RootState; rejectValue: string }
>(
  "transaction/processWithdrawal",
  async (withdrawalData, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post<WithdrawalResponse>(
        "/api/v1/withdrawal",
        withdrawalData,
      );
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to process withdrawal",
      );
    }
  },
);

interface TransactionState {
  transactions: Transaction[];
  adminTransactions: Transaction[];
  saleHistory: Transaction[];
  purchaseEligibility: EligibilityResponse | null;
  lastPurchase: PurchaseResponse | null;
  lastSale: SaleResponse | null;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
  };
  loading: boolean;
  error: string | null;
}

const initialState: TransactionState = {
  transactions: [],
  adminTransactions: [],
  saleHistory: [],
  purchaseEligibility: null,
  lastPurchase: null,
  lastSale: null,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
  },
  loading: false,
  error: null,
};

const transactionSlice = createSlice({
  name: "transaction",
  initialState,
  reducers: {
    clearTransactionError: (state) => {
      state.error = null;
    },
    clearPurchaseHistory: (state) => {
      state.lastPurchase = null;
    },
    clearSaleHistory: (state) => {
      state.lastSale = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Purchase and Assign
      .addCase(purchaseAndAssignMachine.pending, (state) => {
        state.loading = true;
      })
      .addCase(purchaseAndAssignMachine.fulfilled, (state, action) => {
        state.loading = false;
        state.lastPurchase = action.payload;
        state.error = null;
      })
      .addCase(purchaseAndAssignMachine.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Purchase failed";
      })
      // Check Eligibility
      .addCase(checkPurchaseEligibility.fulfilled, (state, action) => {
        state.purchaseEligibility = action.payload;
        state.error = null;
      })
      // Sell Machine
      .addCase(sellUserMachine.pending, (state) => {
        state.loading = true;
      })
      .addCase(sellUserMachine.fulfilled, (state, action) => {
        state.loading = false;
        state.lastSale = action.payload;
        state.error = null;
      })
      .addCase(sellUserMachine.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Sale failed";
      })
      // Sale History
      .addCase(getSaleHistory.fulfilled, (state, action) => {
        state.saleHistory = action.payload;
        state.error = null;
      })
      // User Transactions
      .addCase(fetchUserTransactions.fulfilled, (state, action) => {
        state.transactions = action.payload.transactions;
        state.pagination = {
          currentPage: action.payload.currentPage,
          totalPages: action.payload.totalPages,
          totalItems: action.payload.totalItems,
        };
        state.error = null;
      })
      // Admin Transactions
      .addCase(fetchAdminTransactions.fulfilled, (state, action) => {
        state.adminTransactions = action.payload.transactions;
        state.pagination = {
          currentPage: action.payload.currentPage,
          totalPages: action.payload.totalPages,
          totalItems: action.payload.totalItems,
        };
        state.error = null;
      });
  },
});

export const { clearTransactionError, clearPurchaseHistory, clearSaleHistory } =
  transactionSlice.actions;

export default transactionSlice.reducer;

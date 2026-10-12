// lib/feature/deposit/depositSlice.ts
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "@/utils/axiosInstance";

interface DepositPayload {
  userId: string;
  amount: string;
  transactionId: string;
  attachment: File;
  accountType: string;
  token: string; // for Bearer token
}

interface DepositState {
  deposits: any[];
  isLoading: boolean;
  error: string | null;
}

const initialState: DepositState = {
  deposits: [],
  isLoading: false,
  error: null,
};

// Deposit Request API
export const requestDeposit = createAsyncThunk<
  any,
  DepositPayload,
  { rejectValue: string }
>("deposit/request", async (data, { rejectWithValue }) => {
  try {
    const formData = new FormData();
    formData.append("userId", data.userId);
    formData.append("amount", data.amount);
    formData.append("transactionId", data.transactionId);
    formData.append("attachment", data.attachment); // direct file
    formData.append("accounttype", data.accountType);

    const response = await axiosInstance.post("/api/v1/deposit", formData, {
      headers: {
        Authorization: `Bearer ${data.token}`,
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || "Deposit failed");
  }
});

const depositSlice = createSlice({
  name: "deposit",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(requestDeposit.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(requestDeposit.fulfilled, (state, action) => {
        state.isLoading = false;
        state.deposits.unshift(action.payload);
      })
      .addCase(requestDeposit.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to deposit";
      });
  },
});

export default depositSlice.reducer;

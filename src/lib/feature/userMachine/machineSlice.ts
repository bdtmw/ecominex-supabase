// src/lib/features/machine/machineSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '@/utils/axiosInstance';
import { RootState } from '@/lib/store/store';
import { 
  UserMachine, 
  AssignMachinePayload
} from '@/types/userMachine';

// Async Thunks
export const assignMachineToUser = createAsyncThunk<
  UserMachine, 
  AssignMachinePayload, 
  { state: RootState, rejectValue: string }
>(
  'machine/assignMachine',
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

export const getUserMachines = createAsyncThunk<
  UserMachine[], 
  string,
  { state: RootState, rejectValue: string }
>(
  'machine/fetchUserMachines',
  async (userIdentifier, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get<UserMachine[]>(`/api/v1/userMachine/${userIdentifier}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch user machines');
    }
  }
);

export const getAllUserMachines = createAsyncThunk<
  UserMachine[], 
  void, 
  { state: RootState, rejectValue: string }
>(
  'machine/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get<UserMachine[]>('/api/v1/admin/all');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch all user machines');
    }
  }
);

export const removeUserMachine = createAsyncThunk<
  string, 
  string, 
  { state: RootState, rejectValue: string }
>(
  'machine/removeMachine',
  async (userMachineId, { rejectWithValue }) => {
    try {
      await axiosInstance.delete(`/api/v1/${userMachineId}`);
      return userMachineId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to remove machine');
    }
  }
);

interface MachineState {
  userMachines: UserMachine[];
  allMachines: UserMachine[];
  loading: boolean;
  error: string | null;
}

const initialState: MachineState = {
  userMachines: [],
  allMachines: [],
  loading: false,
  error: null
};

const machineSlice = createSlice({
  name: 'machine',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // assignMachineToUser
      .addCase(assignMachineToUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(assignMachineToUser.fulfilled, (state, action) => {
        state.loading = false;
        state.userMachines.push(action.payload);
        state.error = null;
      })
      .addCase(assignMachineToUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to assign machine';
      })
      // getUserMachines
      .addCase(getUserMachines.pending, (state) => {
        state.loading = true;
      })
      .addCase(getUserMachines.fulfilled, (state, action) => {
        state.loading = false;
        state.userMachines = action.payload;
        state.error = null;
      })
      .addCase(getUserMachines.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch user machines';
      })
      // getAllUserMachines
      .addCase(getAllUserMachines.pending, (state) => {
        state.loading = true;
      })
      .addCase(getAllUserMachines.fulfilled, (state, action) => {
        state.loading = false;
        state.allMachines = action.payload;
        state.error = null;
      })
      .addCase(getAllUserMachines.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch all machines';
      })
      // removeUserMachine
      .addCase(removeUserMachine.pending, (state) => {
        state.loading = true;
      })
      .addCase(removeUserMachine.fulfilled, (state, action) => {
        state.loading = false;
        state.userMachines = state.userMachines.filter(
          machine => machine._id !== action.payload
        );
        state.error = null;
      })
      .addCase(removeUserMachine.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to remove machine';
      });
  },
});

export default machineSlice.reducer;
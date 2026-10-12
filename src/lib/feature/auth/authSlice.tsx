import { AuthResponse, AuthState, User } from '@/types/user';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  token: null
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
    },
    
    logout: (state) => {
      // Complete state reset
      state.user = null;
      state.isAuthenticated = false;
      state.token = null;
      state.isLoading = false;
    },
    
    setCredentials: (state, action: PayloadAction<AuthResponse>) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
    },

    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    }
  },
});

export const { setUser, logout, setCredentials, setLoading } = authSlice.actions;
export default authSlice.reducer;
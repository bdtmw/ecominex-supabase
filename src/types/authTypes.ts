export interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'user' | 'admin';
  referralCode?: string;

}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string;

}
export interface AuthResponse {
  user: User;
  token: string;
}
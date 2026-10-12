import { baseApiSlice } from '../../store/apiSlice';
import {
  AuthResponse,
  LoginCredentials,
  ReferralResponse,
  RegisterCredentials,
  User,
  VerifyOtp,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
  LoginResponseBase,
  ResendOtp,
  ResendOtpResponse,
  Toggle2FARequest,
  Toggle2FAResponse,
  ResendLoginOtpRequest,
  ResendLoginOtpResponse,
} from '../../../types/user';



export const authApiSlice = baseApiSlice.injectEndpoints({
  endpoints: (builder) => ({

resendLoginOtp: builder.mutation<ResendLoginOtpResponse, ResendLoginOtpRequest>({
  query: (body) => ({
    url: "api/v1/resend-login-otp",
    method: "POST",
    body,
  }),
}),

    register: builder.mutation<AuthResponse, RegisterCredentials>({
      query: (credentials) => ({
        url: 'api/v1/register',
        method: 'POST',
        body: credentials,
        credentials: 'include',
      }),
      invalidatesTags: ['User'],
    }),

    // authThunk.ts
verifyLoginOtp: builder.mutation<
  { success: boolean; user: any; token: string },
  { userId: string; otp: string }
>({
  query: (body) => ({
    url: "api/v1/verify-login-otp",
    method: "POST",
    body,
  }),
}),

resendOtp: builder.mutation<ResendOtpResponse, ResendOtp>({
  query: (body) => ({
    url: 'api/v1/resend-otp',
    method: 'POST',
    body,
  }),
}),


    verifyotp: builder.mutation<AuthResponse, VerifyOtp>({
      query: (credentials) => ({
        url: 'api/v1/verify-otp',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['User'],
    }),

login: builder.mutation<LoginResponseBase, LoginCredentials>({
  query: (credentials) => ({
    url: 'api/v1/login',
    method: 'POST',
    body: credentials,
    credentials: 'include',
  }),
  invalidatesTags: ['User'],
}),

    logout: builder.mutation<{ message: string }, void>({
      query: () => ({
        url: 'api/v1/logout',
        method: 'POST',
        credentials: 'include',
      }),
      invalidatesTags: ['User'],
    }),

    getCurrentUser: builder.query<User, void>({
      query: () => ({
        url: 'api/v1/me',
        method: 'GET',
        credentials: 'include',
      }),
      providesTags: ['User'],
    }),

    updateProfile: builder.mutation<User, Partial<User>>({
      query: (updates) => ({
        url: 'api/v1/profile/update',
        method: 'PUT',
        body: updates,
        credentials: 'include',
      }),
      invalidatesTags: ['User'],
    }),

    verifyPassword: builder.mutation<{ message: string }, { password: string }>({
      query: (data) => ({
        url: 'api/v1/verify-password',
        method: 'POST',
        body: data,
        credentials: 'include',
      }),
    }),

    referrals: builder.query<ReferralResponse, string>({
      query: (id) => ({
        url: `api/v1/referrals/${id}`,
        method: 'GET',
        credentials: 'include',
      }),
      providesTags: ['User'],
    }),


    // ------------------------------------------------------
    // ⭐ ADDED NEW API 1: Change Password
    // ------------------------------------------------------
    changePassword: builder.mutation<
      { message: string },
      ChangePasswordRequest
    >({
      query: (data) => ({
        url: 'api/v1/change-password',
        method: 'POST',
        body: data,
        credentials: 'include',
      }),
    }),

    // ------------------------------------------------------
    // ⭐ ADDED NEW API 2: Forgot Password (send email)
    // ------------------------------------------------------
    forgotPassword: builder.mutation<
      { message: string },
      ForgotPasswordRequest
    >({
      query: (data) => ({
        url: 'api/v1/forget-password',
        method: 'POST',
        body: data,
      }),
    }),

    // ------------------------------------------------------
    // ⭐ ADDED NEW API 3: Reset Password (token + new pass)
    // ------------------------------------------------------
    resetPassword: builder.mutation<
      { message: string },
      { token: string; Password: string }
    >({
      query: (data) => ({
        url: `api/v1/reset-password/${data.token}`,
        method: "POST",
        body: { password: data.Password },
      }),
    }),

 toggle2fa: builder.mutation<Toggle2FAResponse, Toggle2FARequest>({
  query: (body) => ({
    url: "api/v1/settings/2fa", // your backend route
    method: "PATCH",
    body,                       // { userId, enabled }
    credentials: "include",
  }),
  invalidatesTags: ["User"],
}),
    

  }),
});

export const {
  useRegisterMutation,
  useLoginMutation,
  useLogoutMutation,
  useGetCurrentUserQuery,
  useUpdateProfileMutation,
  useVerifyPasswordMutation,
  useVerifyotpMutation,
  useReferralsQuery,
  useChangePasswordMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useResendOtpMutation,
  useVerifyLoginOtpMutation,
  useToggle2faMutation,
  useResendLoginOtpMutation,
} = authApiSlice;

// apiSlice.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { getStoredToken } from '@/utils/authHeader';

// '/' (not '') so 'api/v1/..' resolves from the site root instead of the current page path
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/';

export const baseApiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    credentials: 'include',
    prepareHeaders: (headers) => {
      headers.set('Accept', 'application/json');
      const token = getStoredToken();
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  endpoints: () => ({}),
  tagTypes: ['User'],
});

// In your auth API slice:

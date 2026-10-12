import { Machine } from '@/types/machine';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { getStoredToken } from '@/utils/authHeader';

export const miningMachinesApiSlice = createApi({
  reducerPath: 'miningMachinesApi',
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_URL || '',
    credentials: 'include',
    // Create/update/delete now require an admin session
    prepareHeaders: (headers) => {
      const token = getStoredToken();
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ['MiningMachine'],
  endpoints: (builder) => ({
    getAllMiningMachines: builder.query<Machine[], void>({
      query: () => '/api/v1/mining-machines', // Make sure this matches your backend route
      providesTags: ['MiningMachine'],
    }),
    getMiningMachineById: builder.query({
      query: (id) => `/api/v1/mining-machines/${id}`,
      providesTags: (result, error, id) => [{ type: 'MiningMachine', id }],
    }),
    createMiningMachine: builder.mutation({
      query: (newMachine) => ({
        url: '/api/v1/mining-machines',
        method: 'POST',
        body: newMachine,
      }),
      invalidatesTags: ['MiningMachine'],
    }),
    updateMiningMachine: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/api/v1/mining-machines/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'MiningMachine', id }],
    }),
    deleteMiningMachine: builder.mutation({
      query: (id) => ({
        url: `/api/v1/mining-machines/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'MiningMachine', id }],
    }),
  }),
});

export const {
  useGetAllMiningMachinesQuery,
  useGetMiningMachineByIdQuery,
  useCreateMiningMachineMutation,
  useUpdateMiningMachineMutation,
  useDeleteMiningMachineMutation,
} = miningMachinesApiSlice;
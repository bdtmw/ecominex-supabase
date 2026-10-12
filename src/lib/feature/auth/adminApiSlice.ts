// features/admin/adminApiSlice.ts
import { User } from '@/types/authTypes';
import { baseApiSlice } from '../../store/apiSlice';

export const adminApiSlice = baseApiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAllUsers: builder.query<User[], void>({
      query: () => ({
        url: 'api/v1/admin/users',
        method: 'GET',
      }),
      providesTags: ['User'],
    }),
    deleteUser: builder.mutation<{ message: string }, string>({
      query: (userId) => ({
        url: `api/v1/admin/users/${userId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['User'],
    }),
  }),
});

export const {
  useGetAllUsersQuery,
  useDeleteUserMutation,
} = adminApiSlice;
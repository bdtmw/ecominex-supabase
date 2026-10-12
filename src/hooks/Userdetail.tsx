import { useState, useEffect } from 'react';
import axiosInstance from '@/utils/axiosInstance';

export interface User {
  _id: string;  // Use _id instead of id for MongoDB
  id?: string;   // Allow both _id and id for flexibility
  firstName: string;
  email: string;
  role: string;
  createdAt: string;
}

export const useUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch users
  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await axiosInstance.get('/api/v1/admin/users');
      setUsers(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch users');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete user
  const deleteUser = async (userId: string) => {
    try {
      // Ensure we have a valid user ID
      if (!userId) {
        throw new Error('Invalid user ID');
      }

      await axiosInstance.delete(`/api/v1/admin/users/${userId}`);
      
      // Remove the user from the local state
      setUsers(prevUsers => prevUsers.filter(user => 
        (user._id || user.id) !== userId
      ));
      
      return true;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to delete user';
      setError(errorMessage);
      console.error(err);
      return false;
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return { 
    users, 
    deleteUser, 
    isLoading, 
    error,
    refetch: fetchUsers 
  };
};
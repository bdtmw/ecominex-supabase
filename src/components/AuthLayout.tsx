// @ts-nocheck

"use client"
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useGetCurrentUserQuery } from '@/lib/feature/auth/authThunk';
import { setUser, setCredentials } from '@/lib/feature/auth/authSlice';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch();
  const { data: user, isSuccess, error } = useGetCurrentUserQuery(undefined, {
    pollingInterval: 0, // Disable polling
    refetchOnMountOrArgChange: true,
  });

  useEffect(() => {
    if (isSuccess && user) {
      dispatch(setUser(user));
      // Also set credentials to maintain token in Redux state
      dispatch(setCredentials({ user, token: document.cookie.includes('token') }));
    }
  }, [dispatch, isSuccess, user]);

  return <>{children}</>;
}

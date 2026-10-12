import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import { useGetCurrentUserQuery } from '../feature/auth/authThunk';

export const useAuth = () => {
  const auth = useSelector((state: RootState) => state.auth);
  const { isLoading: isUserLoading } = useGetCurrentUserQuery();

  return {
    user: auth.user,
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading || isUserLoading,
  };
};

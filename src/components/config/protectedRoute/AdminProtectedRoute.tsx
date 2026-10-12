"use client";
import React, { ReactNode, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import { usePathname, useRouter } from 'next/navigation';


interface ProtectedRoutesProps {
  children: ReactNode;
}

const AdminProtectedRoutes: React.FC<ProtectedRoutesProps> = ({ children }) => {
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const navigate = useRouter();
  const location = usePathname();
  const AdminRoutes = ["/Dashboard/AllUser", "/Dashboard/Assign", "/Dashboard/AllTransaction", "/Dashboard/AdminTran", "/Dashboard/contactUs/admin"]
  useEffect(() => {
    if (isAuthenticated && user?.role !== "admin" && AdminRoutes.includes(location)) {
      navigate.replace("/profile");
      return;
    } 
  }, [isAuthenticated, location, user?.role, user]);
  return <>{children}</>;
};

export default AdminProtectedRoutes;

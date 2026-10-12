"use client";
import React, { ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useGetCurrentUserQuery } from "@/lib/feature/auth/authThunk";

interface ProtectedRoutesProps {
  children: ReactNode;
}

const ProtectedRoutes: React.FC<ProtectedRoutesProps> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname()

  const isAuth = typeof window !== "undefined"
    ? localStorage.getItem("IsAuthenticate")
    : null;

  const { data: user } = useGetCurrentUserQuery();

  const adminRoutes = ["/Dashboard/AllUser/", "/Dashboard/AllTransaction/", "/Dashboard/ContactUs/", "/Dashboard/Machine/", "/Dashboard/UserProfile/", "/Dashboard/"];
  const userRoutes = ["/user/dashboard/", "/user/referrals/", "/user/machines/", "/user/wallet/", "/user/settings/"];

  useEffect(() => {
    if (isAuth !== "true") {
      router.replace("/auth/signin");
      return;
    }

    if (!user) return;

    const role = user.role?.toLowerCase();

   
    if (role === "user" && adminRoutes.includes(pathname)) {
      router.replace("/user/dashboard");
      return;
    }

  
    if (role === "admin" && userRoutes.includes(pathname)) {
      router.replace("/user/dashboard");
      return;
    }
  }, [pathname, user, isAuth]);

  return <>{children}</>;
};

export default ProtectedRoutes;

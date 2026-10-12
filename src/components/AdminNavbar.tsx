"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/lib/store/store";
import { useAppSelector } from "@/lib/store/reduxHooks";
import { logout } from "@/lib/feature/auth/authSlice";
import { useLogoutMutation } from "@/lib/feature/auth/authThunk";

export const AdminNavbar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch();
  const [logoutAPI] = useLogoutMutation();
  
  const { user, isAuthenticated } = useAppSelector(
    (state: RootState) => state.auth,
  );
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  useEffect(() => {
    console.log("AdminNavbar - Auth state changed:", {
      isAuthenticated,
      userRole: user?.role,
    });
  }, [isAuthenticated, user]);
  
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMobileMenuOpen]);
  
  const handleAdminLogout = async () => {
    try {
      await logoutAPI().unwrap();
      dispatch(logout());
            localStorage.removeItem("user");
      localStorage.removeItem("token");
      
      router.push("/");
    } catch (error) {
      console.error("Admin logout failed:", error);
    }
  };
  
  // Early return if not admin - improved check with proper type safety
  if (!isAuthenticated || !user || user.role !== "admin") {
    return null;
  }
  
  return (
    <>
      <header className="hidden w-full flex-col bg-black md:block">
        <nav className="mx-1 items-center justify-between rounded-2xl bg-gray-800 px-6 py-3 shadow-sm md:mx-11 md:flex">
          <div className="flex space-x-3 md:space-x-9">
            <Link
              href="/AllUser"
              className="text-gray-300 hover:text-[#21eb00]"
            >
              All User
            </Link>
            <Link href="/Assign" className="text-gray-300 hover:text-[#21eb00]">
              Assign Machine{" "}
            </Link>
            <Link
              href="/AllTransaction"
              className="text-gray-300 hover:text-[#21eb00]"
            >
               Transaction Action{" "}
            </Link>
            <Link
              href="/AdminTran"
              className="text-gray-300 hover:text-[#21eb00]"
            >
              All Transaction{" "}
            </Link>
            <Link
              href="/contactUs/admin"
              className="text-gray-300 hover:text-[#21eb00]"
            >
              All Contact{" "}
            </Link>
          </div>
         
          <button
            onClick={handleAdminLogout}
            className="flex items-center space-x-2 text-[#21eb00] hover:text-green-400"
          >
            Logout
          </button>
        </nav>
      </header>
    </>
  );
};
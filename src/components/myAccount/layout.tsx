"use client";

import React, { useEffect, useState } from "react";
import { User, LogOut, Cpu, ChevronRight, WalletMinimal, CreditCard, UsersRound, ScrollText, ShieldCheck, ArrowLeftRight, BookUser } from "lucide-react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { logout, setUser } from "@/lib/feature/auth/authSlice";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import { AppDispatch, RootState } from "@/lib/store/store";
import { useLogoutMutation } from "@/lib/feature/auth/authThunk";
import ProtectedRoutes from "../config/protectedRoute/ProtectedRoutes";
import { baseApiSlice } from "@/lib/store/apiSlice";
interface MenuLinkProps {
  link: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
}
const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [roleCheck, setroleCheck] = useState(false);
  const dispatch = useDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  console.log(user, isAuthenticated);
  const navigationLinks = [
    { link: "/Dashboard", icon: WalletMinimal, label: "Dashboard" },
    { link: "/Dashboard/TotalMachine", icon: Cpu, label: "Total Machine" },
    { link: "/Dashboard/UserProfile", icon: User, label: "Profile" },
    { link: "/Dashboard/Payments", icon: CreditCard, label: "Payments" },
    { link: "/Dashboard/AllUser", icon: UsersRound, label: "All User" },
    { link: "/Dashboard/Assign", icon: ScrollText, label: "Assign Machine" },
    { link: "/Dashboard/AllTransaction", icon: ShieldCheck, label: "Transaction Action" },
    { link: "/Dashboard/AdminTran", icon: ArrowLeftRight, label: "All Transaction" },
    { link: "/Dashboard/contactUs/admin", icon: BookUser, label: "All Contact" },
    { link: "#", icon: LogOut, label: "Logout" },
  ];
  const navigationUser = [
    { link: "/Dashboard", icon: WalletMinimal, label: "Dashboard" },
    { link: "/Dashboard/TotalMachine", icon: Cpu, label: "Total Machine" },
    { link: "/Dashboard/UserProfile", icon: User, label: "Profile" },
    { link: "/Dashboard/Payments", icon: CreditCard, label: "Payments" },
    { link: "/Dashboard/Referral", icon: CreditCard, label: "Referrals" },
    { link: "#", icon: LogOut, label: "Logout" },
  ];
  useEffect(() => {
    if (user?.role === "admin") {
      setroleCheck(true)
    }
  })
  const [logoutApi] = useLogoutMutation();
  const handleAdminLogout = async () => {
    try {
      await logoutApi().unwrap();

      dispatch(logout());

      dispatch(baseApiSlice.util.resetApiState());
      localStorage.clear();
      sessionStorage.clear();
      router.push("/");
    } catch (error) {
      console.error("Admin logout failed:", error);
    }
  };

  const MenuLink: React.FC<MenuLinkProps> = ({ link, icon: Icon, label }) => {
    const normalizePath = (path: string) => path.replace(/\/$/, ""); // remove trailing slash
    const isActive =
      normalizePath(link) === normalizePath(pathname) || // exact match
      (link !== "/Dashboard" && normalizePath(pathname).startsWith(normalizePath(link))); // for subpages


    if (label === "Logout") {
      return (
        <motion.button
          onClick={() => setShowLogoutModal(true)}
          whileHover={{ scale: 1.03 }}
          className={`group flex w-full items-center space-x-3 rounded-xl p-3 border-l-4 border-transparent
            ${isActive
              ? "bg-gradient-to-r from-[#21eb00]/20 to-transparent text-[#21eb00] border-[#21eb00]"
              : "text-zinc-400 hover:bg-zinc-900 hover:text-white hover:border-[#21eb00]"
            }`}
        >
          <Icon
            className={`h-5 w-5 transition-transform duration-300 group-hover:scale-110 
            ${isActive ? "text-[#21eb00]" : "text-zinc-400 group-hover:text-white"}`}
          />
          <span className="font-medium">{label}</span>
        </motion.button>
      );
    }

    return (
      <Link href={link} className={`group flex items-center space-x-3 rounded-xl p-2 border-l-4 border-transparent
        ${isActive
          ? "bg-gradient-to-r from-[#21eb00]/20 to-transparent text-[#21eb00] border-[#21eb00]"
          : "text-zinc-400 hover:bg-zinc-900 hover:text-white hover:border-[#21eb00]"
        }`}
      >
        <Icon
          className={`h-5 w-5 transition-transform duration-300 group-hover:scale-110 
            ${isActive ? "text-[#21eb00]" : "text-zinc-400 group-hover:text-white"}`}
        />
        <span className="font-medium">{label}</span>
        <ChevronRight
          className={`ml-auto h-4 w-4 opacity-0 transition-all duration-300 
            ${isActive ? "text-[#21eb00] opacity-100" : "group-hover:opacity-100"}`}
        />
      </Link>
    );
  };

  return (
    <ProtectedRoutes>


      <div className="flex min-h-screen flex-col bg-[#000] text-white lg:flex-row ">
        {/* Desktop Sidebar */}
        <div className="min-h-screen  w-[25%] ">
          <motion.div
            initial={{ x: -250, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
            className="hidden lg:flex w-[22%] mb-4 fixed flex-col bg-[#1b1b1b] p-2 backdrop-blur-md min-h-screen" 
          >
            <Link href="/" className="flex items-center justify-center space-x-2 mx-4 my-8">
              <span className="text-3xl font-bold">Ecomine</span>
              <div className="flex -ml-2 h-[30px] w-[30px] items-center justify-center rounded-full bg-green-500">
                <span className="text-xl font-bold">X</span>
              </div>
            </Link>
            <nav className="space-y-3 mt-8">
              {roleCheck ? navigationLinks.map((item, idx) => (
                <MenuLink key={idx} {...item} />
              )) : navigationUser.map((item, idx) => (<MenuLink key={idx} {...item} />))}
            </nav>
          </motion.div>
        </div>

        {/* Logout Modal */}
        {showLogoutModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className="mx-4 w-full max-w-sm rounded-lg border border-zinc-800 bg-zinc-900 p-6"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <h3 className="mb-4 text-xl font-semibold">Confirm Logout</h3>
              <p className="mb-6 text-zinc-400">Are you sure you want to logout?</p>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="rounded-lg bg-zinc-800 px-4 py-2 text-white hover:bg-zinc-700"
                >
                  No
                </button>
                <button
                  onClick={handleAdminLogout}
                  className="bg-red-600 hover:bg-red-700 rounded-lg px-4 py-2 text-white"
                >
                  Yes
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Main Content */}
        <div className="flex-1 bg-[#000] pt-16 lg:pt-0">
          <div className="mx-auto max-w-full p-4">{children}</div>
        </div>
      </div>
    </ProtectedRoutes>
  );
};

export default DashboardLayout;

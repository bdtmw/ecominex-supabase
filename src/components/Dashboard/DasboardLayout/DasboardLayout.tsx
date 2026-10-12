"use client";

import React, { useEffect, useState } from "react";
import { User, LogOut, Cpu, ChevronRight, WalletMinimal, CreditCard, UsersRound, ScrollText, ShieldCheck, ArrowLeftRight, BookUser, LayoutDashboard, ShoppingCart, Settings, WalletCards, Users } from "lucide-react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { logout, setUser } from "@/lib/feature/auth/authSlice";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import { RootState } from "@/lib/store/store";
import { useLogoutMutation } from "@/lib/feature/auth/authThunk";
import { baseApiSlice } from "@/lib/store/apiSlice";
import Sidebar from "../DashboardSidebar/DashboardSidebar";

const adminMenu = [
  { label: "Dashboard", icon: LayoutDashboard, link: "/Dashboard/" },
  { label: "Machine", icon: ShoppingCart, link: "/Dashboard/Machine/" },
  { label: "All Users", icon: Users, link: "/Dashboard/AllUser/" },
  { label: "Transactions", icon: WalletCards , link: "/Dashboard/AllTransaction/" },
  { label: "Manage Contacts", icon: ScrollText, link: "/Dashboard/contactUs/" },
  { label: "Settings", icon: Settings  , link: "/Dashboard/UserProfile" },
];

const userMenu = [
  { label: "Dashboard", icon: LayoutDashboard, link: "/Dashboard" },
  { label: "Total Machine", icon: ShoppingCart  , link: "/Dashboard/TotalMachine" },
  { label: "Profile", icon: Settings, link: "/Dashboard/UserProfile" },
  { label: "Payments", icon: CreditCard, link: "/Dashboard/Payments" },
  { label: "Referrals", icon: CreditCard, link: "/Dashboard/Referral" },
  { label: "Logout", icon: LogOut, link: "#" },
];


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
                            ? "bg-gradient-to-r from-[#21eb00]/20 to-transparent text-[#21eb00] border-[#21eb00] border-l-[2px]  "
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

       if (isAuthenticated && user?.role !== "admin") {
        return (
            <div className="flex justify-center items-center min-h-screen bg-transparent">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-green-500"></div>
            </div>
        );
    }

    return (

            <div className="flex items-stretch">
                <Sidebar
                    menu={roleCheck ? adminMenu : userMenu}
                    onLogout={() => setShowLogoutModal(true)}
                />

                <main className=" bg-[#000] p-6 w-[100%]">
                    {children}
                </main>
            </div>

    );
};

export default DashboardLayout;

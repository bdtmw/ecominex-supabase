"use client";
import Link from "next/link";

import * as React from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Server,
  Wallet,
  Users,
  Settings,
  Menu,
  LogOut
} from "lucide-react";

import { NavLink } from "@/components/Navlink";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useLogoutMutation } from "@/lib/feature/auth/authThunk";
import { logout } from "@/lib/feature/auth/authSlice";
import { useDispatch } from "react-redux";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";





export default function UserLayout({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch();
  const [logoutAPI] = useLogoutMutation();

 const handleLogout = async () => {
  try {
    await logoutAPI().unwrap();

    dispatch(logout());
    localStorage.removeItem("user");
    localStorage.removeItem("token");

    toast.success("Logged out successfully!");

    setTimeout(() => {
      window.location.href = "/";
    }, 1200); // wait for toast to show
  } catch (error) {
    console.error("Logout failed:", error);

    dispatch(logout());
    localStorage.removeItem("user");
    localStorage.removeItem("token");

    toast.error("Logout failed, but session was cleared!");

    setTimeout(() => {
      window.location.href = "/";
    }, 1200);
  }
};


  return (
    <SidebarProvider>
      <ToastContainer position="top-right" autoClose={3000} theme="dark" />

      <div className="flex min-h-screen bg-[#0f172a] text-white">
        <DashboardSidebar onLogout={handleLogout} />
        <div className="flex-1 flex flex-col">
          <div className="md:hidden p-3 border-b border-gray-700 flex items-center bg-[#0b0e13]">
            <SidebarTrigger className="p-2 rounded-md hover:bg-gray-800 transition-colors">
              <Menu className="h-6 w-6 text-white" />
            </SidebarTrigger>
            <span className="ml-3 text-white font-semibold">Menu</span>
          </div>
          <div className="flex-1">{children}</div>
        </div>
      </div>
    </SidebarProvider>
  );
}

interface DashboardSidebarProps {
  onLogout: () => void;
}

export function DashboardSidebar({ onLogout }: DashboardSidebarProps) {
  const pathname = usePathname();
  const { isAdmin } = useIsAdmin();

  const menuItems = [
    { title: "Dashboard", url: "/user/dashboard", icon: LayoutDashboard },
    { title: "Machines", url: "/user/machines", icon: Server },
    { title: "Wallet", url: "/user/wallet", icon: Wallet },
    { title: "Referrals", url: "/user/referrals", icon: Users },
    { title: "Settings", url: "/user/settings", icon: Settings },
    { title: "Logout", url: "#", icon: LogOut, action: onLogout }, // attach action
  ];

  return (
    <Sidebar
      collapsible="offcanvas"
      className="bg-[#1b1b1b] text-white border-r border-gray-700 transition-all duration-300"
    >
      <SidebarContent>
        <SidebarGroup className="mt-7">
          <SidebarGroupLabel>
            <Link href="/" className="flex items-center space-x-2 ml-5 mb-5">
              <span className="text-3xl font-bold">Ecomine</span>
              <div className="flex -ml-2 h-[30px] w-[30px] items-center justify-center rounded-full bg-green-500">
                <span className="text-xl font-bold">X</span>
              </div>
            </Link>
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu className="space-y-1 mt-5">
              {menuItems.map((item) => {
                const isActive = pathname === item.url;

                if (item.title === "Logout") {
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton>
                        <button
                          onClick={item.action}
                          className="flex items-center w-full p-2 rounded-md text-white hover:bg-red-600 transition-colors"
                        >
                          <item.icon className="mr-2 h-5 w-5" />
                          Logout
                        </button>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        href={item.url}
                        className={`flex items-center p-2 rounded-md transition-colors ${
                          isActive ? "bg-emerald-600 text-white" : "text-white hover:bg-gray-800"
                        }`}
                      >
                        <item.icon className="mr-2 h-5 w-5" />
                        {item.title}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

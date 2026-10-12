"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CreditCard, LayoutDashboard, Settings, ShoppingCart } from "lucide-react";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/store/store";
import Sidebar from "../DashboardSidebar/DashboardSidebar";
import TopBar from "../nav/TopBar";
import CommandPalette from "../nav/CommandPalette";
import { ADMIN_NAV, type NavGroup } from "../nav/adminNav";
import { useAdminCounts } from "@/hooks/useAdminCounts";
import { useConfirmLogout } from "@/hooks/useConfirmLogout";

// Menu for non-admin accounts that land on these pages (kept from the previous version).
const USER_NAV: NavGroup[] = [
  {
    title: "",
    items: [
      { label: "Dashboard", href: "/Dashboard", icon: LayoutDashboard, description: "Overview" },
      { label: "Total Machine", href: "/Dashboard/TotalMachine", icon: ShoppingCart, description: "Your machines" },
      { label: "Profile", href: "/Dashboard/UserProfile", icon: Settings, description: "Your profile" },
      { label: "Payments", href: "/Dashboard/Payments", icon: CreditCard, description: "Payments" },
      { label: "Referrals", href: "/Dashboard/Referral", icon: CreditCard, description: "Referrals" },
    ],
  },
];

const COLLAPSE_KEY = "admin.sidebar.collapsed";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const isAdmin = user?.role === "admin";

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const confirmLogout = useConfirmLogout();
  const { counts } = useAdminCounts(isAdmin);

  // remember the collapsed state between visits
  useEffect(() => {
    try { setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1"); } catch { /* storage unavailable */ }
  }, []);
  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      try { localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1"); } catch { /* ignore */ }
      return !c;
    });
  }, []);

  // Ctrl/Cmd + K opens the quick-jump search (admins only)
  useEffect(() => {
    if (!isAdmin) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isAdmin]);

  const groups = useMemo(() => (isAdmin ? ADMIN_NAV : USER_NAV), [isAdmin]);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  if (isAuthenticated && user?.role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-transparent">
        <div className="h-16 w-16 animate-spin rounded-full border-b-4 border-t-4 border-green-500" />
      </div>
    );
  }

  return (
    <div className="flex items-stretch">
      <Sidebar
        groups={groups}
        counts={counts}
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
        mobileOpen={mobileOpen}
        onMobileClose={closeMobile}
        onOpenSearch={isAdmin ? () => setSearchOpen(true) : undefined}
        onLogout={confirmLogout}
        user={user}
      />

      <main className="min-w-0 w-full bg-[#000] p-4 sm:p-6">
        <TopBar onOpenMenu={() => setMobileOpen(true)} onOpenSearch={() => setSearchOpen(true)} showSearch={isAdmin} />
        {children}
      </main>

      {isAdmin && <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />}
    </div>
  );
};

export default DashboardLayout;

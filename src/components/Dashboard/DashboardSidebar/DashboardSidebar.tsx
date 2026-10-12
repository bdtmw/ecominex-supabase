"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, LogOut, Search, X } from "lucide-react";
import { isActive, type NavGroup, type NavItem } from "../nav/adminNav";
import type { AdminCounts } from "@/hooks/useAdminCounts";

interface SidebarProps {
  groups: NavGroup[];
  counts: AdminCounts;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  onOpenSearch?: () => void;
  onLogout: () => void;
  user?: { firstName?: string; lastName?: string; role?: string } | null;
}

const fmt = (n: number) => (n > 99 ? "99+" : String(n));

function NavLink({ item, active, collapsed, count, onNavigate }: {
  item: NavItem; active: boolean; collapsed: boolean; count: number; onNavigate: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[14.5px] font-medium outline-none transition
        focus-visible:ring-2 focus-visible:ring-green-500
        ${active ? "bg-green-500/10 text-green-400" : "text-gray-300 hover:bg-white/5 hover:text-white"}
        ${collapsed ? "justify-center" : ""}`}
    >
      {active && <span className="absolute -left-4 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r bg-green-500" aria-hidden />}
      <span className="relative">
        <Icon className="h-5 w-5 shrink-0" aria-hidden />
        {collapsed && count > 0 && (
          <span className="absolute -right-1.5 -top-1.5 h-3 w-3 rounded-full bg-red-500 ring-2 ring-[#1b1b1b]" aria-label={`${count} waiting`} />
        )}
      </span>
      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
      {!collapsed && count > 0 && (
        <span className="rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-semibold leading-none text-white" aria-label={`${count} waiting`}>
          {fmt(count)}
        </span>
      )}
    </Link>
  );
}

export default function Sidebar({
  groups, counts, collapsed, onToggleCollapsed, mobileOpen, onMobileClose, onOpenSearch, onLogout, user,
}: SidebarProps) {
  const pathname = usePathname();

  // Esc closes the mobile drawer
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onMobileClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen, onMobileClose]);

  const render = (isCollapsed: boolean) => (
    <div className="flex h-full w-full flex-col bg-[#1b1b1b] px-4 py-5">
      <div className="mb-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 px-1" onClick={onMobileClose} aria-label="Ecomine home">
          {!isCollapsed && <span className="text-[28px] font-bold leading-none">Ecomine</span>}
          <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-green-500 text-xl font-bold">X</span>
        </Link>
      </div>

      {onOpenSearch && (
        <button
          onClick={() => { onOpenSearch(); onMobileClose(); }}
          title={isCollapsed ? "Search (Ctrl K)" : undefined}
          className={`mb-3 flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-400 outline-none transition hover:border-green-500/40 hover:text-white focus-visible:ring-2 focus-visible:ring-green-500 ${isCollapsed ? "justify-center" : ""}`}
        >
          <Search className="h-4 w-4 shrink-0" aria-hidden />
          {!isCollapsed && (<><span className="flex-1 text-left">Jump to…</span>
            <kbd className="rounded border border-white/10 px-1.5 text-[10px] text-gray-400">Ctrl K</kbd></>)}
        </button>
      )}

      <nav aria-label="Admin navigation" className="-mr-2 min-h-0 flex-1 space-y-3.5 overflow-y-auto pr-2">
        {groups.map((group, gi) => (
          <div key={group.title || gi}>
            {group.title && !isCollapsed && (
              <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">{group.title}</p>
            )}
            {group.title && isCollapsed && gi > 0 && <div className="mx-2 mb-2 border-t border-white/10" />}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  active={isActive(pathname, item.href)}
                  collapsed={isCollapsed}
                  count={item.badge ? counts[item.badge] : 0}
                  onNavigate={onMobileClose}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-3 border-t border-white/10 pt-3">
        <div className={`flex items-center gap-3 ${isCollapsed ? "flex-col" : ""}`}>
          <Image src="/userdash.jpg" width={36} height={36} alt="" className="rounded-full" />
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs capitalize text-gray-400">{user?.role}</p>
            </div>
          )}
          <button
            onClick={() => { onMobileClose(); onLogout(); }}
            title="Log out"
            aria-label="Log out"
            className="rounded-lg p-2 text-gray-300 outline-none transition hover:bg-red-500/10 hover:text-red-400 focus-visible:ring-2 focus-visible:ring-red-500"
          >
            <LogOut className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <motion.aside
        animate={{ width: collapsed ? 84 : 262 }}
        initial={false}
        className="relative hidden h-screen shrink-0 bg-[#1b1b1b] text-white md:block"
      >
        <div className="fixed h-screen" style={{ width: collapsed ? 84 : 262 }}>{render(collapsed)}</div>
        <button
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="fixed top-20 z-50 rounded-full bg-[#323232] p-1 text-white shadow transition hover:bg-green-600"
          style={{ left: (collapsed ? 84 : 262) - 12 }}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </motion.aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.button
              aria-label="Close menu"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[65] bg-black/60 md:hidden"
              onClick={onMobileClose}
            />
            <motion.aside
              role="dialog" aria-modal="true" aria-label="Menu"
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.25 }}
              className="fixed inset-y-0 left-0 z-[70] w-72 max-w-[85vw] text-white shadow-xl md:hidden"
            >
              <button onClick={onMobileClose} aria-label="Close menu" className="absolute right-3 top-3 z-10 rounded-full p-1.5 text-gray-300 hover:bg-white/10">
                <X className="h-5 w-5" />
              </button>
              {render(false)}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

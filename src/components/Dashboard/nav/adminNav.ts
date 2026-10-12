import {
  LayoutDashboard, Users, UserPlus, Cpu, WalletCards, History, MessageSquare, Settings,
  type LucideIcon,
} from "lucide-react";

export type BadgeKey = "pendingWithdrawals" | "unreadContacts";

export interface NavItem {
  label: string;
  href: string;            // no trailing slash
  icon: LucideIcon;
  description: string;     // shown in the quick-jump search
  keywords?: string[];     // extra search terms
  badge?: BadgeKey;        // live count shown next to the label
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const ADMIN_NAV: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/Dashboard", icon: LayoutDashboard, description: "Stats, recent users and pending requests", keywords: ["home", "overview", "stats"] },
    ],
  },
  {
    title: "People",
    items: [
      { label: "All Users", href: "/Dashboard/AllUser", icon: Users, description: "Find, view and manage users", keywords: ["customers", "accounts", "balance", "add balance", "delete user"] },
      { label: "Assign Machines", href: "/Dashboard/Assign", icon: UserPlus, description: "Give a mining machine to a user", keywords: ["assign", "give", "allocate", "user machine"] },
    ],
  },
  {
    title: "Mining",
    items: [
      { label: "Machine Catalog", href: "/Dashboard/Machine", icon: Cpu, description: "Add, edit and remove machines", keywords: ["machines", "miners", "add machine", "price", "products"] },
    ],
  },
  {
    title: "Finance",
    items: [
      { label: "Withdrawals", href: "/Dashboard/AllTransaction", icon: WalletCards, description: "Approve or reject pending withdrawals", keywords: ["pending", "payout", "approve", "reject", "transactions"], badge: "pendingWithdrawals" },
      { label: "Withdrawal History", href: "/Dashboard/AdminTran", icon: History, description: "All processed withdrawals and filters", keywords: ["history", "all transactions", "report", "approved", "rejected"] },
    ],
  },
  {
    title: "Support",
    items: [
      { label: "Contact Messages", href: "/Dashboard/contactUs", icon: MessageSquare, description: "Messages sent from the contact form", keywords: ["inbox", "support", "contacts", "enquiries", "messages"], badge: "unreadContacts" },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Settings", href: "/Dashboard/UserProfile", icon: Settings, description: "Your profile and password", keywords: ["profile", "password", "account", "2fa"] },
    ],
  },
];

export const ALL_ADMIN_ITEMS: NavItem[] = ADMIN_NAV.flatMap((g) => g.items);

export const normalizePath = (p: string) => (p.length > 1 ? p.replace(/\/+$/, "") : p);

/** The dashboard home only matches exactly; every other item also matches its sub-pages. */
export function isActive(pathname: string, href: string): boolean {
  const path = normalizePath(pathname);
  if (href === "/Dashboard") return path === href;
  return path === href || path.startsWith(`${href}/`);
}

export interface Crumb { label: string; href?: string }

/** Breadcrumb trail for the current admin URL, e.g. Dashboard / All Users / User details. */
export function buildCrumbs(pathname: string): Crumb[] {
  const path = normalizePath(pathname);
  const crumbs: Crumb[] = [{ label: "Dashboard", href: "/Dashboard" }];
  if (path === "/Dashboard") return [{ label: "Dashboard" }];

  const item = ALL_ADMIN_ITEMS.filter((i) => i.href !== "/Dashboard" && isActive(path, i.href))
    .sort((a, b) => b.href.length - a.href.length)[0];

  if (!item) return [...crumbs, { label: "Page" }];
  if (path === item.href) return [...crumbs, { label: item.label }];

  const rest = path.slice(item.href.length + 1).split("/");
  const detail = item.href === "/Dashboard/AllUser" ? "User details" : rest[rest.length - 1] === "admin" ? "Admin view" : "Details";
  return [...crumbs, { label: item.label, href: item.href }, { label: detail }];
}

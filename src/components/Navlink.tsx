"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface NavLinkProps {
  href: string;           // IMPORTANT: href, not "to"
  children: React.ReactNode;
  className?: string;
  activeClassName?: string;
  end?: boolean;
}

export const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(
  ({ href, className = "", activeClassName = "", children, end }, ref) => {
    const pathname = usePathname();

    const isActive = end ? pathname === href : pathname.startsWith(href);

    return (
      <Link
        href={href}
        ref={ref}
        className={cn(className, isActive && activeClassName)}
      >
        {children}
      </Link>
    );
  }
);

NavLink.displayName = "NavLink";

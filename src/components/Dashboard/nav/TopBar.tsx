"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Menu, Search } from "lucide-react";
import { buildCrumbs } from "./adminNav";

/** Breadcrumbs + search trigger shown above every admin page (and the mobile menu button). */
export default function TopBar({ onOpenMenu, onOpenSearch, showSearch }: { onOpenMenu: () => void; onOpenSearch: () => void; showSearch: boolean }) {
  const crumbs = buildCrumbs(usePathname());

  return (
    <div className="mb-2 flex items-center gap-3 border-b border-white/5 pb-3">
      <button onClick={onOpenMenu} aria-label="Open menu" className="rounded-md p-2 text-gray-200 hover:bg-white/10 md:hidden">
        <Menu className="h-5 w-5" />
      </button>

      <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
        <ol className="flex flex-wrap items-center gap-1 text-sm text-gray-400">
          {crumbs.map((c, i) => (
            <li key={`${c.label}-${i}`} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-gray-600" aria-hidden />}
              {c.href && i < crumbs.length - 1
                ? <Link href={c.href} className="hover:text-green-400">{c.label}</Link>
                : <span aria-current="page" className="font-medium text-white">{c.label}</span>}
            </li>
          ))}
        </ol>
      </nav>

      {showSearch && (
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-gray-300 transition hover:border-green-500/40 hover:text-white"
        >
          <Search className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Search</span>
          <kbd className="hidden rounded border border-white/10 px-1.5 text-[10px] text-gray-400 sm:inline">Ctrl K</kbd>
        </button>
      )}
    </div>
  );
}

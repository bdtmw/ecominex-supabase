"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** Filters live in the URL so a view can be bookmarked, shared and survives Back/Refresh. */
export function useUrlState() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const set = useCallback((patch: Record<string, string | null | undefined>, opts: { resetPage?: boolean } = { resetPage: true }) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === undefined || v === "") next.delete(k); else next.set(k, v);
    }
    if (opts.resetPage !== false && !("page" in patch)) next.delete("page");
    const q = next.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }, [router, pathname, sp]);

  return { sp, get: (k: string) => sp.get(k) ?? "", set, query: sp.toString() };
}

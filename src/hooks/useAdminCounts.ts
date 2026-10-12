"use client";

import { useCallback, useEffect, useState } from "react";
import axiosInstance from "@/utils/axiosInstance";

export interface AdminCounts {
  pendingWithdrawals: number;
  unreadContacts: number;
}

const EMPTY: AdminCounts = { pendingWithdrawals: 0, unreadContacts: 0 };

/**
 * Live "needs attention" counts for the sidebar badges. Refreshes every minute and whenever the
 * tab regains focus. Failures are silent: badges simply stay as they were.
 */
export function useAdminCounts(enabled: boolean) {
  const [counts, setCounts] = useState<AdminCounts>(EMPTY);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    const [wd, contacts] = await Promise.allSettled([
      axiosInstance.get("/api/v1/withdrawals/stats"),
      axiosInstance.get("/api/v1/contacts/stats"),
    ]);
    setCounts((prev) => ({
      pendingWithdrawals: wd.status === "fulfilled" ? Number(wd.value.data?.pending?.count ?? 0) : prev.pendingWithdrawals,
      unreadContacts:
        contacts.status === "fulfilled"
          ? Number((contacts.value.data?.statusBreakdown || []).find((s: any) => s._id === "pending")?.count ?? 0)
          : prev.unreadContacts,
    }));
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    refresh();
    const timer = setInterval(refresh, 60_000);
    const onFocus = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [enabled, refresh]);

  return { counts, refresh };
}

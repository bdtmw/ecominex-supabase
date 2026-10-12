"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import axiosInstance from "@/utils/axiosInstance";

/**
 * GET helper for admin endpoints. While a refetch is running the previous data stays available
 * (`data` is not cleared), so charts can dim instead of flashing a skeleton.
 */
export function useAdminFetch<T = any>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!url);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  const run = useCallback(async () => {
    if (!url) return;
    const id = ++seq.current;
    setLoading(true);
    try {
      const res = await axiosInstance.get(url);
      if (id !== seq.current) return; // a newer request superseded this one
      setData(res.data);
      setError(null);
    } catch (e: any) {
      if (id !== seq.current) return;
      setError(e?.response?.data?.message || "Could not load data");
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, [url]);

  useEffect(() => { run(); }, [run]);
  return { data, loading, error, refetch: run };
}

/** Downloads a CSV from an authenticated endpoint (links can't carry the Bearer header). */
export async function downloadCsv(url: string, fallbackName: string) {
  const res = await axiosInstance.get(url, { responseType: "blob" });
  const cd = String(res.headers["content-disposition"] || "");
  const name = /filename="?([^"]+)"?/.exec(cd)?.[1] || fallbackName;
  const href = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = href; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}

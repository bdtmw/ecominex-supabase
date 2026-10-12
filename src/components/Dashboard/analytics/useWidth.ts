"use client";
import { useEffect, useRef, useState } from "react";

export function useWidth<T extends HTMLElement>(initial = 300) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(initial);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(200, Math.floor(e.contentRect.width))));
    ro.observe(el);
    setWidth(Math.max(200, Math.floor(el.getBoundingClientRect().width)));
    return () => ro.disconnect();
  }, []);
  return { ref, width };
}

"use client";

import { useState, useEffect } from "react";

export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate async admin check
    const checkAdminStatus = async () => {
      try {
        // Replace this with your own logic or API call
        // For now, we just hardcode admin = true
        await new Promise((resolve) => setTimeout(resolve, 500)); // simulate delay
        setIsAdmin(true); // or false
      } catch (error) {
        console.error("Error checking admin status:", error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, []);

  return { isAdmin, loading };
}

"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import Swal from "sweetalert2";
import { logout } from "@/lib/feature/auth/authSlice";
import { baseApiSlice } from "@/lib/store/apiSlice";
import { useLogoutMutation } from "@/lib/feature/auth/authThunk";

/** Asks for confirmation, then logs out and clears all client state. */
export function useConfirmLogout() {
  const router = useRouter();
  const dispatch = useDispatch();
  const [logoutApi] = useLogoutMutation();

  return useCallback(async () => {
    const theme = { background: "#1e1e1e", color: "#fff" };
    const confirm = await Swal.fire({
      title: "Log out?", text: "You will be logged out of your account.", icon: "question",
      showCancelButton: true, confirmButtonText: "Yes, log out", cancelButtonText: "Cancel", confirmButtonColor: "#22c55e", ...theme,
    });
    if (!confirm.isConfirmed) return;

    try { await logoutApi().unwrap(); } catch { /* the token is stateless; clear locally either way */ }
    dispatch(logout());
    dispatch(baseApiSlice.util.resetApiState());
    try { localStorage.clear(); sessionStorage.clear(); } catch { /* storage may be unavailable */ }
    router.push("/");
    Swal.fire({ icon: "success", title: "Logged out", timer: 1500, showConfirmButton: false, ...theme });
  }, [dispatch, logoutApi, router]);
}

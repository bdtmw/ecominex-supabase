"use client";

import React from "react";
import { Search, Settings } from "lucide-react";
import userImg from "../../../../public/userdash.jpg";
import Image from "next/image";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/lib/store/store";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logout } from "@/lib/feature/auth/authSlice";
import { baseApiSlice } from "@/lib/store/apiSlice";
import { useLogoutMutation } from "@/lib/feature/auth/authThunk";
import Swal from "sweetalert2";

interface DashboardHeaderProps {
    children?: React.ReactNode;
    title?: string;
    desc?: string;
}


const DashboardHeader = ({ children, title, desc }: DashboardHeaderProps) => {

    const router = useRouter();
    const dispatch = useDispatch();
    const pathname = usePathname();
    const [logoutApi] = useLogoutMutation();
    const { user, isAuthenticated } = useSelector(
        (state: RootState) => state.auth
    );

    const handleAdminLogout = async () => {
        const confirm = await Swal.fire({
            title: "Are you sure?",
            text: "You will be logged out of your account.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Yes, Logout",
            cancelButtonText: "Cancel",
            confirmButtonColor: "#22c55e",
            background: "#1e1e1e",
            color: "#fff",
        });

        if (!confirm.isConfirmed) return;

        try {
            await logoutApi().unwrap();

            dispatch(logout());
            dispatch(baseApiSlice.util.resetApiState());
            localStorage.clear();
            sessionStorage.clear();
            
            router.push("/");
            Swal.fire({
                icon: "success",
                title: "Logged Out",
                text: "You have been logged out successfully.",
                timer: 1800,
                showConfirmButton: false,
                background: "#1e1e1e",
                color: "#fff",
            });

            // setTimeout(() => {
            // }, 1200);

        } catch (error) {
            Swal.fire({
                icon: "error",
                title: "Logout Failed",
                text: "Something went wrong. Try again.",
                background: "#1e1e1e",
                color: "#fff",
            });
        }
    };




    return (
    <header className="sticky top-0 z-40 bg-[#000]">
      <div className="mb-4 sm:mb-7 px-3 sm:px-4 pt-3 pb-2 sm:py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-md">
          {/* LEFT – Title + Desc */}
          <div className="relative w-full sm:max-w-2xl">
            <h2 className="text-lg sm:text-2xl md:text-[28px] lg:text-[36px] mt-1 font-semibold text-white">
              {title}
            </h2>
            <p className="text-gray-200 text-xs sm:text-sm md:text-[13px] mt-1">
              {desc}
            </p>
          </div>

          {/* RIGHT – Logout + Profile */}
          <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
            <button
              onClick={handleAdminLogout}
              className="w-max border-[1.5px] border-green-500 font-[600] text-[11.5px] sm:text-[13.5px] rounded-full px-5 sm:px-8 py-2 sm:py-2.5 cursor-pointer hover:bg-green-600 hover:scale-105 text-white transition-all duration-300"
            >
              Logout
            </button>

            <div className="flex items-center gap-2 sm:gap-3">
              <Link href={"/Dashboard/UserProfile"}>
                <Image
                  src={userImg}
                  alt="Profile"
                  className="w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-full object-cover border border-gray-300"
                />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;

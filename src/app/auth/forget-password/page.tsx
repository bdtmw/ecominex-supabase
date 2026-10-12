// @ts-nocheck
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast, ToastContainer } from "react-toastify";
import Link from "next/link";
import { useForgotPasswordMutation } from "@/lib/feature/auth/authThunk";
import { motion } from "framer-motion";
import "react-toastify/dist/ReactToastify.css";
import "@/css/style.css";

interface ApiError {
    status?: number;
    data?: { message?: string };
}

export default function ForgetPasswordPage() {
    const router = useRouter();

    const [email, setEmail] = useState("");

    // 🔥 your new API hook
    const [forgotPassword, { isLoading }] = useForgotPasswordMutation();



    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        try {
            const res = await forgotPassword({ email }).unwrap();

            toast.success(res.message || "Email sent successfully!");

        } catch (error: ApiError | any) {
            const message =
                error?.data?.message ||
                "Something went wrong. Please try again.";

            toast.error(message);
        }
    };

   return (
  <div className="relative overflow-hidden bg-[#000] min-h-screen pb-10 md:pb-0">
    <ToastContainer />

    {/* BG animations */}
    <motion.div
      animate={{ y: [0, 20, 0], opacity: [0.5, 0.7, 0.5] }}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      className="absolute bg-[#22c55e] -left-10 -bottom-28 blur-[140px] opacity-50 h-[150px] w-[220px]"
    />
    <motion.div
      animate={{ y: [0, 20, 0], opacity: [0.5, 0.7, 0.5] }}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      className="absolute bg-[#22c55e] -right-10 -top-48 blur-[140px] opacity-50 h-[150px] w-[220px]"
    />

    <div className="grid grid-cols-1 md:grid-cols-2 min-h-screen">
      {/* LEFT IMAGE */}
      <div className="bg-[#000] flex flex-col gap-4 justify-center items-center px-6 sm:px-10 md:px-16 py-8 md:py-0">
        <div className="w-full flex justify-center">
          <img
            className="w-full max-w-xs sm:max-w-sm md:max-w-none"
            src="/resetpassword.jpg"
            alt=""
          />
        </div>
      </div>

      {/* RIGHT FORM */}
      <div className="bg-[#111111] rounded-t-[20px] md:rounded-t-none md:rounded-l-[20px]  md:pt-0 h-full flex flex-col gap-2 justify-center px-6 sm:px-10 md:px-16">
  <img
    className="w-16 sm:w-20 md:w-24 mb-6 md:mb-2 mx-auto md:mx-0"
    src="/GlowingKey.png"
    alt=""
  />

        <div className="flex flex-col gap-3 justify-start items-start">
          <h1 className="text-[#f0f0f0] font-[500] text-[26px] sm:text-[30px] md:text-[33px] tracking-[0px]">
            Reset Password
          </h1>

          <form
            onSubmit={handleSubmit}
            className="w-full md:w-[90%] flex flex-col gap-7 mt-3.5"
          >
            {/* EMAIL INPUT */}
            <div className="relative w-full mt-0">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="
                  peer w-full bg-transparent border-b-2 rounded-[3px] bg-[#2c2c2cba] border-[#0a0c0a]
                  focus:border-green-500 text-white px-3 h-[48px] sm:h-[50px] pt-0 pl-3.5 text-[13px] sm:text-[13.5px]
                  outline-none transition-all
                "
                placeholder=" "
              />

              <label
                className="
                  absolute left-4 top-1 text-gray-400 transition-all duration-300 pointer-events-none
                  peer-focus:-top-6 peer-focus:pb-0 peer-focus:left-0
                  peer-focus:text-[13px] peer-focus:text-green-500 peer-valid:left-0
                  peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-[14px]
                  peer-valid:-top-6 peer-valid:text-[13px] peer-valid:text-green-500
                "
              >
                Email
              </label>
            </div>

            {/* BUTTON + LINK */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-0 sm:justify-between sm:items-center">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full sm:w-max mt-1 bg-green-500 font-[600] text-[14px] sm:text-[15px] rounded-full px-6 py-3 cursor-pointer hover:bg-green-600 hover:scale-105 transition-all duration-300 text-[#373737]"
              >
                {isLoading ? "Sending..." : "Send Email"}
              </button>

              <Link href="/auth/signin" className="text-center sm:text-right">
                <h6 className="font-[500] text-[14px] sm:text-[15px] text-green-500">
                  Go To Login Page
                </h6>
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
);
}

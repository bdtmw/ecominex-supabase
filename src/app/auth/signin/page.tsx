// @ts-nocheck
"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast, ToastContainer } from "react-toastify";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useLoginMutation } from "@/lib/feature/auth/authThunk";
import { useDispatch } from "react-redux";
import { setCredentials } from "@/lib/feature/auth/authSlice";
import "react-toastify/dist/ReactToastify.css";
import { store } from "@/lib/store/store";
import { motion } from "framer-motion"; // 🪄 Animation library



interface LoginError {
  status?: number;
  data?: {
    message?: string;
  };
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [login, { isLoading }] = useLoginMutation();
  const router = useRouter();
  const dispatch = useDispatch();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const userData = await login({ email, password }).unwrap();

      console.log("login response", userData);

      // 1) 2FA ENABLED → send OTP and go to two-step page
      if (userData.requires2FA) {
        // store info for OTP step
        localStorage.setItem("TwoFAUserId", userData.userId || "");
        localStorage.setItem("TwoFAEmail", userData.email || email);
        localStorage.setItem("TwoFAType", "login");

        toast.info("A verification code has been sent to your email.");
        router.push("/auth/two-step-verification");
        return;
      }

      // 2) NORMAL LOGIN (no 2FA)
      if (!userData.user || !userData.token) {
        toast.error("Login response invalid. Please try again.");
        return;
      }

      // if setCredentials expects { user, token }
      dispatch(setCredentials({ user: userData.user, token: userData.token }));

      toast.success("Login successful!");

      localStorage.setItem("IsAuthenticate", "true");
      localStorage.setItem("token", userData.token);

      setTimeout(() => {
        if (userData.user.role === "user") {
          router.push("/user/dashboard");
        } else {
          router.push("/Dashboard");
        }
      }, 100);
    } catch (error) {
      const err = error as LoginError;
      if (err?.status === 404) {
        toast.error("User not found, please sign up.");
      } else if (err?.status === 400 || err?.status === 401) {
        toast.error(err?.data?.message || "Invalid email or password.");
      } else {
        toast.error("Login failed. Please try again later.");
      }
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#0a0f1a] via-[#0f172a] to-[#020617] text-white flex flex-col pb-16">
      <ToastContainer />

      {/* 🟢 Animated Ambient Glows */}
      <motion.div
        animate={{ y: [0, -20, 0], opacity: [0.5, 0.7, 0.5] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bg-[#22c55e] -right-10 top-20 blur-[140px] opacity-50 h-[300px] w-[220px]"
      ></motion.div>

      <motion.div
        animate={{ y: [0, 20, 0], opacity: [0.5, 0.7, 0.5] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bg-[#22c55e] -left-10 bottom-10 blur-[140px] opacity-50 h-[300px] w-[220px]"
      ></motion.div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="mx-auto mt-10 mb-12 max-w-3xl text-center relative z-10"
      >
        <h1 className="md:text-6xl text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-green-600">
          My <span className="text-white">Account</span>
        </h1>
        <div className="mx-auto w-16 h-1 bg-gradient-to-r from-green-400 to-green-600 rounded-full mt-3"></div>
        <div className="mt-4 text-sm text-gray-400">
          <Link href="/" className="hover:text-green-500 transition-colors">
            HOME
          </Link>
          <span className="mx-2">/</span>
          <span>MY ACCOUNT</span>
        </div>
      </motion.div>

      {/* Main Container */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.2 }}
        className="mx-auto w-full max-w-6xl space-y-8 px-4 md:px-8 relative z-10"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Login Section */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 150 }}
            className="bg-gray-800/40 backdrop-blur-lg border border-gray-700/60 shadow-[0_8px_32px_0_rgba(34,197,94,0.2)] rounded-2xl md:p-8 p-6 transition-all duration-300 hover:shadow-[0_8px_32px_0_rgba(34,197,94,0.35)]"
          >
            <h2 className="text-2xl font-bold text-green-400 mb-8">LOGIN</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email address <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-600 bg-gray-700/50 p-3 text-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 focus:outline-none transition-all"
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Password <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <input
                    type={passwordVisible ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-gray-600 bg-gray-700/50 p-3 text-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 focus:outline-none transition-all"
                    required
                  />
                  {passwordVisible ? (
                    <EyeOff
                      onClick={() => setPasswordVisible(false)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-400 hover:text-green-500 transition-colors"
                      size={18}
                    />
                  ) : (
                    <Eye
                      onClick={() => setPasswordVisible(true)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-400 hover:text-green-500 transition-colors"
                      size={18}
                    />
                  )}
                </div>
              </div>

              {/* Remember & Forgot */}
              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-gray-600 bg-gray-700 text-green-500 focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-300">Remember me</span>
                </label>
                <Link
                  href="/auth/forget-password"
                  className="text-sm text-green-400 hover:text-green-500 transition-colors"
                >
                  Lost your password?
                </Link>
              </div>

              {/* Button */}
              <button
                type="submit"
                className="w-full rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 py-3 text-white font-semibold tracking-wide shadow-lg shadow-green-500/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-green-500/50 disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? "Logging in..." : "LOG IN"}
              </button>
            </form>
          </motion.div>

          {/* Register Section */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 150 }}
            className="bg-gray-800/40 backdrop-blur-lg border border-gray-700/60 shadow-[0_8px_32px_0_rgba(34,197,94,0.2)] rounded-2xl md:p-8 p-6 transition-all duration-300 hover:shadow-[0_8px_32px_0_rgba(34,197,94,0.35)]"
          >
            <h2 className="text-2xl font-bold text-green-400 mb-8">REGISTER</h2>
            <div className="space-y-6">
              <p className="text-gray-300">
                Registering for this site allows you to access your order status and history.
                Just fill in the fields below, and we’ll get a new account set up for you in no time.
              </p>
              <div className="bg-gray-700/30 rounded-lg p-6 border border-gray-600">
                <h3 className="text-lg font-medium text-white mb-4">
                  Benefits of Creating an Account:
                </h3>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    Order tracking and history
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    Faster checkout process
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    Special offers and discounts
                  </li>
                </ul>
              </div>
              <Link href="/auth/signup">
                <button className="w-full mt-4 rounded-lg bg-white/10 backdrop-blur-sm py-3 text-white transition-all hover:bg-white/20 font-medium border border-gray-600">
                  CREATE AN ACCOUNT
                </button>
              </Link>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

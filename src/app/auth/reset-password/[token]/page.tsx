"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast, ToastContainer } from "react-toastify";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useResetPasswordMutation } from "@/lib/feature/auth/authThunk";
import "react-toastify/dist/ReactToastify.css";
import "@/css/style.css";
import { motion } from "framer-motion";



interface PasswordFieldProps {
  label: string;
  visible: boolean;
  toggle: () => void;
  onChange: (val: string) => void;
  value: string;
}



export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);

  const [resetPassword, { isLoading }] = useResetPasswordMutation();

  if (!token) {
    toast.error("Invalid password reset token");
    router.push("/auth/forgot-password");
    return;
  }


  const validatePassword = (pass: string) => {
    const errors = [];

    if (pass.length < 8) errors.push("Password must be at least 8 characters.");
    if (!/[A-Z]/.test(pass)) errors.push("Password must contain an uppercase letter.");
    if (!/[0-9]/.test(pass)) errors.push("Password must contain a number.");
    if (!/[!@#$%^&*(),.?\":{}|<>]/.test(pass))
      errors.push("Password must contain a special character.");

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    // ✅ Check password strength
    const passErrors = validatePassword(password);
    if (passErrors.length > 0) {
      passErrors.forEach((err) => toast.error(err));
      return;
    }

    try {
      const res = await resetPassword({
        token,
        Password: password,
      }).unwrap();

      toast.success(res.message || "Password updated successfully!");

      setTimeout(() => {
        router.push("/auth/signin");
      }, 1200);
    } catch (error: any) {
      console.log(error);

      toast.error(error?.data?.message || "Something went wrong.");
    }
  };

  return (
    <div className="relative overflow-hidden bg-[#000]">
      <ToastContainer />

      {/* BACKGROUND EFFECTS */}
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

      <div className="grid grid-cols-2 min-h-screen">
        {/* LEFT SIDE */}
        <div className="bg-[#000] h-full flex flex-col gap-4 justify-center px-16">
          <img className="w-24" src="/EmailGlow.png" alt="" />
          <div className="flex flex-col gap-9 justify-start items-start">
            <h1 className="text-[#f0f0f0] font-[500] text-[33px]">Check your email</h1>
            <div>
              <p className="text-[#dcdcdc] text-[15px] mt-1">
                If an account exists, you &apos; ll receive an email with a reset link.
              </p>
              <p className="text-[#dcdcdc] text-[15px] mt-3">
                Check your inbox and follow the password reset link.
              </p>
            </div>
            <Link href="/auth/signin">
              <button className="text-green-500 font-[500] mt-3 text-[15.5px]">
                Return to login
              </button>
            </Link>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="bg-[#111111] rounded-l-[20px] h-full flex flex-col gap-4 justify-center px-16">
          <img className="w-24" src="/GlowingKey.png" alt="" />

          <div className="flex flex-col gap-3">
            <h1 className="text-[#f0f0f0] font-[500] text-[33px]">Set New Password</h1>

            <form onSubmit={handleSubmit} className="w-[90%] flex flex-col gap-7 mt-3.5">
              <PasswordField
                label="Password"
                value={password}
                visible={passwordVisible}
                toggle={() => setPasswordVisible(!passwordVisible)}
                onChange={setPassword}
              />

              <PasswordField
                label="Confirm Password"
                value={confirmPassword}
                visible={confirmPasswordVisible}
                toggle={() => setConfirmPasswordVisible(!confirmPasswordVisible)}
                onChange={setConfirmPassword}
              />

              <button
                type="submit"
                disabled={isLoading}
                className="w-max mt-1 bg-green-500 font-[600] text-[15px] rounded-full px-6 py-3 cursor-pointer hover:bg-green-600 hover:scale-105 transition-all duration-300 text-[#373737]"
              >
                {isLoading ? "Updating..." : "Set new password"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

const PasswordField: React.FC<PasswordFieldProps> = ({
  label,
  visible,
  toggle,
  onChange,
  value,
}) => (
  <div className="relative w-full mt-0">
    <input
      type={visible ? "text" : "password"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required
      className="
        peer w-full bg-transparent border-b-2 bg-[#0a0c0a] border-[#0a0c0a]
        focus:border-green-500 text-white px-3 h-[50px] pl-3.5 text-[13.5px]
        outline-none transition-all
      "
      placeholder=" "
    />

    <label
      className="
        absolute left-4 top-1 text-gray-400 transition-all duration-300 pointer-events-none
        peer-focus:-top-6 peer-focus:left-0 peer-focus:text-[13px] peer-focus:text-green-500
        peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-[14px]
        peer-valid:-top-6 peer-valid:text-[13px] peer-valid:text-green-500
      "
    >
      {label}
    </label>

    {visible ? (
      <EyeOff
        onClick={toggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-400 hover:text-green-500 transition-colors"
        size={18}
      />
    ) : (
      <Eye
        onClick={toggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-400 hover:text-green-500 transition-colors"
        size={18}
      />
    )}
  </div>
);

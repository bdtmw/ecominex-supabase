"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import {
  useVerifyotpMutation,
  useResendOtpMutation,
  useVerifyLoginOtpMutation,
  useResendLoginOtpMutation,
} from "@/lib/feature/auth/authThunk";
import { useDispatch } from "react-redux";
import { setCredentials } from "@/lib/feature/auth/authSlice";

const TwoStepVerification: React.FC = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const [codes, setCodes] = useState<string[]>(Array(6).fill(""));

  // Signup/email verification
  const [verifyotp, { isLoading: isSignupVerifyLoading }] =
    useVerifyotpMutation();

  // Login 2FA verification
  const [verifyLoginOtp, { isLoading: isLoginVerifyLoading }] =
    useVerifyLoginOtpMutation();

  // Resend for signup verification
  const [resendOtp, { isLoading: isResendSignupLoading }] =
    useResendOtpMutation();

  // Resend for login 2FA
  const [resendLoginOtp, { isLoading: isResendLoginLoading }] =
    useResendLoginOtpMutation();

  const isSubmitting = isSignupVerifyLoading || isLoginVerifyLoading;
  const isResendLoading = isResendSignupLoading || isResendLoginLoading;

  // Detect mode once (login 2FA vs signup)
  const twoFAUserId =
    typeof window !== "undefined" ? localStorage.getItem("TwoFAUserId") : null;
  const twoFAEmail =
    typeof window !== "undefined" ? localStorage.getItem("TwoFAEmail") : null;
  const signupEmail =
    typeof window !== "undefined" ? localStorage.getItem("VerfiyEmail") : null;

  const isLogin2FA = !!twoFAUserId && !!twoFAEmail;

  useEffect(() => {
    const firstInput = document.getElementById("code-0");
    firstInput?.focus();
  }, []);

  const handleChange = (value: string, index: number) => {
    if (/^\d?$/.test(value)) {
      const newCodes = [...codes];
      newCodes[index] = value;
      setCodes(newCodes);

      if (value && index < 5) {
        const nextInput = document.getElementById(`code-${index + 1}`);
        nextInput?.focus();
      }
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    if (e.key === "Backspace" && !codes[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = codes.join("");

    if (fullCode.length < 6) {
      toast.error("⚠️ Please enter a 6-digit code.");
      return;
    }

    try {
      // LOGIN 2FA FLOW
      if (isLogin2FA && twoFAUserId && twoFAEmail) {
        const res = await verifyLoginOtp({
          userId: twoFAUserId,
          otp: fullCode,
        }).unwrap();

        dispatch(setCredentials({ user: res.user, token: res.token }));
        localStorage.setItem("IsAuthenticate", "true");
        localStorage.setItem("token", res.token);

        // clean up 2FA state
        localStorage.removeItem("TwoFAUserId");
        localStorage.removeItem("TwoFAEmail");
        localStorage.removeItem("TwoFAType");

        toast.success("✅ Verification successful!");

        if (res.user?.role === "admin") router.push("/Dashboard");
        else router.push("/user/dashboard");

        return;
      }

      // SIGNUP / EMAIL VERIFICATION FLOW
      if (!signupEmail) {
        toast.error("Email not found. Please register again.");
        router.push("/auth/signup");
        return;
      }

      const response = await verifyotp({
        email: signupEmail,
        otp: fullCode,
      }).unwrap();

      dispatch(
        setCredentials({ user: response.user, token: response.token })
      );
      localStorage.setItem("IsAuthenticate", "true");
      localStorage.setItem("token", response.token);
      localStorage.removeItem("VerfiyEmail");

      toast.success("✅ Verification successful!");

      if (response.user?.role === "admin") router.push("/Dashboard");
      else router.push("/user/dashboard");
    } catch (err: any) {
      console.error(err);
      toast.error(
        err?.data?.message || "❌ Invalid or expired OTP. Please try again."
      );
    }
  };

  const handleResend = async () => {
    try {
      // LOGIN 2FA RESEND
      if (isLogin2FA && twoFAEmail) {
        await resendLoginOtp({ email: twoFAEmail }).unwrap();
        toast.success("📧 A new login code has been sent to your email.");
        return;
      }

      // SIGNUP RESEND
      if (!signupEmail) {
        toast.error("Email not found. Please try again.");
        router.push("/auth/signin");
        return;
      }

      await resendOtp({ email: signupEmail }).unwrap();
      toast.success("📧 A new verification code has been sent to your email.");
    } catch (err) {
      console.error("Resend OTP error:", err);
      toast.error("❌ Failed to resend code. Please try again later.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0f15] px-4 py-6 md:py-0">
      <Toaster position="top-center" reverseOrder={false} />

      <div className="w-full max-w-md bg-[#181e26] border border-[#2a323f] rounded-2xl shadow-lg p-6 sm:p-8 md:p-10 md:py-12 text-center">
        <h1 className="text-2xl sm:text-3xl md:text-3xl font-extrabold text-[#4ade80] mb-2">
          {isLogin2FA ? "Two-Factor Authentication" : "Verify Your Account"}
        </h1>
        <p className="text-xs sm:text-sm md:text-base text-[#bfbfbf] mb-6 sm:mb-8">
          {isLogin2FA
            ? "Enter the 6-digit code we sent to your email to complete login."
            : "Enter the 6-digit code sent to your registered email to verify your account."}
        </p>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col items-center gap-5 sm:gap-6"
        >
          {/* OTP Inputs */}
          <div className="flex justify-between gap-2 sm:gap-3 w-full">
            {codes.map((code, index) => (
              <input
                key={index}
                id={`code-${index}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={code}
                onChange={(e) => handleChange(e.target.value, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                className="w-10 h-12 sm:w-12 sm:h-14 text-xl sm:text-2xl font-semibold text-white text-center rounded-lg border border-[#333b47] bg-[#11161d] focus:border-[#4ade80] outline-none transition"
              />
            ))}
          </div>

          {/* Resend Button */}
          <p className="text-xs sm:text-sm text-gray-400">
            Didn’t receive a code?{" "}
            <button
              type="button"
              onClick={handleResend}
              disabled={isResendLoading}
              className="text-[#4ade80] font-medium hover:underline disabled:opacity-60"
            >
              {isResendLoading ? "Resending..." : "Resend"}
            </button>
          </p>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 sm:py-3 mt-1 sm:mt-2 rounded-lg bg-[#4ade80] text-gray-900 font-semibold hover:bg-[#3bd570] transition disabled:opacity-70"
          >
            {isSubmitting ? "Verifying..." : "Verify"}
          </button>

          <span className="text-[10px] sm:text-xs text-gray-400 mt-2 sm:mt-3">
            ⚠️ Don’t share your verification code with anyone!
          </span>
        </form>
      </div>
    </div>
  );
};

export default TwoStepVerification;
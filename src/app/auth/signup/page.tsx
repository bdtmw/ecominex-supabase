// @ts-nocheck
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { useRegisterMutation } from "@/lib/feature/auth/authThunk";
import Select from "react-select";
import { getCountries, getCountryCallingCode } from "libphonenumber-js";
import { AsYouType, parsePhoneNumber } from "libphonenumber-js";
import { motion } from "framer-motion";

interface RegisterError {
  status?: number;
  data?: { message?: string };
}

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<any>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);

  const [register, { isLoading }] = useRegisterMutation();
  const router = useRouter();

  const countryOptions = getCountries().map((country) => ({
    value: country,
    label: `${new Intl.DisplayNames(["en"], { type: "region" }).of(
      country
    )} (+${getCountryCallingCode(country)})`,
    dialCode: getCountryCallingCode(country),
    fullName: new Intl.DisplayNames(["en"], { type: "region" }).of(country),
  }));

  const customStyles = {
    control: (base, state) => ({
      ...base,
      background: "rgba(31, 41, 55, 0.6)",
      borderColor: state.isFocused ? "#22c55e" : "#4B5563",
      boxShadow: state.isFocused
        ? "0 0 0 2px rgba(34, 197, 94, 0.3)"
        : "none",
      borderRadius: "0.5rem",
      padding: "0.25rem",
      "&:hover": { borderColor: "#22c55e" },
    }),
    menu: (base) => ({
      ...base,
      background: "#1F2937",
      border: "1px solid #374151",
    }),
    option: (base, { isFocused, isSelected }) => ({
      ...base,
      backgroundColor: isSelected
        ? "#22c55e"
        : isFocused
          ? "#374151"
          : "#1F2937",
      color: "white",
    }),
    singleValue: (base) => ({ ...base, color: "white" }),
    input: (base) => ({ ...base, color: "white" }),
  };

  useEffect(() => {
    const detectCountry = async () => {
      try {
        const response = await fetch("https://ipapi.co/json/");
        const data = await response.json();
        const countryOption = countryOptions.find(
          (option) => option.value === data.country_code
        );
        setSelectedCountry(countryOption || countryOptions.find((o) => o.value === "US"));
      } catch {
        setSelectedCountry(countryOptions.find((o) => o.value === "US"));
      } finally {
        setLoadingLocation(false);
      }
    };
    detectCountry();
  }, []);

  const validatePhoneNumber = (phone, country) => {
    if (!country) return false;
    try {
      const number = parsePhoneNumber(phone, country);
      return number && number.isValid();
    } catch {
      return false;
    }
  };

  const handlePhoneChange = (e) => {
    const { value } = e.target;
    if (selectedCountry) {
      const formatted = new AsYouType(selectedCountry.value).input(value);
      setPhoneNumber(formatted);
    } else {
      setPhoneNumber(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (password !== confirmPassword)
    return toast.error("Passwords do not match!");
  if (!agreedToTerms)
    return toast.error("Please agree to the terms and conditions.");
  if (!selectedCountry) return toast.error("Please select a country!");
  if (!validatePhoneNumber(phoneNumber, selectedCountry.value))
    return toast.error("Please enter a valid phone number!");

  const formattedPhone = `+${selectedCountry.dialCode}${phoneNumber.replace(
    /\D/g,
    ""
  )}`;

  try {
    const res = await register({
      firstName,
      lastName,
      email,
      password,
      country: selectedCountry.value,
      countryName: selectedCountry.fullName,
      phoneNumber: formattedPhone,
      referralCode: referralCode,
    }).unwrap();

    console.log("register response:", res);

    localStorage.setItem("VerfiyEmail", res.email);
    toast.success("Registration successful! Please verify your email.");
    router.push("/auth/two-step-verification");
  } catch (error: any) {
    console.error("Register API error:", error);

    let errorMessage = "Something went wrong. Please try again.";

    // RTK Query (fetchBaseQuery) error shape: { status, data: { message } }
    if (error?.data?.message) {
      errorMessage = error.data.message;
    } else if (typeof error === "string") {
      errorMessage = error;
    } else if (error?.message) {
      errorMessage = error.message;
    }

    toast.error(errorMessage);
  }
};

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#0a0f1a] via-[#0f172a] to-[#020617] text-white flex flex-col pb-16">
      {/* Soft Glows */}
      <div className="absolute bg-[#22c55e] -left-24 bottom-0 blur-[160px] opacity-40 h-[350px] w-[280px]" />
      <div className="absolute bg-[#22c55e] -right-24 top-0 blur-[160px] opacity-40 h-[350px] w-[280px]" />

      <ToastContainer />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="mx-auto mt-12 mb-12 max-w-3xl text-center"
      >
        <h1 className="md:text-6xl text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-500">
          Create <span className="text-white">Account</span>
        </h1>
        <p className="text-gray-400 mt-3 text-sm md:text-base">
          Join us and explore the future of digital growth.
        </p>
        <div className="mt-4 text-sm text-gray-300">
          <Link href="/" className="hover:text-green-400 transition-colors">
            HOME
          </Link>
          <span className="mx-2">/</span>
          <span>REGISTER</span>
        </div>
      </motion.div>

      {/* Register Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="mx-auto w-full max-w-2xl space-y-6"
      >
        {/* Register Form */}
        <div className="bg-gray-800/40 backdrop-blur-lg rounded-2xl md:p-8 p-5 shadow-[0_8px_32px_rgba(34,197,94,0.15)] border border-gray-700/60 hover:shadow-[0_8px_32px_rgba(34,197,94,0.3)] transition-all duration-300">
          <h2 className="mb-8 text-2xl font-bold text-center text-green-400 tracking-wide">
            REGISTER
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 md:gap-6 gap-4">
              <InputField max={20}  requireds={true} label="First Name" value={firstName} onChange={setFirstName} />
              <InputField  max={20} requireds={true} label="Last Name" value={lastName} onChange={setLastName} />
            </div>

            <InputField
              label="Email address"
              type="email"
              value={email}
              requireds={true}
              onChange={setEmail}
            />

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Country<span className="text-red-500 ml-1">*</span>
                </label>
                <Select
                  options={countryOptions}
                  value={selectedCountry}
                  onChange={setSelectedCountry}
                  isLoading={loadingLocation}
                  styles={customStyles}
                  placeholder="Select a country"
                  className="text-sm"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Phone Number<span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative flex">
                  <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-600 bg-gray-700/50 text-gray-300">
                    {selectedCountry ? `+${selectedCountry.dialCode}` : "+"}
                  </span>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={handlePhoneChange}
                    className="w-full rounded-r-lg border border-gray-600 bg-gray-700/50 p-3 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 focus:outline-none transition-all"
                    required
                  />
                </div>
              </div>
            </div>

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
              visible={passwordVisible}
              toggle={() => setPasswordVisible(!passwordVisible)}
              onChange={setConfirmPassword}
            />

            
            <InputField
              label="Referral Code (Optional)"
              type="text"
              value={referralCode}
              onChange={setReferralCode}
            />


            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="terms"
                checked={agreedToTerms}
                onChange={() => setAgreedToTerms(!agreedToTerms)}
                className="rounded border-gray-600 bg-gray-700 text-green-500 focus:ring-green-500"
              />
              <label htmlFor="terms" className="text-sm text-gray-300">
                I agree to the{" "}
                <Link
                  href="/terms"
                  className="text-green-400 hover:text-green-500 transition-colors"
                >
                  Terms and Conditions
                </Link>
              </label>
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 py-3 text-white font-semibold tracking-wide shadow-lg shadow-green-500/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-green-500/40 disabled:opacity-50"
              disabled={isLoading || !agreedToTerms}
            >
              {isLoading ? "Registering..." : "REGISTER"}
            </button>
          </form>
        </div>

        <div className="text-center bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-gray-700 mb-10">
          <p className="text-gray-300">
            Already have an account?{' '}
            <Link href="/auth/signin" className="text-green-400 hover:text-green-500 transition-colors">
              Log in
            </Link>
          </p>
        </div>

      </motion.div>
    </div>
  );
}

const InputField = ({ label, value, onChange, type = "text"  , requireds , max }) => (
  <div>
    <label className="mb-2 block text-sm font-medium text-gray-300">
      {label}
      <span className="text-red-500 ml-1">*</span>
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-gray-600 bg-gray-700/50 p-3 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 focus:outline-none transition-all"
      required={requireds || false}
      maxLength={max}
    />
  </div>
);

const PasswordField = ({ label, value, onChange, visible, toggle }) => (
  <div>
    <label className="mb-2 block text-sm font-medium text-gray-300">
      {label}
      <span className="text-red-500 ml-1">*</span>
    </label>
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-600 bg-gray-700/50 p-3 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 focus:outline-none transition-all"
        required
      />
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
  </div>
);

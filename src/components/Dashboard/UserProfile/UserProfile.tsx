// @ts-nocheck

"use client";
import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/store/store";
import { useUpdateProfileMutation } from "@/lib/feature/auth/authThunk";
import Image from "next/image";
import { toast, ToastContainer } from "react-toastify";
import Swal from "sweetalert2";

const UserProfile = () => {
  const { user } = useSelector((state: RootState) => state.auth);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    country: "",
    phoneNumber: "",
  });

  const [updateProfile, { isLoading }] = useUpdateProfileMutation();

  // 🟢 When component loads, fill input fields with user data
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        country: user.country || "",
        phoneNumber: user.phoneNumber || "",
      });
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const hasChanges = Object.entries(formData).some(
      ([key, value]) => value !== (user?.[key] || "")
    );

    if (!hasChanges) {
      Swal.fire({
        icon: "info",
        title: "No Changes Found",
        text: "You haven't updated anything.",
        timer: 1800,
        showConfirmButton: false,
      });
      return;
    }

    try {
      await updateProfile(formData).unwrap();

      Swal.fire({
        icon: "success",
        title: "Profile Updated!",
        text: "Your details have been saved successfully.",
        timer: 2000,
        showConfirmButton: false,
        background: "#1e1e1e",
        color: "#fff",
      });

    } catch (error) {
      console.error("Error updating profile:", error);

      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text: "Something went wrong. Please try again.",
        background: "#1e1e1e",
        color: "#fff",
      });
    }
  };

  if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-transparent">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-green-500"></div>
            </div>
        );
    }


  return (
  <>
    <section className="bg-[#1b1b1b] px-3 sm:px-4 md:px-5 mx-0 md:mx-2 py-6 md:py-8 rounded-[10px]">
      {/* TOP USER SECTION */}
      <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-center md:items-center text-center md:text-left border-b-[1px] pb-5 md:pb-7 border-[#969696a0]">
        <Image
          src={"/userdash.jpg"}
          width={110}
          height={110}
          alt="User"
          className="rounded-full w-20 h-20 md:w-[110px] md:h-[110px] object-cover"
        />

        <div>
          <h1 className="text-white text-2xl sm:text-3xl md:text-3xl font-bold">
            {user?.firstName} {user?.lastName || ""}
          </h1>
          <p className="text-gray-300 mt-1 font-[500] text-sm sm:text-base">
            {user?.email}
          </p>
        </div>
      </div>

      {/* FORM START */}
      <div className="px-0 sm:px-1 mt-6 md:mt-8">
        <h2 className="text-lg sm:text-xl md:text-[21px] font-[500] text-white">
          Profile Details
        </h2>
        <p className="text-xs sm:text-sm text-zinc-400">
          Manage your account information
        </p>

        <form onSubmit={handleSubmit} className="space-y-5 pt-5 md:pt-6">
          {/* NAME ROW */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="space-y-2">
              <label className="text-gray-100 font-[500] tracking-[0.3px] text-[14px] sm:text-[15px] block">
                First Name
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                className="border border-zinc-400 px-3 sm:px-4 rounded-[5px] text-[14px] sm:text-[15px] h-11 md:h-[50px] bg-transparent text-[#f9f9f9] w-full font-[500]"
                placeholder="Enter your first name"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-gray-100 font-[500] tracking-[0.3px] text-[14px] sm:text-[15px] block">
                Last Name
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                className="border border-zinc-400 px-3 sm:px-4 rounded-[5px] text-[14px] sm:text-[15px] h-11 md:h-[50px] bg-transparent text-[#f9f9f9] w-full font-[500]"
                placeholder="Enter your last name"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* EMAIL */}
          <div className="space-y-2">
            <label className="text-gray-100 font-[500] tracking-[0.3px] text-[14px] sm:text-[15px]">
              Email
            </label>
            <div className="border-zinc-400 border rounded-[5px] px-3 sm:px-4 h-11 md:h-[50px] font-[500] bg-transparent text-[#f9f9f9] text-[13px] sm:text-[14px] placeholder:text-gray-300 flex items-center">
              {user?.email}
            </div>
          </div>

          {/* COUNTRY + PHONE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="space-y-2">
              <label className="text-gray-100 font-[500] tracking-[0.3px] text-[14px] sm:text-[15px] block">
                Country
              </label>
              <input
                name="country"
                value={formData.country}
                onChange={handleInputChange}
                className="border border-zinc-400 px-3 sm:px-4 rounded-[5px] text-[14px] sm:text-[15px] h-11 md:h-[50px] bg-transparent text-[#f9f9f9] w-full font-[500]"
                placeholder="Enter your country"
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-gray-100 font-[500] tracking-[0.3px] text-[14px] sm:text-[15px] block">
                Phone Number
              </label>
              <input
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                className="border border-zinc-400 px-3 sm:px-4 rounded-[5px] text-[14px] sm:text-[15px] h-11 md:h-[50px] bg-transparent text-[#f9f9f9] w-full font-[500]"
                placeholder="Enter your phone number"
                disabled={isLoading}
                required
              />
            </div>
          </div>

          {/* SAVE BUTTON */}
          <div className="flex justify-center md:justify-start pt-3 md:pt-4">
            <button
              disabled={isLoading}
              className="border border-green-500 font-[600] text-[13px] sm:text-[13.5px] rounded-full px-6 sm:px-8 py-2.5 sm:py-3.5 text-white hover:bg-green-600 hover:scale-105 transition-all"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </span>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
          <ToastContainer />
        </form>
      </div>
    </section>
  </>
);
};

export default UserProfile;

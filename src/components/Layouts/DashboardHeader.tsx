"use client";

import React from "react";
import { Search, Settings } from "lucide-react";
import userImg from "../../../public/userdash.jpg";
import Image from "next/image";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/store/store";
import Link from "next/link";
import DepositStepForm from "../myAccount/DepositStepForm";

const DashboardHeader = ({ children }: { children?: React.ReactNode }) => {
  // ✅ Move useSelector *inside* the component
  const { user, isAuthenticated } = useSelector(
    (state: RootState) => state.auth
  );

  return (
    <div>
      {/* Header Bar */}
      <div className="flex justify-between items-center bg-[#2e2e2ea2] rounded-md p-4 mb-4">
        {/* LEFT SIDE — Search Bar */}
        <div className="relative w-full max-w-2xl">
          {/* <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white z-10 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search..."
            name="search"
            className="text-white placeholder-gray-300 bg-white/10 backdrop-blur-md border border-white/20 rounded-[30px] p-2 pl-10 w-full outline-none focus:border-[#21eb00] focus:shadow-[0_0_5px_#21eb00] transition"
          />
           */}
          <h2 className="text-3xl font-semibold mb-2">
            Welcome back,{" "}
            <span className="text-[#21eb00]">{user?.firstName} {user?.lastName}</span>
          </h2>
        </div>

        {/* RIGHT SIDE — Icons + Profile */}
        <div className="flex items-center gap-6">
          {/* Icons */}
          <div>
            {isAuthenticated && (
              <DepositStepForm
                style={true}
              />
            )}
          </div>
          <div className="flex items-center gap-4">

            <Link href="/Dashboard/UserProfile">
              <Settings
                size={20}
                className="bg-black text-white w-[42px] h-[40px] p-2 rounded-[30px] cursor-pointer transition-all duration-300 hover:bg-white hover:text-black border border-transparent hover:border-black"
              />
            </Link>
          </div>


          {/* Profile */}
          {/* <div className="flex items-center gap-3">
            <Image
              src={userImg}
              alt="Profile"
              className="w-10 h-10 rounded-full object-cover border border-gray-300"
            />
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold text-white">
                {user?.firstName && user?.lastName
                  ? `${user.firstName} ${user.lastName}`
                  : "Unnamed User"}
              </span>
              <span className="text-xs text-white">
                {user?.email || "noemail@domain.com"}
              </span>
            </div>
          </div> */}
        </div>
      </div>

      {/* Dashboard Content Below Header */}
      {/* <div className="mt-4">{children}</div> */}
    </div>
  );
};

export default DashboardHeader;

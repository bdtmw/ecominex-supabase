"use client";

import React from "react";
import Link from "next/link";
import { Instagram, Twitter } from "lucide-react";

const HeroAbout = () => {
  return (
    <section
      className="py-16 px-4 sm:px-6 md:py-20 md:px-9 bg-cover bg-center bg-no-repeat text-white relative overflow-hidden"
    >
      {/* Green blur – keep on md+ to avoid overpowering small screens */}
      <div className="absolute overflow-hidden bg-[#22c55e] md:-right-20 -right-10 top-0 blur-[139px] h-[200px] w-[180px] md:h-[250px] md:w-[208px] hidden sm:block"></div>

      <div className="flex flex-col md:flex-row gap-10">
        {/* Left Content */}
        <div className="px-2 sm:px-4 md:px-10 py-6 md:py-10 flex-1 flex flex-col gap-3">
          <h4 className="px-4 sm:px-5 font-[500] text-xs sm:text-sm md:text-[15px] py-1.5 rounded-full w-max bg-[#22c55e] text-center">
            Some Words About Us
          </h4>

          <div className="flex items-center space-x-3 flex-wrap">
            <span className="text-[60px] font-bold mt-3 sm:text-4xl md:text-[60px] font-bold">
              About Ecomine
            </span>
            <div className="flex -ml-1 mt-3 sm:-ml-2 h-10 w-10 md:h-[50px] md:w-[50px] items-center justify-center rounded-full bg-green-500">
              <span className="text-2xl md:text-4xl font-bold">X</span>
            </div>
          </div>

          <p className="text-[16px] leading-[25px] mt-5 sm:text-[15px] md:text-[16px] leading-relaxed md:leading-[25px] w-full md:w-[75%]">
            Your Gateway to Smarter, Stronger Crypto Mining.
            At Ecomine X, we’re more than just a mining company — we’re a global
            community built around innovation, reliability, and growth.
            Headquartered in Canada, we empower individuals and businesses to
            tap into the world of cryptocurrency mining with confidence and
            simplicity.
          </p>

          <p className="text-sm sm:text-[15px] md:text-[16.5px] font-semibold pt-2 leading-relaxed md:leading-[25px] w-full md:w-[75%]">
            Join us today and experience a smarter way to mine — where your
            success is powered by precision, innovation, and community.
          </p>
        </div>

        {/* Right Content with Social Icons */}
        <div className="px-2 sm:px-4 md:px-10 py-2 md:py-10 w-full md:w-max">
          <div className="flex md:justify-end justify-start sm:justify-center md:justify-end gap-3 mt-4 md:mt-3">
            <Link
              href="https://www.tiktok.com/@ecominex.net"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#5e7467a4] hover:bg-[#22c55e] transition-all p-3 rounded-full relative z-50"
            >
              <svg
                viewBox="0 0 256 256"
                width="22"
                height="22"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fill="#25F4EE"
                  d="M170 80c11 8 24 13 37 14v32c-14-1-27-5-39-12v57c0 36-29 65-65 65s-65-29-65-65 29-65 65-65c5 0 9 .6 13 1v34c-4-2-9-3-14-3-18 0-32 14-32 32s14 32 32 32 32-14 32-32V32h36c2 21 13 39 32 48z"
                />
                <path
                  fill="#FE2C55"
                  d="M160 80c11 8 24 13 37 14v32c-14-1-27-5-39-12v57c0 36-29 65-65 65s-65-29-65-65 29-65 65-65c5 0 9 .6 13 1v34c-4-2-9-3-14-3-18 0-32 14-32 32s14 32 32 32 32-14 32-32V32h30v6c2 19 12 35 33 42z"
                />
                <path
                  fill="#fff"
                  d="M165 81c11 8 24 13 38 14v32c-15-1-28-5-41-12v56c0 34-28 62-62 62s-62-28-62-62 28-62 62-62c4 0 8 .5 12 1v34c-4-2-9-3-14-3-17 0-31 14-31 31s14 31 31 31 31-14 31-31V31h36c1 20 12 38 31 47z"
                />
              </svg>
            </Link>

            <Link
              href="https://www.instagram.com/ecominex/"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#5e7467a4] hover:bg-[#22c55e] transition-all p-3 rounded-full relative z-50"
            >
              <Instagram size={22} strokeWidth={1.8} />
            </Link>

            <Link
              href="https://x.com/EcominexN59053"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#5e7467a4] hover:bg-[#22c55e] transition-all p-3 rounded-full relative z-50"
            >
              <Twitter size={22} strokeWidth={1.8} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroAbout;
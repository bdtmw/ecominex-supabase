// @ts-nocheck

"use client";
import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Bitcoin, Instagram, Twitter, Music2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import Carousel from "./Carousel";

// Define RootState interface for TypeScript
interface RootState {
    auth: {
        isAuthenticated: boolean;
    };
}

const MiningHeroSlider = () => {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const router = useRouter();

    // Get authentication state from Redux
    const { isAuthenticated } = useSelector((state: RootState) => state.auth);

    // Handle button click based on authentication
    const handleStartMiningClick = () => {
        if (isAuthenticated) {
            router.push("/shop/");
        } else {
            router.push("/auth/signin/");
        }
    };

    const slides = [
        {
            title: "Start Mining",
            subtitle: "Today",
            subheader: "",
            description:
                "Your  solution for buying, selling, and mining cryptocurrencies",
            image: "/hh.png",
            stats: [
                {
                    value: "98%",
                    label: "Average Uptime",
                    subtext: "With stable & secure infrastructures",
                },
                {
                    value: "$0.055",
                    prefix: "From",
                    label: "per KW/h",
                    subtext: "The best rates on the market",
                },
                {
                    value: "10MW",
                    label: "Under Management",
                    subtext: "An ever-expanding portfolio of data centers",
                },
                {
                    value: "“20,000+",
                    label: "Machines Sold",
                    subtext: "We sell and deliver worldwide",
                },
            ],
        },
    ];

    const nextSlide = () => {
        if (!isAnimating) {
            setIsAnimating(true);
            setCurrentSlide((prev) => (prev + 1) % slides.length);
            setTimeout(() => setIsAnimating(false), 700);
        }
    };

    const prevSlide = () => {
        if (!isAnimating) {
            setIsAnimating(true);
            setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
            setTimeout(() => setIsAnimating(false), 700);
        }
    };

    return (
  <>
    <section className="py-12 sm:py-16 lg:py-20">
      {/* TOP CONTENT */}
      <div>
        <div className="text-white flex flex-col gap-4 text-center lg:text-left px-4 sm:px-6 lg:px-0">
          {/* Heading + Icons */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-6">
            <h1 className="font-[700] text-[60px] sm:text-[40px] lg:text-[60px] leading-tight">
              Start Mining Today
            </h1>

            {/* Social Icons */}
            <div className="relative flex justify-center lg:justify-end">
              <div className="absolute bg-[#22c55e] -right-10 top-0 blur-[139px] h-[220px] w-[180px]" />
              <div className="flex gap-3 relative ">
                <Link
                                        href="https://www.tiktok.com/@ecominex.net"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="bg-[#1f1f1f] text-white px-2.5 flex items-center rounded-full hover:bg-[#00a63e] transition-all duration-300 hover:scale-110"
                                    >
                                        <svg viewBox="0 0 256 256" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                                            <path fill="#25F4EE" d="M170 80c11 8 24 13 37 14v32c-14-1-27-5-39-12v57c0 36-29 65-65 65s-65-29-65-65 29-65 65-65c5 0 9 .6 13 1v34c-4-2-9-3-14-3-18 0-32 14-32 32s14 32 32 32 32-14 32-32V32h36c2 21 13 39 32 48z" />
                                            <path fill="#FE2C55" d="M160 80c11 8 24 13 37 14v32c-14-1-27-5-39-12v57c0 36-29 65-65 65s-65-29-65-65 29-65 65-65c5 0 9 .6 13 1v34c-4-2-9-3-14-3-18 0-32 14-32 32s14 32 32 32 32-14 32-32V32h30v6c2 19 12 35 33 42z" />
                                            <path fill="#fff" d="M165 81c11 8 24 13 38 14v32c-15-1-28-5-41-12v56c0 34-28 62-62 62s-62-28-62-62 28-62 62-62c4 0 8 .5 12 1v34c-4-2-9-3-14-3-17 0-31 14-31 31s14 31 31 31 31-14 31-31V31h36c1 20 12 38 31 47z" />
                                        </svg>

                                    </Link>
                <Link
                  href="https://www.instagram.com/ecominex/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#1f1f1f] p-2.5 sm:p-3 rounded-full hover:bg-[#00a63e] transition hover:scale-110"
                >
                  <Instagram className="w-5 h-5" />
                </Link>
                <Link
                  href="https://x.com/EcominexN59053"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#1f1f1f] p-2.5 sm:p-3 rounded-full hover:bg-[#00a63e] transition hover:scale-110"
                >
                  <Twitter className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Subtitle */}
          <span className="flex items-center justify-center lg:justify-start gap-2 mt-2 whitespace-nowrap">
  <span className="w-8 sm:w-10 h-1 bg-white" />
  <h3 className="text-[16px] sm:text-[18px] lg:text-[34px] italic font-[500]">
    Turnkey Solution
  </h3>
</span>

          {/* Description */}
          <p className="mt-1 text-[13px] sm:text-[14px] leading-[20px] mx-auto lg:mx-0 w-full sm:w-[70%] lg:w-[40%]">
            Your solution for buying, selling, and mining cryptocurrencies
          </p>

          {/* Button */}
          <div className="flex justify-center lg:justify-start mt-3">
            <Link href="/shop">
              <button className="bg-green-500 font-[600] text-[14px] sm:text-[15px] rounded-full px-6 sm:px-8 py-2.5 hover:bg-green-600 hover:scale-105 transition">
                Let&apos;s start
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* STATS + CAROUSEL */}
      <div className="flex flex-col lg:flex-row items-center mt-10 lg:mt-14 relative  gap-10 lg:gap-12 px-4 sm:px-6 lg:px-0">
        {/* Stats Grid */}
        <div className="relative w-full lg:w-[47%]">
          <div className="absolute bg-[#22c55e] blur-[139px] -left-10 h-[180px] w-[208px]" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative ">
            {[
              ["98%", "Average Uptime", "With stable & secure infrastructures"],
              ["From $0.02", "per KW/h", "The best rates on the market."],
              ["10MW", "Under Management", "An ever-expanding portfolio of data centers."],
              ["20,000+", "Machines Sold", "We sell and deliver worldwide"],
            ].map(([value, title, desc], i) => (
              <div
                key={i}
                className="bg-[#292929] py-4 sm:py-6 rounded-[10px] pl-5 sm:pl-6"
              >
                <h3 className="text-green-500 font-[550] text-[22px] sm:text-[26px] lg:text-[30px]">
                  {value}
                </h3>
                <h6 className="font-[550] text-white text-[14px] sm:text-[16px]">
                  {title}
                </h6>
                <p className="text-[#d5d5d5] text-[12.5px] sm:text-[13.5px] w-[90%] leading-[18px]">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Carousel */}
        <div className="w-full lg:w-auto flex justify-center lg:block">
          {/* On desktop keep original absolute positioning */}
          <div className="w-full sm:w-[80%] md:w-[70%] lg:w-auto lg:absolute lg:right-0 lg:-top-28">
            <Carousel />
          </div>
        </div>
      </div>
    </section>
  </>
);

};

export default MiningHeroSlider;

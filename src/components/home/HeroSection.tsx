// @ts-nocheck

"use client";
import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Bitcoin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";

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
          value: "5000+",
          label: "Ecominex Sold",
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
    <div className="relative min-h-screen w-full overflow-hidden bg-[#101010]">
      {/* Geometric Background Animation */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute h-8 w-8 transform"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `floatGeometry ${15 + Math.random() * 10}s infinite linear`,
                animationDelay: `${Math.random() * 5}s`,
                transform: `rotate(${Math.random() * 360}deg)`,
              }}
            >
              <div
                className="h-full w-full border border-green-500 opacity-50"
                style={{
                  clipPath:
                    i % 3 === 0
                      ? "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)"
                      : i % 3 === 1
                        ? "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)"
                        : "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="relative mx-auto max-w-7xl px-6 py-12">
        {/* Social Links with Hover Effects */}
        <div className="absolute right-8 top-8 z-10 flex space-x-6">
          {["Instagram", "Twitter", "LinkedIn"].map((platform) => (
            <a
              key={platform}
              href="#"
              className="group relative overflow-hidden rounded-full p-2 transition-all hover:bg-green-500/10"
            >
              <span className="absolute inset-0 transform opacity-0 transition-all duration-300 group-hover:opacity-100">
                <div className="animate-spin-slow h-full w-full rounded-full border border-green-500/50" />
              </span>
              <span className="relative block text-gray-400 transition-colors group-hover:text-green-500">
                <svg
                  className="h-6 w-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  {platform === "Instagram" && (
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  )}
                  {platform === "Twitter" && (
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                  )}
                  {platform === "LinkedIn" && (
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  )}
                </svg>
              </span>
            </a>
          ))}
        </div>

        {/* Hero Content Grid */}
        <div className="grid gap-12 pt-24 lg:grid-cols-2">
          {/* Left Column */}
          <div className="space-y-12">
            <div className="space-y-6">
              <div className="relative">
                <div className="animate-width h-1 w-24 bg-green-500" />
                <div className="absolute -top-1 left-0 h-3 w-3 animate-pulse rounded-full bg-green-500" />
              </div>

              <h1 className="animate-slideUp space-y-2 text-6xl font-bold leading-tight text-white">
                {slides[currentSlide].title}
                <br />
                <span className="bg-gradient-to-r from-green-500 to-green-300 bg-clip-text text-transparent">
                  {slides[currentSlide].subtitle}
                </span>
              </h1>

              <h2 className="animate-slideUp text-4xl font-bold text-white">
                {slides[currentSlide].subheader}
              </h2>

              <p className="animate-slideUp text-lg text-gray-400">
                {slides[currentSlide].description}
              </p>
            </div>

            {/* Updated CTA Button */}
            <button
              onClick={handleStartMiningClick}
              className="group relative overflow-hidden rounded-full bg-green-500 px-8 py-4 text-white transition-all hover:bg-green-600"
            >
              <span className="relative z-10 flex items-center justify-center space-x-2">
                <span>Let&apos;s Start</span>
              </span>
              <div className="absolute inset-0 -translate-x-full transform bg-green-400 transition-transform group-hover:translate-x-0" />
            </button>

            {/* Stats Grid with Hover Effects */}
            <div className="grid grid-cols-2 gap-6">
              {slides[currentSlide].stats.map((stat, index) => (
                <div
                  key={index}
                  className="group relative overflow-hidden rounded-lg border border-gray-800 bg-black bg-opacity-50 p-6 transition-all duration-300 hover:border-green-500"
                  style={{ animationDelay: `${0.1 + index * 0.1}s` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500/0 via-green-500/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                  <div className="relative space-y-2">
                    <span className="mb-2 block text-2xl">{stat.icon}</span>
                    <div className="flex items-baseline space-x-1">
                      {stat.prefix && (
                        <span className="text-gray-400">{stat.prefix}</span>
                      )}
                      <span className="text-3xl font-bold text-green-500">
                        {stat.value}
                      </span>
                    </div>
                    <div className="font-medium text-white">{stat.label}</div>
                    <div className="text-sm text-gray-500">{stat.subtext}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column - Image Section */}
          <div className="relative max-h-96 overflow-hidden rounded-2xl md:mt-48">
            <div className="absolute inset-0 z-10 bg-gradient-to-r from-green-500/20 to-transparent" />
            <div className="absolute inset-0 z-20 bg-[#101010]/20" />

            <Image
              src="/hh.png"
              alt="Mining Facility"
              className="h-full w-full transform object-cover transition-transform duration-700 hover:scale-110"
              width={400}
              height={300}
            />

            {/* Decorative Elements */}
            <div className="absolute inset-0 z-30">
              <div className="absolute left-4 top-4 h-20 w-20 rounded-full border border-green-500/30" />
              <div className="absolute bottom-4 right-4 h-32 w-32 rounded-full border border-green-500/20" />
            </div>
          </div>
        </div>

        {/* Navigation */}
      </div>

      {/* Progress Bar */}

      <style jsx>{`
        @keyframes float {
          0% {
            transform: translate(0, 0) rotate(45deg);
          }
          50% {
            transform: translate(-20px, 20px) rotate(45deg);
          }
          100% {
            transform: translate(0, 0) rotate(45deg);
          }
        }

        @keyframes slideUp {
          0% {
            transform: translateY(20px);
            opacity: 0;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes width {
          0% {
            width: 0;
          }
          100% {
            width: 5rem;
          }
        }
      `}</style>
    </div>
  );
};

export default MiningHeroSlider;

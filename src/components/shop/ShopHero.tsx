import React from "react";
import { CircuitBoard, Cpu, Gauge, Zap } from "lucide-react";
import Link from "next/link";

const HeroSection = () => {
  return (
    <div className="relative min-h-[90vh] overflow-hidden bg-primary">
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-10">
        <div className="grid h-full w-full grid-cols-12">
          {[...Array(144)].map((_, i) => (
            <div key={i} className="border border-white/10" />
          ))}
        </div>
      </div>

      {/* Floating icons */}
      <div className="absolute inset-0 overflow-hidden">
        {[Cpu, CircuitBoard, Gauge, Zap].map((Icon, index) => (
          <div
            key={index}
            className={`absolute opacity-20 animate-float-${index + 1}`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
          >
            <Icon size={48} className="text-secondary" />
          </div>
        ))}
      </div>

      {/* Main content */}
      <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-20 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="mb-6 text-2xl font-bold tracking-tight text-white md:text-5xl">
            Power Your Future with
            <span className="400 bg-secondary bg-clip-text text-transparent">
              {" "}
              Mining Excellence
            </span>
          </h1>
          <p className="mx-auto mb-12 max-w-3xl text-xl text-gray-300">
            Unleash the potential of blockchain technology with our cutting-edge
            mining solutions. Industry-leading performance meets next-generation
            efficiency.
          </p>

          {/* Stats section */}
          <div className="mx-auto mt-16 grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <Gauge className="mx-auto mb-4 h-12 w-12 text-secondary" />
              <h3 className="mb-2 text-2xl font-bold text-white">140+ TH/s</h3>
              <p className="text-gray-400">Maximum Hashrate</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <Zap className="mx-auto mb-4 h-12 w-12 text-secondary" />
              <h3 className="mb-2 text-2xl font-bold text-white">98%</h3>
              <p className="text-gray-400">Power Efficiency</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <Cpu className="mx-auto mb-4 h-12 w-12 text-secondary" />
              <h3 className="mb-2 text-2xl font-bold text-white">24/7</h3>
              <p className="text-gray-400">Technical Support</p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="mt-12 flex flex-col justify-center gap-4 sm:flex-row">
            <Link href="/contactUs">
              <button className="rounded-lg border border-secondary bg-transparent px-8 py-4 font-semibold text-white transition-colors hover:bg-white/5">
                Contact Us
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;

import React from "react";
import { TrendingUp, Users, Server, Zap } from "lucide-react";

const ModernAboutSegments = () => {
  const stats = [
    {
      number: "6+",
      label: "Years of Experience",
      icon: <TrendingUp className="h-6 w-6" />,
    },
    {
      number: "300+",
      label: "Happy Clients",
      icon: <Users className="h-6 w-6" />,
    },
    {
      number: "20000+",
      label: "Machines Sold",
      icon: <Server className="h-6 w-6" />,
    },
    {
      number: "10+",
      label: "Power Available (MW)",
      icon: <Zap className="h-6 w-6" />,
    },
  ];

  return (
    <div className="animate-fade-in min-h-screen bg-primary">
      <div className="mx-auto max-w-6xl px-4 py-20">
        <div className="mb-16 text-center transition-all duration-300 ease-in-out hover:scale-105 hover:transform">
          <h1 className="mb-4 bg-gradient-to-r from-white via-[#21eb00] to-white bg-clip-text text-5xl font-bold text-transparent">
            About Segments
          </h1>

          <h2 className="mb-8 text-3xl font-medium text-white">
            Crypto Mining Company in Canada, UAE
          </h2>
        </div>

        <div className="mb-16 grid gap-8 md:grid-cols-2">
          <div className="rounded-2xl border border-[#21eb00]/20 bg-black/40 p-8 transition-all duration-300 ease-in-out hover:border-[#21eb00]/50">
            <p className="leading-relaxed text-gray-300">
              We have mined cryptocurrency and tokens for ourselves since 2017.
              We know the problems you will face in UAE. Procurement,
              infrastructure, hosting, maintenance, risk management, and
              financing.
            </p>
          </div>

          <div className="rounded-2xl border border-[#21eb00]/20 bg-black/40 p-8 transition-all duration-300 ease-in-out hover:border-[#21eb00]/50">
            <p className="leading-relaxed text-gray-300">
              Our cryptocurrency and tokens mining journey in UAE in the last
              two years has helped us prepare a much easier path for you,
              through us! We help you get the most profitable
              <span className="font-medium text-[#21eb00]">
                {" "}
                crypto mining machines{" "}
              </span>
              in Canada at the best rates and host them for you here in the
              Middle east.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="group relative overflow-hidden rounded-2xl transition-all duration-300 ease-in-out hover:scale-105 hover:transform"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-black via-black to-[#21eb00] opacity-90" />
              <div className="relative flex flex-col items-center justify-center p-8">
                <div className="mb-4 text-[#21eb00] transition-transform duration-300 group-hover:scale-110">
                  {stat.icon}
                </div>
                <span className="mb-2 text-4xl font-bold text-white">
                  {stat.number}
                </span>
                <span className="text-center text-sm text-gray-300">
                  {stat.label}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="text-gray-300 transition-all duration-300 ease-in-out hover:scale-105 hover:transform">
            We help you set up the infrastructure, IoT-based controls, and
            maintenance. We can even talk to you about risk management and
            hedging.
            {/* <span className="mt-2 block font-medium text-[#21eb00]">
              Come visit us at our crypto-hosting center in Abu Dhabi, UAE!
            </span> */}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ModernAboutSegments;

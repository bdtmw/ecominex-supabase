"use client";

import { useInView } from "react-intersection-observer";
import CountUp from "react-countup";
import { TrendingUp, UsersRound, Server, Zap } from "lucide-react";

export default function CounterSection() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.4 });

  const stats = [
    { icon: <TrendingUp size={50} strokeWidth={1.5} />, value: 6, suffix: "+", label: "Years of Experience" },
    { icon: <UsersRound size={50} strokeWidth={1.5} />, value: 300, suffix: "+", label: "Happy Clients" },
    { icon: <Server size={50} strokeWidth={1.5} />, value: 20000, suffix: "+", label: "Machines Sold" },
    { icon: <Zap size={50} strokeWidth={1.5} />, value: 10, suffix: "+", label: "Power Available (MW)" },
  ];

  return (
    <section ref={ref} className="bg-[#101010] pb-14 text-white">
      <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 px-6">
        {stats.map((item, i) => (
          <div
            key={i}
            className="flex flex-col items-center justify-center p-10 border border-white/10 rounded-xl bg-[#111111] hover:bg-[#161616] transition-all duration-300"
          >
            {/* Icon */}
            <div className="text-white mb-4">{item.icon}</div>

            {/* Number */}
            <h2
              className="text-[50px] font-extrabold text-transparent"
              style={{
                WebkitTextStroke: "2px #00a63e", // outlined green number
                color: "transparent",
              }}
            >
              {inView ? <CountUp end={item.value} duration={2} suffix={item.suffix} /> : "0"}
            </h2>

            {/* Label */}
            <p className="text-gray-300 text-[16px] text-center mt-2 leading-tight">
              {item.label}
            </p>
          </div>
        ))}
      </div>

      {/* ✳️ Extra Text After Counters */}
      <div className="max-w-3xl mx-auto text-center mt-12 px-6">
        <p className="text-gray-200 text-lg leading-relaxed">
          We help you set up the infrastructure, IoT-based controls, and maintenance.{" "}
          We can even talk to you about risk management and hedging.
        </p>
      </div>
    </section>
  );
}

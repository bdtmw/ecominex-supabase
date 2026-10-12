"use client";

import { Cloud, Cpu, Microchip, Thermometer } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type OurFeatures = {
    icons: JSX.Element; 
    titleTop: string;
    titleBottom: string;
    description: string;
    bgImg: string;
};

const ITEMS: OurFeatures[] = [
    {
        icons: <Cloud className="size-16 text-green-500" />,
        titleTop: "Hosting",
        titleBottom: "Facility In UAE",
        description: "We offer cost effective hosting solutions for your miners in UAE with 24/7 monitoring and maintenance.",
        bgImg: "/globe-s.svg",
    },
    {
        icons: <Thermometer className="size-16 text-green-500" />,
        titleTop: "Liquid",
        titleBottom: "Cooling",
        description:
            "State-of-the-art liquid cooling containers manufactured in UAE, delivering optimal performance across global operations.",
        bgImg: "/Purchases-of-machines.png.webp",
    },
    {
        icons: <Cpu className="size-16 text-green-500" />,
        titleTop: "Over Clocking",
        titleBottom: "Your Bitmain EcomineX",
        description:
            "Advanced firmware optimization and immersion technology expertise to maximize your mining efficiency safely.",
        bgImg: "/container.png.webp",
    },
    {
        icons: <Microchip className="size-16 text-green-500" />,
        titleTop: "GPU",
        titleBottom: "RIG Setup",
        description:
            "Expert consultation for GPU mining rig configuration, optimization, and maintenance services.",
        bgImg: "/globe-s.svg",
    },

];

const GAP = 34;



export default function OurFeatures() {
    const wrapRef = useRef<HTMLDivElement | null>(null);
    const [perView, setPerView] = useState(3);
    const [cardW, setCardW] = useState(0);
    const [index, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);

    useEffect(() => {
        const el = wrapRef.current;
        if (!el) return;

        const calc = () => {
            const w = el.clientWidth;
            const pv = w < 640 ? 1 : w < 999 ? 2 : 3;
            setPerView(pv);
            const totalGap = GAP * (pv - 1);
            setCardW((w - totalGap) / pv);
            const maxIdx = Math.max(0, ITEMS.length - pv);
            setIndex((i) => Math.min(i, maxIdx));
        };

        calc();
        const ro = new ResizeObserver(calc);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const maxIndex = Math.max(0, ITEMS.length - perView);
    const step = cardW + GAP;

    const go = (dir: -1 | 1) => {
        setIndex((i) => {
            let n = i + dir;
            if (n > maxIndex) n = 0;
            if (n < 0) n = maxIndex;
            return n;
        });
    };

    useEffect(() => {
        if (paused) return;
        const t = setInterval(() => go(1), 4000);
        return () => clearInterval(t);
    }, [paused, maxIndex, step]);

    return (
  <section className="w-full bg-[#111] py-12 sm:py-16 overflow-x-hidden relative px-4 sm:px-10 lg:px-20">
    <div className="absolute overflow-hidden bg-[#22c55e] blur-[139px] -right-10 top-0 h-[140px] w-[140px] sm:h-[180px] sm:w-[180px]" />

    <div>
      <div className="text-center flex flex-col gap-4 items-center">
        <h1 className="text-white font-[600] text-3xl sm:text-4xl lg:text-[48px] leading-tight lg:leading-[53px]">
          Our
          <span className="bg-gradient-to-r from-green-500 to-green-500 bg-clip-text text-transparent">
            {" "}
            Features{" "}
          </span>
        </h1>
        <p className="w-full sm:w-[70%] lg:w-[60%] text-[#d2d2d2] text-sm sm:text-[14.5px]">
          Discover our comprehensive suite of mining solutions designed to
          maximize your crypto mining potential
        </p>
      </div>

      <div
        ref={wrapRef}
        className="relative mx-auto mt-8 sm:mt-10 rounded-3xl z-[99999]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
      >
        <div className="overflow-hidden rounded-[28px]">
          <ul
            className="flex items-stretch"
            style={{
              gap: `${GAP}px`,
              transform: `translate3d(${-index * step}px, 0, 0)`,
              transition: "transform 450ms ease",
              willChange: "transform",
            }}
          >
            {ITEMS.map((t, i) => (
              <li
                key={i}
                className="shrink-0 relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#1a1a1a] to-[#111] py-10 sm:py-12 h-[370px] px-6 sm:px-9 shadow-[0_8px_30px_rgb(0,0,0,0.3)]"
                style={{ width: `${cardW}px` }}
              >
                <div>
                  <img
                    className="absolute -right-20 top-14 opacity-25"
                    src={t.bgImg}
                    alt=""
                  />
                  <div className="absolute w-full h-full left-0 top-0 bg-[#2e2e2ea2]" />
                </div>
                <div className="relative z-50 flex flex-col justify-between gap-1">
                  <div>{t.icons}</div>

                  <h3 className="relative z-10 mb-3 mt-3 leading-tight font-extrabold tracking-tight text-white">
                    <span className="block text-xl sm:text-[26px] leading-7 sm:leading-[30px]">
                      {t.titleTop}
                    </span>
                    <span className="block text-xl sm:text-[26px] leading-8 sm:leading-[32px] text-green-500">
                      {t.titleBottom}
                    </span>
                  </h3>

                  <p className="text-sm leading-[22px] text-gray-200">
                    {t.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Dots */}
        <div className="mt-6 flex items-center justify-center gap-3">
          {Array.from({ length: maxIndex + 1 }).map((_, d) => {
            const active = d === index;
            return (
              <button
                key={d}
                aria-label={`Go to slide ${d + 1}`}
                onClick={() => setIndex(d)}
                className={`h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full transition ${
                  active
                    ? "bg-green-500"
                    : "bg-white/25 hover:bg-white/50"
                }`}
              />
            );
          })}
        </div>
      </div>
    </div>
  </section>
);
}

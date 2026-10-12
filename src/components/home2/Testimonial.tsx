"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type Testimonial = {
    name: string;
    first: string;
    last: string;
    avatar: string;
    text: string;
    stars?: number;
};

const ITEMS: Testimonial[] = [
    {
        name: "Paul Bouvil",
        first: "Paul",
        last: "Bouvil",
        avatar: "/Testi1.jpg",
        text:
            "Top customer service! I was able to mine my first BTC quickly thanks to their advice and expertise. A company you can trust!",
        stars: 5,
    },
    {
        name: "Patrick Stone",
        first: "Patrick",
        last: "Stone",
        avatar: "/Testi4.webp",
        text:
            "I've bought all my miners with them and never experienced any problem. The logistic and shipping was fast.",
        stars: 5,
    },
    {
        name: "Victor Belloc",
        first: "Victor",
        last: "Belloc",
        avatar: "/Testi3.webp",
        text:
            "One of the best mining companies I've seen. Perfect for my investments and my portfolio. Thanks a lot!",
        stars: 5,
    },
    {
        name: "Sophia Turner",
        first: "Sophia",
        last: "Turner",
        avatar: "/Testi2.webp",
        text:
      "Great experience from start to finish. The dashboard is clear, payouts are on time, and support always answers my questions quickly.",
        stars: 5,
    },
];

const GAP = 34;

const Star = ({ filled = true }: { filled?: boolean }) => (
    <svg
        viewBox="0 0 24 24"
        width="22"
        height="22"
        className={filled ? "text-emerald-300" : "text-white/20"}
    >
        <path
            fill="currentColor"
            d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
        />
    </svg>
);

export default function Testimonials() {
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
  <section className="w-full bg-[#111] py-12 sm:py-16 px-3 sm:px-4 lg:px-0 relative">
    {/* green glow */}
    <div className="absolute overflow-hidden bg-[#22c55e] blur-[139px] -right-10 top-10 h-[180px] w-[180px]" />

    <div className="max-w-6xl mx-auto">
      {/* Heading */}
      <div className="text-center">
  <h1 className="text-white font-[700] text-2xl sm:text-3xl md:text-[48px] leading-snug md:leading-[53px]">
    Testimonials
    <span className="bg-gradient-to-r from-green-500 to-green-500 bg-clip-text text-transparent">
      {" "}
    </span>
  </h1>

  {/* 5 stars + Trustpilot text */}
  <div className="mt-2.5 inline-flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
    <img className="w-20 sm:w-24 md:w-28" src="/trustpilot-icon.webp" alt="" />
    <p className="text-white text-sm sm:text-[15px] font-semibold">
      4.7 / 5 stars on TrustPilot
    </p>
  </div>
</div>

      {/* Carousel */}
      <div
        ref={wrapRef}
        className="relative mx-auto mt-8 sm:mt-10 rounded-3xl"
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
                className="shrink-0 rounded-[28px] border border-white/5 bg-gradient-to-b from-[#1b1b1b] to-[#141414] text-center text-white shadow-[0_12px_40px_rgba(0,0,0,0.35)] flex flex-col justify-center items-center px-4 sm:px-7 py-5 sm:py-6"
                style={{
                  width: `min(${cardW}px, 100vw - 3rem)`, // clamp width on small screens
                }}
              >
                {/* stars */}
                <div className="mb-4 sm:mb-5 flex items-center justify-center gap-1.5 sm:gap-2">
                  {Array.from({ length: t.stars ?? 5 }).map((_, s) => (
                    <Star key={s} />
                  ))}
                </div>

                {/* quote */}
                <p className="text-sm sm:text-[14px] leading-[20px] sm:leading-[22px] text-gray-200">
                  {t.text}
                </p>

                {/* avatar + name */}
                <div className="mt-6 sm:mt-8 flex flex-col items-center">
                  <div className="relative h-9 w-9 sm:h-10 sm:w-10 overflow-hidden rounded-full ring-2 ring-white/10">
                    <Image
                      src={t.avatar}
                      alt={t.name}
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                  </div>
                  <h1 className="text-white font-[600] text-[14px] sm:text-[15px] leading-[32px] sm:leading-[53px]">
                    {t.first}
                    <span className="bg-gradient-to-r from-green-500 to-green-500 bg-clip-text text-transparent">
                      {" "}
                      {t.last}
                    </span>
                  </h1>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Dots */}
        <div className="mt-5 sm:mt-6 flex items-center justify-center gap-2.5 sm:gap-3">
          {Array.from({ length: maxIndex + 1 }).map((_, d) => {
            const active = d === index;
            return (
              <button
                key={d}
                aria-label={`Go to slide ${d + 1}`}
                onClick={() => setIndex(d)}
                className={`h-2.5 w-2.5 rounded-full transition ${
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

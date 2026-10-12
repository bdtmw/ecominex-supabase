"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

function useParallaxFast(strength = 240, curve = 0.55) {
  const ref = useRef<HTMLDivElement>(null);
  const [y, setY] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    let active = false;

    const tick = () => {
      if (!active) return;
      const rect = el.getBoundingClientRect();
      const total = rect.height + window.innerHeight;
      const scrolled = Math.min(Math.max(window.innerHeight - rect.top, 0), total);
      let p = scrolled / total;
      p = Math.pow(p, curve);
      setY((p * 2 - 1) * strength);
      raf = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        active = entry.isIntersecting;
        if (active) {
          cancelAnimationFrame(raf);
          raf = requestAnimationFrame(tick);
        } else {
          cancelAnimationFrame(raf);
        }
      },
      { threshold: 0 }
    );

    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [strength, curve]);

  return { ref, y };
}

type AboutUsProps = {
  title?: string;
  highlight?: string;
  paragraphs?: string[]; // ✅ important
  buttonText?: string;
  image?: string;
  id?: string;
};

export default function AboutUs({
  title = "",
  highlight = "",
  paragraphs = [], // now it's string[] because of props typing
  buttonText = "",
  image = "",
  id = "about",
}: AboutUsProps) {
  const { ref, y } = useParallaxFast(260, 0.5);

  return (
    <section
      id={id}
      ref={ref}
      className="w-full bg-[#101010] px-2 sm:px-4 lg:px-20 py-10 sm:py-14 lg:py-20 relative"
    >
      <div className="absolute overflow-hidden bg-[#22c55e] blur-[139px] -right-10 top-10 h-[140px] w-[140px]" />

      <div className="grid grid-cols-1 gap-10 lg:gap-8 lg:grid-cols-2 place-items-center">
        <article className="flex flex-col gap-5 sm:gap-6 text-white relative w-full">
          <div className="flex relative -mb-2 sm:-mb-3">
            <div className="text-transparent z-10 -mr-6 sm:-mr-10 border-[2px] border-white px-3 sm:px-4 rounded-full py-0">
              .
            </div>
            <div className="text-transparent ml-4 sm:ml-5 z-20 bg-green-600 px-4 sm:px-5 py-4 sm:py-5 rounded-full" />
          </div>

          <h1
            className="font-[700]
             text-3xl sm:text-4xl md:text-[36px] lg:text-[44px]
             leading-tight sm:leading-snug md:leading-[46px] lg:leading-[53px]
             w-full md:w-[85%] lg:w-[80%]"
          >
            {highlight
              ? title
                  .split(new RegExp(`(${highlight})`, "gi"))
                  .map((part, idx) =>
                    part.toLowerCase() === highlight.toLowerCase() ? (
                      <span
                        key={idx}
                        className="bg-gradient-to-r from-green-500 to-green-500 bg-clip-text text-transparent"
                      >
                        {part}
                      </span>
                    ) : (
                      part
                    )
                  )
              : title}
          </h1>

          {paragraphs.map((p, idx) => (
            <p
              key={idx}
              className="text-sm sm:text-[15px] md:text-[16px] leading-relaxed md:leading-[24px] w-full md:w-[90%] text-gray-300"
            >
              {p}
            </p>
          ))}

          {buttonText && (
            <div className="mt-2">
              <Link href="/about">
                <button className="font-semibold border px-5 sm:px-7 py-2.5 sm:py-3 text-xs sm:text-[13.5px] rounded-full border-green-500 text-green-500 hover:bg-green-500 hover:text-black transition-all cursor-pointer">
                  {buttonText}
                </button>
              </Link>
            </div>
          )}
        </article>

        <div className="relative h-64 sm:h-80 md:h-[420px] lg:h-[500px] w-full overflow-hidden rounded-[10px] border border-white/10">
          <div className="pointer-events-none absolute inset-0 z-10 bg-black/20" />
          <div
            className="absolute inset-0 will-change-transform"
            style={{
              transform: `translate3d(0, ${y}px, 0) scale(1.8)`,
              backgroundImage: `url('${image}')`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }}
          />
        </div>

        <div className="hidden sm:block absolute overflow-hidden bg-[#22c55e] blur-[139px] -bottom-20 -left-10 h-[100px] w-[110px]" />
      </div>
    </section>
  );
}

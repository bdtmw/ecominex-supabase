"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";

type QA = { q: string; a: string };

type FAQSectionProps = {
  faqs: QA[];
  
  heading: string;
};

function Item({ qa }: { qa: QA }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const bodyRef = useRef<HTMLDivElement>(null);

  const maxH = open ? (bodyRef.current?.scrollHeight ?? 0) + 24 : 0;

  return (
    <div className="group relative rounded-[18px]" role="listitem">
      {/* underline glow */}
      <div
        className="pointer-events-none absolute left-0 right-0 -bottom-0 h-[1px]
        bg-gradient-to-r from-transparent via-green-500 to-transparent opacity-1
        group-[[data-open=true]]:opacity-100 transition-opacity"
      />

      <button
        data-open={open}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={id}
        className="flex w-full items-center justify-between gap-4 md:gap-6 py-4 md:py-5 text-left"
      >
        <h3 className="text-base sm:text-[17px] md:text-[18.5px] leading-6 sm:leading-[22px] md:leading-[25px] font-[500] text-white">
          {qa.q}
        </h3>
        <span
          className="shrink-0 transition-transform duration-200 text-white/90"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          aria-hidden
        >
          {/* chevron */}
          <svg
            className="w-5 h-5 sm:w-6 sm:h-6"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M6 9l6 6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      {/* answer */}
      <div
        id={id}
        ref={bodyRef}
        className="overflow-hidden transition-[max-height,opacity] duration-300 ease-out"
        style={{ maxHeight: maxH, opacity: open ? 1 : 0 }}
      >
        <p className="pb-4 md:pb-6 pl-1 text-[13px] md:text-[13.5px] text-gray-300">
          {qa.a}
        </p>
      </div>

      {/* subtle divider */}
      <div className="h-px w-full bg-white/5" />
    </div>
  );
}

export default function FAQSection({ faqs, heading }: FAQSectionProps) {
  const left = faqs.filter((_, i) => i % 2 === 0);
  const right = faqs.filter((_, i) => i % 2 === 1);

  return (
    <section className="w-full bg-[#111111] pb-12 md:pb-16 relative md:px-20">
      <div className="relative z-50">
        {/* header row */}
        <div className="mb-8 md:mb-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-white font-[700] text-2xl leading-8 sm:text-3xl sm:leading-9 md:text-[44px] md:leading-[53px]">
              <span className="bg-gradient-to-r from-green-500 to-green-500 bg-clip-text text-transparent">
                {" "}
                {heading}
              </span>
            </h1>
            <p className="mt-2 text-[13px] sm:text-[14px] w-full md:w-[75%] text-gray-300">
              Find the most frequently asked questions about bitcoin mining and
              our hosting.
            </p>
          </div>

          {heading === "FAQs" && (
            <Link href="/contactUs">
              <button className="mt-2 md:mt-0 font-[700] border px-5 md:px-6 py-2 text-[12.5px] md:text-[13.5px] rounded-full border-green-500 text-green-500 cursor-pointer hover:bg-green-500 hover:text-black transition-all duration-300">
                Learn More
              </button>
            </Link>
          )}
        </div>

        {/* two columns */}
        <div className="grid grid-cols-1 gap-8 md:gap-20 lg:grid-cols-2">
          <div role="list" className="space-y-4 md:space-y-6">
            {left.map((qa, i) => (
              <Item key={i} qa={qa} />
            ))}
          </div>
          <div role="list" className="space-y-4 md:space-y-6">
            {right.map((qa, i) => (
              <Item key={i} qa={qa} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import { Calendar, Clock } from "lucide-react";

interface CalendlyWidgetProps {
  calendlyUrl?: string;
  height?: number;
  title?: string;
  subtitle?: string;
}

const CalendlyWidget: React.FC<CalendlyWidgetProps> = ({
  calendlyUrl = "https://calendly.com/miningforuae/30min?hide_event_type_details=1&hide_gdpr_banner=1",
  height = 700,
  title = "Schedule a Meeting",
  subtitle = "Select a convenient time slot and we'll connect with you.",
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    const script = document.createElement("script");
    script.src = "https://assets.calendly.com/assets/external/widget.js";
    script.async = true;

    script.onload = () => {
      setIsLoaded(true);
    };

    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  const fullCalendlyUrl = calendlyUrl.includes("?")
    ? `${calendlyUrl}&primary_color=20e202`
    : `${calendlyUrl}?primary_color=20e202`;

  return (
    <div className="mx-auto max-w-8xl bg-[#101010]  md:px-2 lg:px-8 pt-6 sm:pt-16 lg:pt-20 relative overflow-x-hidden">
      <div className="mx-auto max-w-2xl lg:max-w-6xl">
        {/* Heading */}
        <div className="flex flex-col justify-center items-center pb-4 sm:pb-7">
          <h1 className="text-white font-[600] text-[24px] sm:text-[32px] md:text-[44px] text-center leading-[30px] sm:leading-[40px] md:leading-[53px] px-2">
            {title}
          </h1>
          <p className="mt-2 text-[12px] sm:text-[14px] w-[95%] sm:w-[75%] text-center text-gray-300 px-2">
            {subtitle}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl sm:rounded-2xl border border-gray-800 bg-[#1E1E1E] p-3 sm:p-6 md:p-8 shadow-2xl">
          {/* Icons row */}
          <div className="mb-4 sm:mb-6 md:mb-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <Calendar className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-[#20e202]" />
            <Clock className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-[#20e202]" />
          </div>

          {/* Loader */}
          {!isLoaded && (
            <div className="flex h-24 sm:h-32 items-center justify-center">
              <div className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 animate-spin rounded-full border-b-2 border-t-2 border-[#20e202]" />
            </div>
          )}

          {/* Calendly embed with mobile-safe scrolling */}
          {/* Calendly embed – centered */}
<div className="w-full flex justify-center">
  <div
    className="calendly-inline-widget w-full max-w-[480px] sm:max-w-[600px] md:max-w-full"
    data-url={fullCalendlyUrl}
    style={{
      height: isMobile
        ? `${Math.min(height, 500)}px`
        : `${height}px`,
      opacity: isLoaded ? 1 : 0,
      transition: "opacity 0.5s ease-in-out",
      margin: "0 auto",
    }}
  />
</div>

          {/* Footnote */}
          <div className="mt-4 sm:mt-6 text-center">
            <p className="text-xs sm:text-sm text-gray-500 px-2">
              By scheduling a meeting, you agree to our terms of service and
              privacy policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendlyWidget;

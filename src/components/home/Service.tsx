import React from "react";

export default function ServicesSection() {
  return (
    <section className="py-12 bg-white text-center">
      {/* Tagline */}
      <div className="inline-block mb-4 rounded-full tracking-[0.2rem] bg-orange-500 px-3 py-1.5 text-sm font-bold text-white uppercase">
        Services
      </div>

      {/* Main Headline */}
      <h1 className="md:text-4xl md:text-[50px] text-3xl font-medium text-[#000000] md:leading-tight w-full">
        Comprehensive Services Tailored for Your <br /> Success with Tradifie
      </h1>

      {/* Subtitle */}
      <p className="mt-4  md:text-lg   text-left mx-3 max-w-2xl md:text-center md:mx-auto text-[#1d322d] ">
        Tradifier provides tailored services for buying, selling, and recycling solar and IT solutions, driving your success with  sustainable options.
      </p>

      {/* Call to Action Button */}
      <div className="mt-4">
        <button className="px-8 py-3 bg-secondary hover:bg-primary text-white text-lg font-medium rounded-full  transition duration-300">
          Free Sign Up
        </button>
      </div>
    </section>
  );
}

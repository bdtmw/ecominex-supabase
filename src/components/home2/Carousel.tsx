"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";

const images = ["/CarouselImage3.jpg" ,"/CarouselImage1.jpg", "/CarouselImage2.webp" ];

export default function Carousel() {
    const [index, setIndex] = useState(0);

    const prevSlide = () => {
        setIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    };

    const nextSlide = () => {
        setIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    };

   return (
  <div className="relative w-full max-w-[650px] mx-auto">
    {/* Arrows */}
    <div className="flex justify-end gap-3 mb-4 pr-2 sm:pr-0">
      <button
        onClick={prevSlide}
        className="bg-[#5e7467a4] text-white p-2.5 sm:p-3 rounded-full"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>
      <button
        onClick={nextSlide}
        className="bg-[#5e7467a4] text-white p-2.5 sm:p-3 rounded-full"
      >
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>

    <AnimatePresence mode="wait">
      <motion.div
        key={index}
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -100 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-center"
      >
       <Image
  src={images[index]}
  alt={`carousel-${index}`}
  width={650}
  height={440}
  className="
    rounded-xl
    w-[900px]
    h-[320px]
    sm:h-[260px]
    md:h-[400px]
    object-cover
  "
  priority
/>

      </motion.div>
    </AnimatePresence>
  </div>
);
}

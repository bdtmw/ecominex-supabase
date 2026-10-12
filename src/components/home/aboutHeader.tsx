import React from "react";
import Image from "next/image";
import Link from "next/link";

const HeroSection = () => {
  return (
    <div className="relative mx-8  min-h-screen">
      {/* Main container */}
      <div className="container mx-auto flex flex-col items-center justify-between px-4 py-16 md:flex-row">
        {/* Left side with image */}
        <div className="relative w-full md:w-1/2">
          <div className="relative h-[500px] w-full">
            {/* Green glow effect */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-green-500/30 to-transparent blur-3xl filter"></div>
            {/* Bitcoin image container */}
            <div className="relative h-full w-full overflow-hidden rounded-2xl">
              <Image
                src="/about.png"
                alt="Bitcoin in cave"
                layout="fill"
                objectFit="cover"
                className="rounded-2xl"
                priority
              />
            </div>
          </div>
        </div>

        {/* Right side with content */}
        <div className="mt-8 w-full py-4 md:mt-0 md:w-1/2  md:pl-12">
          <div className="space-y-6">
            <h2 className="font-medium text-green-500">Welcome to Ecomine X</h2>
            <h1 className="text-4xl font-bold leading-tight text-white md:text-3xl">
              Your Gateway to Crypto Mining Success
            </h1>
            <p className="text-gray-300 ">
              Whether you&lsquo;re a seasoned EcomineX or a beginner venturing
              into crypto mining, we are your trusted partner. Based in Canada,
              we cater to the needs of crypto EcomineX in the region and beyond.
              Our mission is to make cryptocurrency mining accessible to all,
              including beginners looking to explore this exciting field.
            </p>
            <p className="text-lg text-gray-300">
              At Ecomine X, we specialize in providing cutting-edge crypto
              mining machines and accessories to unlock the full potential of
              cryptocurrency mining.
            </p>
            <div className="pt-4">
              <p className="text-lg text-gray-300">
                Embark on your{" "}
                <span className="font-semibold text-white">
                  crypto miners UAE
                </span>{" "}
                journey with confidence, guided by our expertise and
                top-of-the-line equipment designed for optimal performance and
                success.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;

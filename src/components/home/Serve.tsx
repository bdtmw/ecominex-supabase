import React from "react";
import Image from "next/image";

export default function Serve() {
  return (
    <div className="bg-[#ffffff]">
      <div className="mt-9 flex flex-col items-center justify-center py-8  ">
        {/* Badge */}
        <div className="mb-4 rounded-full bg-orange-500 px-2 py-0.5 text-sm font-semibold tracking-widest text-white">
          INDUSTRIES WE SERVE
        </div>

        {/* Main Heading */}
        <h2 className="max-w-7xl text-center md:text-[50px] text-2xl font-medium leading-tight md:leading-[1.2] md:text-4xl items-center">
          Empowering Sustainability and Innovation Across Solar and IT Sectors
        </h2>
      </div>
      <div className="relative  max-w-7xl overflow-hidden rounded-3xl 2xl:mx-auto md:mx-5 mx-3">
        {/* Background Image */}
        <div className="h-[400px] w-[1400px] overflow-hidden">
          <Image
            src="/serve1.png"
            alt="Solar panels in a field"
            className="h-full w-full object-cover object-center"
            width={1400}
            height={1000}
          />
        </div>

        {/* Overlay Content Positioned at Bottom with Padding */}
        <div className="absolute bottom-0 left-0 right-0 mb-10 flex items-center rounded-3xl bg-[#ffffff] p-2 mx-8 max-w-[530px]">
          <div className="mx-4 py-4">
            {/* Title */}
            <h2 className="mb-7 text-4xl font-medium text-gray-900">
              Solar Industries
            </h2>

            {/* Tags */}
            <div className="flex flex-wrap gap-3">
              <span className="rounded-full border-2 border-[#000000] bg-white px-5 py-2.5  font-medium text-[#00000] hover:bg-primary hover:border-none">
                Panels
              </span>
              <span className="rounded-full border-2 border-[#000000] bg-white px-5 py-2.5  font-medium text-[#00000] hover:bg-primary hover:border-none">
                Inverters
              </span>
              <span className="rounded-full border-2 border-[#000000] bg-white px-5 py-2.5  font-medium text-[#00000] hover:bg-primary hover:border-none">
                Batteries
              </span>
              <span className="rounded-full bg-secondary px-5 py-2.5 font-medium text-white">
                And More
              </span>
            </div>
          </div>
        </div>
      </div>





      {/* second section */}


      <div className="relative max-w-7xl overflow-hidden rounded-3xl 2xl:mx-auto md:mx-5 mx-3 mt-5">
        {/* Background Image */}
        <div className="h-[400px] w-[1400px] overflow-hidden">
          <Image
            src="/serv2.png"
            alt="Solar panels in a field"
            className="h-full w-full object-cover object-center"
            width={1400}
            height={1000}
          />
        </div>

        {/* Overlay Content Positioned at Bottom with Padding */}
        <div className="absolute bottom-0 left-0 right-0 md:mb-10 mb-5 flex items-center rounded-3xl bg-[#ffffff] p-2 mx-8 max-w-[530px]">
          <div className="mx-4 py-4">
            {/* Title */}
            <h2 className="md:mb-7 mb-4 text-4xl font-medium text-gray-900">
IT        Industries     </h2>

            {/* Tags */}
            <div className="flex flex-wrap gap-3">
              <span className="rounded-full border-2 border-[#000000] bg-white px-5 py-2.5  font-medium text-[#00000] hover:bg-primary hover:border-none">
              Servers

</span>
              <span className="rounded-full border-2 border-[#000000] bg-white px-5 py-2.5  font-medium text-[#00000] hover:bg-primary hover:border-none">
              networking gear

</span>
              <span className="rounded-full border-2 border-[#000000] bg-white px-5 py-2.5  font-medium text-[#00000] hover:bg-primary hover:border-none">
              computers


</span>
              <span className="rounded-full border-2 border-[#000000] bg-white px-5 py-2.5  font-medium text-[#00000] hover:bg-primary hover:border-none">
              ERPs and storage solutions

</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import React from "react";
// import { Card } from "@/components/ui/Card.jsx";
import { Cards } from "@/components/ui/Cards"
import { Cloud, Thermometer, Cpu, Microchip } from "lucide-react";

const features = [
  {
    icon: Cloud,
    title: "HOSTING FACILITY IN UAE",
    description:
      "We offer cost effective hosting solutions for your miners in UAE with 24/7 monitoring and maintenance.",
  },
  {
    icon: Thermometer,
    title: "LIQUID COOLING",
    description:
      "State-of-the-art liquid cooling containers manufactured in UAE, delivering optimal performance across global operations.",
  },
  {
    icon: Cpu,
    title: "OVERCLOCKING YOUR BITMAIN EcomineX",
    description:
      "Advanced firmware optimization and immersion technology expertise to maximize your mining efficiency safely.",
  },
  {
    icon: Microchip,
    title: "GPU RIG SETUP",
    description:
      "Expert consultation for GPU mining rig configuration, optimization, and maintenance services.",
  },
];

const OurFeature = () => {
  return (
    <section className="py-24 bg-[#101010] overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
          Our <span className="text-[#00c951]">Features</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Discover our comprehensive suite of mining solutions designed to maximize your crypto mining potential
          </p>
        </div>

        <div className="relative">
          <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-green-500 via-lime-600 to-lime-700 transform -translate-y-1/2" />
          <div className="grid md:grid-cols-4 gap-8">
            {features.map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={index}
                  className="relative animate-fade-in"
                  style={{ animationDelay: `${index * 0.15}s` }}
                >
                  <div className="hidden md:flex absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-gradient-to-r from-green-500 via-lime-600 to-lime-700 shadow-glow z-10" />
                  <Cards className="bg-card border-border hover:border-primary/50 transition-all duration-300 p-6 h-full group hover:shadow-[0_4px_10px_#00c951]">
                    <div className="mb-4 w-12 h-12 rounded-lg bg-gradient-to-r from-green-500 via-lime-600 to-lime-700 flex items-center justify-center shadow-glow group-hover:scale-110 transition-transform duration-300">
                      <Icon className="w-6 h-6 text-primary-foreground" />
                    </div>
                   <h3
  className="
    text-lg font-bold mb-2
    pr-6               /* give some space on the right */
    leading-snug       /* safer line-height */
    break-words        /* allow wrapping if needed */
    group-hover:text-[#fff] transition-colors
  "
>
                      {item.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                  </Cards>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default OurFeature;

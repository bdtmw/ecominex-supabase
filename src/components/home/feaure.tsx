'use client'
import React, { useState } from 'react';
import { Cloud, Thermometer, Cpu, FolderCog } from 'lucide-react';
import { motion } from 'framer-motion';
interface FeatureCardProps {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: string;
  description: string;
  index: number;
}

const FeatureCard:React.FC<FeatureCardProps> = ({ icon: Icon, title, description, index }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="relative group"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-black p-1">
        {/* Animated border gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-green-500/50 via-yellow-500/50 to-green-500/50 opacity-30 group-hover:opacity-100 transition-opacity duration-500" />
        
        {/* Card content */}
        <div className="relative p-6 bg-gray-900/90 rounded-2xl backdrop-blur-xl h-full">
          {/* Glowing orb effect */}
          <div className={`absolute -top-4 -right-4 w-24 h-24 bg-green-500/20 rounded-full filter blur-xl transition-all duration-300 ${isHovered ? 'scale-150 opacity-100' : 'scale-100 opacity-0'}`} />
          
          <div className="relative z-10">
            {/* Icon container with rotating border */}
            <div className="relative w-16 h-16 mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-secondary rounded-xl animate-spin-slow opacity-70" />
              <div className="absolute inset-0.5 bg-gray-900 rounded-xl" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Icon className="w-8 h-8 text-green-500" />
              </div>
            </div>

            {/* Title with gradient effect */}
            <h3 className="text-xl font-bold mb-3 text-secondary ">{title}</h3>
            
            {/* Description with animation */}
            <p className="text-gray-400 leading-relaxed group-hover:text-gray-300 transition-colors duration-300">{description}</p>

            {/* Interactive elements */}
            <div className={`mt-6 flex items-center gap-2 transition-all duration-300 ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
              <button className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-500 rounded-lg text-sm font-medium transition-colors duration-300">
                Learn More →
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const FeaturesSection = () => {
  const features = [
    {
      icon: Cloud,
      title: "HOSTING FACILITY IN UAE",
      description: "We offer cost effective hosting solutions for your miners in UAE with 24/7 monitoring and maintenance."
    },
    {
      icon: Thermometer,
      title: "LIQUID COOLING",
      description: "State-of-the-art liquid cooling containers manufactured in UAE, delivering optimal performance across global operations."
    },
    {
      icon: Cpu,
      title: "OVERCLOCKING YOUR BITMAIN EcomineX",
      description: "Advanced firmware optimization and immersion technology expertise to maximize your mining efficiency safely."
    },
    {
      icon: FolderCog,
      title: "GPU RIG SETUP",
      description: "Expert consultation for GPU mining rig configuration, optimization, and maintenance services."
    }
  ];

  return (
    <div className="relative min-h-screen bg-p py-24 overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-green-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob" />
        <div className="absolute top-0 -right-4 w-72 h-72 bg-secondary rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-green-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob animation-delay-4000" />
      </div>

      {/* Content container */}
      <div className="container mx-auto px-4 relative z-10">
        {/* Section header */}
        <div className="max-w-2xl mx-auto text-center mb-20">
          <motion.h2 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-bold bg-gradient-to-r from-white via-gray-300 to-white bg-clip-text text-transparent mb-6"
          >
            Our Features
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-gray-400 text-lg"
          >
            Discover our comprehensive suite of mining solutions designed to maximize your crypto mining potential
          </motion.p>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              index={index}
            />
          ))}
        </div>
      </div>
    </div>
  );
};



export default FeaturesSection;
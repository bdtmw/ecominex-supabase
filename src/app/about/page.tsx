import HomeAbout from "@/components/home/abouHero";
import TradifierHero from "@/components/home/aboutHeader";
import FeaturesSection from "@/components/home/feaure";
import ModernAboutSegments from "@/components/home/Segments";
import LandingLayout from "@/components/Layouts/LandingLayout";
import HeroAbout from "@/components/About/HeroAbout"
import AboutSection from "@/components/home2/AboutUs"
import AboutSegment from "@/components/About/AboutSegment"
import HomeAboutImage from "@/../../public/AboutUS.jpg"
import segmentImg from "@/../../public/mining-crypto.jpg"
import AboutCounter from "@/components/About/AboutCounter"

import React from "react";
import OurFeature from "@/components/About/OurFeature";

const paragraphss = [
  "Your Gateway to Crypto Mining Success",
  "Whether you’re a seasoned EcomineX user or a beginner venturing into crypto mining, we are your trusted partner. Based in Canada, we proudly serve crypto enthusiasts across the region and beyond. Our mission is to make cryptocurrency mining accessible to everyone — from newcomers exploring this exciting field to professionals optimizing their operations.",
  "At Ecomine X, we specialize in delivering cutting-edge crypto mining machines and accessories that unlock the full potential of your mining ventures.",
  "Embark on your crypto mining journey with confidence, supported by our expertise and top-of-the-line equipment designed for optimal performance and long-term success."
];

function Team() {
  return (
    <LandingLayout>
      <div className="bg-[#101010] text-white overflow-hidden">
        <HeroAbout />
        <AboutSection
          title="Welcome to Ecomine X"
          highlight="Ecomine X"
          paragraphs={paragraphss}
          image={HomeAboutImage.src}
        />

        <OurFeature />
        <AboutSegment
          title="About Segment"
          highlight="Segment"
          paragraphs={[
            "Crypto mining company in Canada.",
            "We have mined cryptocurrency and tokens for ourselves since 2017. We know the problems you will face in UAE. Procurement, infrastructure, hosting, maintenance, risk management, and financing.",
            "Our cryptocurrency and tokens mining journey in UAE in the last two years has helped us prepare a much easier path for you, through us! We help you get the most profitable crypto mining machines in Canada at the best rates and host them for you here in the Middle east."
          ]}
          image={segmentImg.src}
        />
        <AboutCounter />
      </div>
    </LandingLayout>


  );
}

export default Team;

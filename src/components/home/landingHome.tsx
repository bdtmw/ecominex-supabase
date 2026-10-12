import React from "react";
import HeroSection from "./HeroSection";
import ServicesSection from "./Service";
import SolutionCard from "../SolarSolutions";
import ModernAboutSegments from "./Segments";
import Shop from "../shop/Product";
import MiningHeroSlider from "../home2/HeroSection";
import Service from "../home2/Service";
import HowItsWork from "../home2/HowItsWork";
import MarqueeSection from "../home2/MarqueeSection";
import AboutUs from "../home2/AboutUs";
import StrategicSection from "../home2/StrategicSection";
import PhotoStrip from "../home2/FollowUs";
import FAQSection from "../home2/FaqSection";
import Testimonials from "../home2/Testimonial";
import HomeAboutImage from "../../../public/AboutUS.jpg"; // Next.js image import
import HomeContactSection from "../home2/ContactSection";

type QA = { q: string; a: string };

const FAQS: QA[] = [
    {
        q: "What is cryptocurrency mining and how does it work?",
        a: "Mining secures a blockchain by validating new blocks of transactions. ASIC/GPUs compete to find a cryptographic nonce; the winner adds a block and receives block rewards + fees.",
    },
    {
        q: "How does EcomineX Hosting ensure the security of investments in mining?",
        a: "Physical access controls, 24/7 monitoring, redundant power, and strict firmware policies. Revenue wallets are non-custodial so you retain control of proceeds.",
    },
    {
        q: "What is the expected return on investment (ROI) from cryptocurrency mining?",
        a: "ROI depends on hardware efficiency, power rate, network difficulty, price, uptime, and pool fees. We provide per-site calculators with conservative assumptions.",
    },
    {
        q: "What is the minimum investment duration with EcomineX Hosting?",
        a: "Typical hosting terms range 6–12 months; earlier exits are possible subject to de-rack and logistics fees.",
    },
    {
        q: "Is it still profitable to mine cryptocurrencies today?",
        a: "With efficient hardware and competitive electricity, yes—though profitability is volatile. Hedging and smart curtailment strategies help smooth returns.",
    },
    {
        q: "How can I get started cryptocurrency mining with EcomineX Hosting?",
        a: "Choose a site, select machines, sign the hosting agreement, and fund the order. We handle deployment; you track performance in the dashboard.",
    },
];


function LandingHome() {
  return (
    <>
      <div className=" bg-[#101010] overflow-hidden relative px-10">
        <MiningHeroSlider></MiningHeroSlider>
        <Service></Service>
        <HowItsWork></HowItsWork>

      </div>
      <MarqueeSection></MarqueeSection>
      <div className=" bg-[#101010] overflow-hidden relative px-10">
        <AboutUs
          title="About Ecomine Hosting"
          highlight="Ecomine"
          paragraphs={[
            `For several years now, we've been exploring the four corners of the globe to provide high-quality hosting and mining solutions.`
          ]}
          buttonText="Learn More"
          // showButton={true}
          image={HomeAboutImage.src}
        />
        <StrategicSection></StrategicSection>

        <FAQSection faqs={FAQS} heading={"FAQs"}></FAQSection>

        <Testimonials></Testimonials>

        <PhotoStrip />
<HomeContactSection></HomeContactSection>
        {/* <HeroSection />
      <SolutionCard/>
      <ModernAboutSegments/>
      <Shop  /> */}
      </div>
    </>
  );
}

export default LandingHome;

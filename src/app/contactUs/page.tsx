import React from "react";
import FAQSection from "@/components/home2/FaqSection";
import LocationSection from "@/components/contactUs/Map";
import FaqSection from "@/components/contactUs/FaqSection";
import LandingLayout from "@/components/Layouts/LandingLayout";
import HomeContactSection from "@/components/home2/ContactSection";
import ContactForm from "@/components/contactUs/contactForm";

type QA = { q: string; a: string };

const FAQS: QA[] = [
    {
        q: "How can I get started?",
        a: "Getting started is easy! Sign up for an account, and you'll have access to our platform's features. No credit card required for the initial signup.",
    },
    {
        q: "What is the pricing structure?",
        a: "Our pricing structure is flexible. We offer both free and paid plans. You can choose the one that suits your needs and budget.",
    },
    {
        q: "What kind of support do you provide?",
        a: "We offer comprehensive customer support. You can reach out to our support team through various channels, including email, chat, and a knowledge base.",
    },
    {
        q: "Can I cancel my subscription anytime?",
        a: "Yes, you can cancel your subscription at any time without any hidden fees. We believe in providing a hassle-free experience for our users.",
    },
    {
        q: "Do you ship internationally?",
        a: "Yes, we ship to most countries worldwide. Shipping charges and delivery times may vary depending on your location.",
    },
    {
        q: "How long does the shipment take?",
        a: "Shipment times depend on your location and the shipping method chosen at checkout. Standard delivery typically takes 5-10 business days.",
    },
    {
        q: "Will I get a refund on my returned product?",
        a: "Refunds are issued for returned products in compliance with our return policy. Ensure the product is unused and in its original condition.",
    },
     {
        q: "What is the mode of payment?",
        a: "We accept various payment modes, including credit/debit cards, PayPal, and other secure payment gateways.",
    },
     {
        q: "Is a warranty available for miners?",
        a: "Yes, warranties are available for miners. Warranty terms depend on the specific product and manufacturer. Check the product details for more information.",
    },
     {
        q: "What other supporting services do you provide?",
        a: "We offer setup assistance, repair services, and customer support to ensure you have the best experience with our products.",
    }
];



function page() {
  return (
    <div>
      <LandingLayout>
        <div className="overflow-x-hidden relative bg-[#111111] px-7 pt-6 pb-20 flex flex-col gap-10">
           <div className='absolute overflow-x-hidden bg-[#22c55e]  blur-[189px] z-999 -top-0 -right-10 h-[160px] w-[160px]'></div>
          <ContactForm />
          <FAQSection faqs={FAQS} heading={'Explore Common Questions'}></FAQSection>
          <div className='absolute overflow-x-hidden bg-[#22c55e]  blur-[139px] -bottom-0 -right-10 h-[160px] w-[160px]'></div>
        </div>
      </LandingLayout>
    </div>
  );
}

export default page;

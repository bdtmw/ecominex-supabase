
"use client"
import React, { useState } from 'react';

const FAQSection = () => {
  const [openQuestion, setOpenQuestion] = useState(null);

  const faqs = [
    {
      question: "How can I get started?",
      answer: "Getting started is easy! Sign up for an account, and you'll have access to our platform's features. No credit card required for the initial signup."
    },
    {
      question: "What is the pricing structure?",
      answer: "Our pricing structure is flexible. We offer both free and paid plans. You can choose the one that suits your needs and budget."
    },
    {
      question: "What kind of support do you provide?",
      answer: "We offer comprehensive customer support. You can reach out to our support team through various channels, including email, chat, and a knowledge base."
    },
    {
      question: "Can I cancel my subscription anytime?",
      answer: "Yes, you can cancel your subscription at any time without any hidden fees. We believe in providing a hassle-free experience for our users."
    },
    {
      question: "Do you ship internationally?",
      answer: "Yes, we ship to most countries worldwide. Shipping charges and delivery times may vary depending on your location."
    },
    {
      question: "How long does the shipment take?",
      answer: "Shipment times depend on your location and the shipping method chosen at checkout. Standard delivery typically takes 5-10 business days."
    },
    {
      question: "Will I get a refund on my returned product?",
      answer: "Refunds are issued for returned products in compliance with our return policy. Ensure the product is unused and in its original condition."
    },
    {
      question: "What is the mode of payment?",
      answer: "We accept various payment modes, including credit/debit cards, PayPal, and other secure payment gateways."
    },
    {
      question: "Is a warranty available for miners?",
      answer: "Yes, warranties are available for miners. Warranty terms depend on the specific product and manufacturer. Check the product details for more information."
    },
    {
      question: "What other supporting services do you provide?",
      answer: "We offer setup assistance, repair services, and customer support to ensure you have the best experience with our products."
    }
  ];

  const toggleQuestion = (index:any) => {
    setOpenQuestion(openQuestion === index ? null : index);
  };

  return (
    <section className="py-10 bg-primary sm:py-16 lg:py-24">
      <div className="px-4 mx-auto sm:px-6 lg:px-8 max-w-7xl">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
            Explore Common Questions
          </h2>
        </div>
        <div className="max-w-3xl mx-auto mt-8 space-y-4 md:mt-16">
          {faqs.map((faq, index) => (
            <div 
              key={index} 
              className="transition-all duration-200 bg-[#1E1E1E] border border-gray-800 rounded-lg shadow-lg hover:bg-[#2A2A2A]"
            >
              <button 
                type="button" 
                onClick={() => toggleQuestion(index)}
                className="flex items-center justify-between w-full px-4 py-5 sm:p-6"
              >
                <span className="flex text-lg font-semibold text-white">
                  {faq.question}
                </span>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                  className={`w-6 h-6 text-[#20e202] transition-transform duration-300 ${
                    openQuestion === index ? 'rotate-180' : ''
                  }`}
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="2" 
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {openQuestion === index && (
                <div className="px-4 pb-5 sm:px-6 sm:pb-6">
                  <p className="text-gray-300">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
        <p className="text-center text-gray-400 text-base mt-9">
          Still have questions?{' '}
          <span 
            className="cursor-pointer font-medium text-[#20e202] transition-all duration-200 hover:text-[#20e202] hover:underline"
          >
            Contact our support
          </span>
        </p>
      </div>
    </section>
  );
};

export default FAQSection;
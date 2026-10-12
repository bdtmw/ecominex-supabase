"use client";

import { useState } from "react";

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState(null);

  const faqs = [
    {
      question: "What services do you offer?",
      answer: "We offer hosting services, machine sales, and full consultation services for cryptocurrency mining operations."
    },
    {
      question: "How does hosting work?",
      answer: "You purchase mining equipment through us, and we host it in our secure facilities. We handle all maintenance and monitoring."
    },
    {
      question: "What is the minimum commitment?",
      answer: "Our hosting agreements start at 6 months. This ensures stability for both parties."
    },
    {
      question: "Are there setup fees?",
      answer: "Yes, there is a one-time setup fee of $50 per machine to cover installation and configuration costs."
    }
  ];

  return (
    <section className="py-20 px-20 bg-[#111]">
      <div className="text-center mb-16">
        <h2 className="text-4xl font-bold text-white mb-4">
          Frequently Asked <span className="text-green-500">Questions</span>
        </h2>
      </div>
      
      <div className="max-w-3xl mx-auto">
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="bg-[#1a1a1a] rounded-lg overflow-hidden">
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-[#222] transition"
              >
                <span className="text-white font-semibold">{faq.question}</span>
                <span className="text-green-500">
                  {openIndex === index ? "−" : "+"}
                </span>
              </button>
              {openIndex === index && (
                <div className="px-6 pb-4 text-gray-300">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


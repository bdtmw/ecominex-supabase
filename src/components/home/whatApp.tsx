"use client";

import React, { useState, useEffect } from "react";
import { MessageCircle } from "lucide-react";

interface FloatingWhatsAppProps {
  phoneNumber?: string | number;
}

const FloatingWhatsApp: React.FC<FloatingWhatsAppProps> = ({
  phoneNumber = "+971563605068",
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      setIsVisible(window.pageYOffset > 300);
    };

    window.addEventListener("scroll", toggleVisibility);
    toggleVisibility();

    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  // Make sure we always work with a string
  const rawPhone = phoneNumber || "+971563605068";
  const formattedPhone = String(rawPhone).replace(/\D/g, "");

  console.log("phoneNumber prop:", phoneNumber, "→ formatted:", formattedPhone);

  // If for some reason it's still empty, don't render the button
  if (!formattedPhone) {
    console.warn("FloatingWhatsApp: invalid phoneNumber", phoneNumber);
  }

  const whatsappUrl = `https://wa.me/${formattedPhone}`;

  return (
    <>
      {isVisible && formattedPhone && (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-8 right-8 p-3 rounded-full bg-green-500 text-white shadow-lg transition-all duration-300 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400 z-50"
          aria-label="Chat on WhatsApp"
        >
          <MessageCircle className="h-9 w-9" />
        </a>
      )}
    </>
  );
};

export default FloatingWhatsApp;
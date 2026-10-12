"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

// Customer-facing support chat. It is not shown inside the admin area, where its bubble
// covered the sidebar's account/log-out controls.
const GlobalWidget = () => {
  const pathname = usePathname() || "";
  if (pathname.startsWith("/Dashboard")) return null;

  return (
    <Script
      id="lovable-widget-script"
      src="https://ecominexchatbot.lovable.app/widget.js"
      strategy="afterInteractive"
      data-title="EcoBot"
      data-accent="#49a669"
      data-position="bottom-left"
    />
  );
};

export default GlobalWidget;

// components/GlobalWidget.tsx
import Script from "next/script";

const GlobalWidget = () => {
  return (
    <Script
      id="lovable-widget-script"
      src="https://ecominexchatbot.lovable.app/widget.js"
      strategy="afterInteractive"
      data-title="EcoBot"
      data-accent="#49a669"
      data-position="bottom-left"  // ✅ Changed
    />
  );
};

export default GlobalWidget;
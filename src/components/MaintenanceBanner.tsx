import React from "react";

// Site-wide announcement shown above every page.
// - Show it:    set NEXT_PUBLIC_MAINTENANCE_BANNER=on (and rebuild/redeploy)
// - Change text: set NEXT_PUBLIC_MAINTENANCE_MESSAGE="..." (and rebuild/redeploy)
const DEFAULT_MESSAGE =
  "We are currently performing maintenance and upgrades. Some features (login, deposits, withdrawals) may be temporarily unavailable. Thank you for your patience.";

const MaintenanceBanner: React.FC = () => {
  if (process.env.NEXT_PUBLIC_MAINTENANCE_BANNER !== "on") return null;

  const message = process.env.NEXT_PUBLIC_MAINTENANCE_MESSAGE || DEFAULT_MESSAGE;

  return (
    <div
      role="status"
      aria-live="polite"
      className="relative z-[60] w-full bg-amber-500 px-4 py-2 text-center text-sm font-semibold text-black"
    >
      <span aria-hidden="true" className="mr-2">
        🛠️
      </span>
      <span className="mr-1">Maintenance Notice:</span>
      <span className="font-medium">{message}</span>
    </div>
  );
};

export default MaintenanceBanner;

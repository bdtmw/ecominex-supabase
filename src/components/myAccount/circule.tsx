// @ts-nocheck
import React from 'react';

const ProfitCycleIndicator = ({ daysLeft }) => {
  // Calculate progress percentage (0-100)
  const calculateProgress = () => {
    const progress = ((30 - daysLeft) / 30) * 100;
    return Math.min(Math.max(progress, 0), 100); // Ensure value is between 0-100
  };

  // Convert progress to stroke dash array
  const radius = 15.9155; // This creates a circle that fits perfectly in 36x36 viewBox
  const circumference = 2 * Math.PI * radius;
  const dashArray = `${(calculateProgress() * circumference) / 100} ${circumference}`;

  return (
    <div className="relative h-16 w-16">
      <svg className="h-full w-full" viewBox="0 0 36 36">
        {/* Background circle */}
        <path
          d="M18 2.0845
            a 15.9155 15.9155 0 0 1 0 31.831
            a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="#2A2A2A"
          strokeWidth="3"
          strokeLinecap="round"
        />
        {/* Progress circle */}
        <path
          d="M18 2.0845
            a 15.9155 15.9155 0 0 1 0 31.831
            a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="#21eb00"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={dashArray}
          className="transition-all duration-500 ease-in-out"
        />
        {/* Days left text */}
        <text
          x="18"
          y="18"
          dominantBaseline="middle"
          textAnchor="middle"
          fill="#ffffff"
          fontSize="8"
          className="font-medium"
        >
          {daysLeft}d
        </text>
        {/* "left" text */}
        <text
          x="18"
          y="24"
          dominantBaseline="middle"
          textAnchor="middle"
          fill="#666666"
          fontSize="6"
        >
          left
        </text>
      </svg>
    </div>
  );
};

// Example usage component with state management
const Example = () => {
  const [daysLeft, setDaysLeft] = React.useState(30);

  // Optional: Add buttons to test different values
  const updateDays = (newDays) => {
    setDaysLeft(Math.min(Math.max(newDays, 0), 30)); // Ensure value is between 0-30
  };

  return (
    <div className="space-y-4">
      <ProfitCycleIndicator daysLeft={daysLeft} />
      
      {/* Optional: Test controls */}
      <div className="flex space-x-2">
        <button
          className="rounded-md bg-zinc-800 px-3 py-1 text-sm text-white hover:bg-zinc-700"
          onClick={() => updateDays(daysLeft - 1)}
        >
          -1 Day
        </button>
        <button
          className="rounded-md bg-zinc-800 px-3 py-1 text-sm text-white hover:bg-zinc-700"
          onClick={() => updateDays(30)}
        >
          Reset
        </button>
      </div>
    </div>
  );
};

export default Example;
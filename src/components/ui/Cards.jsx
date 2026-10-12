import React from "react";

export const Cards = ({ children, className = "" }) => (
  <div className={`rounded-2xl shadow-md border border-gray-200 p-6 bg-[#191919] ${className}`}>
    {children}
  </div>
);

export const CardHeader = ({ children }) => <div className="mb-4">{children}</div>;
export const CardTitle = ({ children }) => <h3 className="text-xl font-semibold">{children}</h3>;
export const CardDescription = ({ children }) => <p className="text-gray-600">{children}</p>;
export const CardContent = ({ children }) => <div>{children}</div>;
export const CardFooter = ({ children }) => <div className="mt-4">{children}</div>;

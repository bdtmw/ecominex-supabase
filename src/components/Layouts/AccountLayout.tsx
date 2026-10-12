"use client";
import React, { useState } from "react";
import AccountLayout from "../myAccount/layout";

export default function DefaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="">
      <div className="">
        <AccountLayout>
          <main>
            <div className="mx-auto max-w-screen-2xl ">
              {children}
            </div>
          </main>
        </AccountLayout>
      </div>
    </div>
  );
}

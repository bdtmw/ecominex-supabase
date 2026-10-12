"use client";
import React, { useState, ReactNode } from "react";
import Navbar from "../NavBar";
import Footer from "@/components/home/Footer";
import { AdminNavbar } from "../AdminNavbar";
import FloatingWhatsApp from "../home/whatApp";
import HomeNavbar from "../HomeNavbar";
import { usePathname } from "next/navigation";
import HomeFooter from "../home2/Footer";

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const pathname = usePathname();


  return (
    <>
      <div className="bg-black-2" >
        <FloatingWhatsApp phoneNumber="+971563605068" />

            <HomeNavbar />


        <div >

          <main>
            <div >
              {children}
            </div>
          </main>
            <HomeFooter />
        </div>
      </div>
    </>
  );
}

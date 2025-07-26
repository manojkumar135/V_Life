"use client";

import React, { useState } from "react";
import SideNav from "@/components/common/sidenav";
import Header from "@/components/common/header";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [showSidebar, setShowSidebar] = useState(false);

  return (
    <div className="flex h-screen bg-[#f9f9f9] overflow-hidden w-screen">
      {/* SideNav for desktop and mobile */}
      <SideNav isOpen={showSidebar} setIsOpen={setShowSidebar} />

      <div className="flex flex-col flex-1">
        {/* Pass toggle function to Header */}
        <Header onMenuClick={() => setShowSidebar(true)} />
        <main className="flex-1 overflow-y-auto p-0 bg-white scrollbar-hide max-md:w-screen">
          {children}
        </main>
      </div>
    </div>
  );
}

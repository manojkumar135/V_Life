import SideNav from "@/components/common/sidenav";
import Header from "@/components/common/header";
import React from "react";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-[#f9f9f9] overflow-hidden">
      <SideNav />
      <div className="flex flex-col flex-1">
        <Header />
        <main className="flex-1 overflow-y-auto p-0 bg-white scrollbar-hide">{children}</main>
      </div>
    </div>
  );
}


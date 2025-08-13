"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import SideNav from "@/components/common/sidenav";
import Header from "@/components/common/header";
import Loader from "@/components/common/loader";
import { Toaster } from 'sonner';
import "@/components/common/Toast/toastStyles.css";

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [showSidebar, setShowSidebar] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const timeout = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timeout);
  }, [pathname]);

  return (
    <>
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <Loader />
        </div>
      )}
      <Toaster position="top-right" richColors closeButton />

      <div className="flex h-screen bg-white overflow-hidden w-screen">
        <SideNav isOpen={showSidebar} setIsOpen={setShowSidebar} />
        <div className="flex flex-col flex-1">
          <Header onMenuClick={() => setShowSidebar(true)} />
          <main className="flex-1 overflow-y-auto p-0 bg-white scrollbar-hide max-md:w-screen">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
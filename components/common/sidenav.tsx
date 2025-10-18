"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { RiLogoutCircleRLine } from "react-icons/ri";
import { LuLayoutDashboard } from "react-icons/lu";
import { IoPeople, IoSettings } from "react-icons/io5";
import { FaWallet, FaHistory } from "react-icons/fa";
import { FaBoxesPacking } from "react-icons/fa6";
import { IoMdClose } from "react-icons/io";
import Images from "@/constant/Image";
import LogoutModal from "@/components/common/logoutModal";
import { useVLife } from "@/store/context";
import axios from "axios";
import Loader from "@/components/common/loader";

export default function SideNav({
  isOpen,
  setIsOpen,
}: {
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearUser } = useVLife();

  const [isLogoutOpen, setIsLogoutOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const menuItems = [
    {
      href: "/dashboards",
      icon: <LuLayoutDashboard />,
      label: "Dashboard",
      match: ["dashboard"],
    },
    {
      href:
        user?.role === "superadmin"
          ? "/administration"
          : "/administration/users",
      icon: <IoPeople />,
      label: "Administration",
      match: ["administration"],
    },
    { href: "/wallet", icon: <FaWallet />, label: "Wallet", match: ["wallet"] },
    {
      href: "/orders",
      icon: <FaBoxesPacking />,
      label: "Orders",
      match: ["orders", "products"], // 👈 include both
    },
    {
      href: "/historys",
      icon: <FaHistory />,
      label: "History",
      match: ["history"],
    },
    {
      href: "/settings",
      icon: <IoSettings />,
      label: "Settings",
      match: ["settings"],
    },
  ];

  const handleNavigation = (path: string) => {
    router.push(path);
    setIsOpen(false); // close sidebar on mobile
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      await axios.post("/api/logout");
      clearUser();
      router.push("/auth/login");
    } catch (err) {
      console.error("Logout failed:", err);
      clearUser();
      router.push("/auth/login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Desktop SideNav */}
      <div
        className="hidden md:flex flex-col items-center
       w-20 bg-gradient-to-b from-yellow-500 via-yellow-400 to-yellow-500 pt-20 pb-6 
       rounded-r-2xl justify-between border-r border-yellow-500/20 shadow-lg relative"
      >
        {/* Logo */}
        <div className="absolute left-1/2 -translate-x-1/2 top-4 max-lg:top-6  z-10 ">
          <div className="w-14 h-14 rounded-full bg-white border-2 border-white shadow-lg overflow-hidden relative">
            <Image
              src={Images.Maverick}
              alt="logo"
              fill
              className="object-cover rounded-full"
            />
          </div>
        </div>

        {/* Menu Items */}
        <div className="flex flex-col items-center gap-2 flex-grow w-full mt-4 max-lg:mt-8">
          {menuItems.map((item, index) => {
            const isActive = item.match.some((m) => pathname.includes(m));
            return (
              <div key={index} className="relative group">
                <button
                  onClick={() => handleNavigation(item.href)}
                  className={`p-2 rounded-xl w-12 h-12 flex items-center justify-center cursor-pointer transition-all duration-300 ease-in-out ${
                    isActive
                      ? "bg-white text-black shadow-lg scale-110"
                      : "text-white hover:text-black hover:scale-105"
                  }`}
                >
                  <span className="text-[24px]">{item.icon}</span>
                </button>
                {/* Tooltip */}
                <span
                  className="absolute left-full top-1/2 -translate-y-1/2 ml-0 px-2 py-1 text-xs 
                  font-medium text-white bg-gray-900 rounded-md shadow-md opacity-0 group-hover:opacity-100 group-hover:delay-[400ms]
                  translate-x-2 group-hover:translate-x-0 transition-all duration-300 whitespace-nowrap z-50"
                >
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Logout (Desktop) */}
        <div className="w-full flex justify-center ">
          <div className="relative group ">
            <button
              onClick={() => setIsLogoutOpen(true)}
              className="p-3 rounded-xl w-12 h-12 flex items-center justify-center text-white hover:bg-black/90
              hover:shadow-md transition-all duration-300 cursor-pointer max-lg:-mt-35"
            >
              <span className="text-[26px]">
                <RiLogoutCircleRLine />
              </span>
            </button>

            {/* Tooltip */}
            <span
              className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 text-xs font-medium 
              text-white bg-gray-900 rounded-md shadow-md opacity-0 group-hover:opacity-100 group-hover:delay-[300ms]
              translate-x-2 group-hover:translate-x-0 transition-all duration-300 whitespace-nowrap z-50"
            >
              Logout
            </span>
          </div>
        </div>
      </div>

      {/* Blurred Background Overlay (Mobile Only) */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile SideNav */}
      <div
        className={`md:hidden fixed top-0 left-0 z-50 h-full w-[200px] rounded-r-xl bg-gradient-to-b from-yellow-500 via-yellow-400 to-yellow-500 p-6 transform transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Close Button */}
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-3 right-2 text-white text-2xl transition-colors duration-300 hover:text-red-600"
        >
          <IoMdClose size={20} />
        </button>

        {/* Logo */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center">
          <Image
            src={Images.Maverick}
            alt="logo"
            width={64}
            height={64}
            className="object-contain rounded-md"
          />
        </div>

        {/* Menu Items */}
        <div className="flex flex-col space-y-3 w-[110%]">
          {menuItems.map((item, index) => {
            const isActive = item.match.some((m) => pathname.includes(m));
            return (
              <button
                key={index}
                onClick={() => handleNavigation(item.href)}
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 ${
                  isActive
                    ? "bg-white text-black"
                    : "text-white hover:bg-white/10"
                }`}
              >
                <span className="text-[22px] max-md:text-[18px]">
                  {item.icon}
                </span>
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Logout (Mobile) */}
        <button
          onClick={() => setIsLogoutOpen(true)}
          className="mt-10 max-sm:mt-40 flex items-center gap-3 px-3 py-2 rounded-md text-black hover:bg-white/10"
        >
          <span className="text-[22px] max-md:text-[22px]">
            <RiLogoutCircleRLine />
          </span>
          <span className="text-md font-semibold">Logout</span>
        </button>
      </div>

      {/* Logout Modal */}
      <LogoutModal
        isOpen={isLogoutOpen}
        setIsOpen={setIsLogoutOpen}
        onLogout={handleLogout}
      />

      {/* Loader Overlay */}
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <Loader />
        </div>
      )}
    </>
  );
}

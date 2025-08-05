"use client";

import React from "react";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { RiLogoutCircleRLine } from "react-icons/ri";
import { LuLayoutDashboard } from "react-icons/lu";
import { IoPeople, IoSettings } from "react-icons/io5";
import { FaWallet, FaHistory } from "react-icons/fa";
import { FaBoxesPacking } from "react-icons/fa6";
import { IoMdClose } from "react-icons/io";
import Images from "@/constant/Image";

const menuItems = [
  {
    href: "/dashboard",
    icon: <LuLayoutDashboard />,
    label: "Dashboard",
  },
  {
    href: "/administration",
    icon: <IoPeople />,
    label: "Administration",
  },
  { href: "/wallet", icon: <FaWallet />, label: "Wallet" },
  { href: "/orders", icon: <FaBoxesPacking />, label: "Orders" },
  { href: "/historys", icon: <FaHistory />, label: "History" },
  { href: "/settings", icon: <IoSettings />, label: "Settings" },
];

export default function SideNav({
  isOpen,
  setIsOpen,
}: {
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const handleNavigation = (path: string) => {
    router.push(path);
    setIsOpen(false); // Close sidebar on mobile after navigation
  };

  return (
    <>
      {/* Desktop SideNav */}
      <div className="hidden md:flex flex-col items-center w-20 bg-gradient-to-b from-yellow-500 via-yellow-400 to-yellow-500 pt-20 pb-6 rounded-r-2xl justify-between border-r border-yellow-500/20 shadow-lg relative">
        {/* Logo */}
        <div className="absolute left-1/2 -translate-x-1/2 top-4 z-10">
          <div className="w-14 h-14 rounded-full bg-white border-2 border-white shadow-lg overflow-hidden flex items-center justify-center">
            <Image
              src={Images.LogoImage}
              alt="logo"
              width={48}
              height={48}
              className="object-contain"
            />
          </div>
        </div>

        {/* Menu Items */}
        <div className="flex flex-col items-center gap-2 flex-grow w-full mt-10">
          {menuItems.map((item, index) => {
            const isActive = pathname === item.href;
            return (
              <div key={index} className="relative group">
                <button
                  onClick={() => handleNavigation(item.href)}
                  className={`group p-2 rounded-xl w-12 h-12 flex items-center justify-center transition-all duration-300 ease-in-out ${
                    isActive
                      ? "bg-white text-black shadow-lg scale-110"
                      : "text-white hover:text-black hover:scale-105"
                  }`}
                >
                  <span className="text-[24px]">{item.icon}</span>
                </button>
                <span className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded-md shadow-md opacity-0 group-hover:opacity-100 group-hover:delay-[800ms] transition-opacity duration-200 whitespace-nowrap z-50 pointer-events-none group-hover:pointer-events-auto">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Logout */}
        <div className="w-full flex justify-center">
          <div className="relative">
            <button
              onClick={() => handleNavigation("/auth/login")}
              className="group p-3 rounded-xl w-12 h-12 flex items-center justify-center text-white hover:bg-white/90 hover:text-black hover:shadow-md transition-all duration-300"
            >
              <span className="text-[26px]">
                <RiLogoutCircleRLine />
              </span>
            </button>
            <span className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap z-50">
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

      {/* Mobile SideNav Overlay */}
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
          <IoMdClose size={20}/>
        </button>

        {/* Logo */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center">
          <Image
            src={Images.LogoImage}
            alt="logo"
            width={64}
            height={64}
            className="object-contain rounded-md"
          />
        </div>

        {/* Menu Items */}
        <div className="flex flex-col space-y-3 w-[110%]">
          {menuItems.map((item, index) => {
            const isActive = pathname === item.href;
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
                <span className="text-[22px] max-md:text-[18px]">{item.icon}</span>
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Logout */}
        <button
          onClick={() => handleNavigation("/auth/login")}
          className="mt-10 max-sm:mt-40 flex items-center gap-3 px-3 py-2 rounded-md text-white hover:bg-white/10"
        >
          <span className="text-[22px] max-md:text-[18px]">
            <RiLogoutCircleRLine />
          </span>
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </>
  );
}

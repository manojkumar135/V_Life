"use client";

import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { RiLogoutCircleRLine } from "react-icons/ri";
import { LuLayoutDashboard } from "react-icons/lu";
import { IoPeople, IoSettings } from "react-icons/io5";
import { FaWallet, FaHistory } from "react-icons/fa";
import { FaBoxesPacking } from "react-icons/fa6";

import Images from "@/constant/Image";

const menuItems = [
  {
    href: "/dashboard",
    icon: <LuLayoutDashboard size={25} />,
    label: "Dashboard",
  },
  {
    href: "/administration",
    icon: <IoPeople size={25} />,
    label: "Administration",
  },
  { href: "/wallet", icon: <FaWallet size={25} />, label: "Wallet" },
  { href: "/orders", icon: <FaBoxesPacking size={25} />, label: "Orders" },
  { href: "/historys", icon: <FaHistory size={25} />, label: "History" },
  { href: "/settings", icon: <IoSettings size={25} />, label: "Settings" },
];

export default function SideNav() {
  const pathname = usePathname();
  const router = useRouter();

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  return (
    <div className="relative flex h-screen overflow-visible">
      {/* Floating Avatar */}
      <div className="absolute left-1/2 -translate-x-1/2 top-4 z-10 transition-all duration-300 hover:scale-110">
        <div className="w-14 h-14 rounded-full bg-white border-2 border-white shadow-lg overflow-hidden flex items-center justify-center">
          <Image
            src={Images.LogoImage}
            alt="logo"
            width={48}
            height={48}
            className="object-contain"
            priority
          />
        </div>
      </div>

      {/* Sidebar */}
      <div className="flex flex-col items-center w-16 md:w-20 bg-gradient-to-b from-yellow-500 via-yellow-400 to-yellow-400 pt-20 pb-6 rounded-r-2xl justify-between border-r border-yellow-500/20 shadow-lg">
        {/* Navigation Menu */}
        <div className="flex flex-col items-center gap-2 flex-grow w-full mt-10">
          {menuItems.map((item, index) => {
            const isActive = pathname === item.href;
            return (
             <div key={index} className="relative group">
  <button
    onClick={() => handleNavigation(item.href)}
    className={`group p-2 rounded-xl w-12 h-12 flex items-center justify-center 
      transition-all duration-300 ease-in-out 
      ${isActive
        ? "bg-white text-black shadow-lg scale-110"
        : "text-white hover:text-black hover:scale-105"}`}
  >
    {item.icon}
  </button>

  {/* Tooltip */}
  <span
    className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 text-xs
      font-medium text-white bg-gray-900 rounded-md shadow-md opacity-0
      group-hover:opacity-100 group-hover:delay-[800ms] transition-opacity duration-200
      whitespace-nowrap z-50 pointer-events-none group-hover:pointer-events-auto"
  >
    {item.label}
  </span>
</div>

            );
          })}
        </div>

        {/* Logout Button */}
        <div className="w-full flex justify-center">
          <div className="relative">
            <button
              onClick={() => handleNavigation("/auth/login")}
              className="group p-3 rounded-xl w-12 h-12 flex items-center justify-center text-white hover:bg-white/90 hover:text-black hover:shadow-md transition-all duration-300"
            >
              <RiLogoutCircleRLine size={30} className="font-semibold" />
            </button>

            {/* Tooltip */}
            <span className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap z-50">
              Logout
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { HiUserCircle } from "react-icons/hi";
import { MdNotificationsNone } from "react-icons/md";
import { HiOutlineMenuAlt2 } from "react-icons/hi";
import { useVLife } from "@/store/context";
import ShowToast from "@/components/common/Toast/toast";

export default function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const { user } = useVLife();
  const [showPopup, setShowPopup] = useState(false);
  const [alerts, setAlerts] = useState([
    { id: 1, message: "Payment received successfully!" },
    { id: 2, message: "Your profile was updated." },
    { id: 3, message: "New referral joined your team." },
  ]);

  const popupRef = useRef<HTMLDivElement>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipTimer, setTooltipTimer] = useState<NodeJS.Timeout | null>(null);

  // ✅ Copy user ID
  const handleCopy = async () => {
    if (!user?.user_id) return;
    try {
      await navigator.clipboard.writeText(user.user_id);
      ShowToast.success("User Id Copied successfully");
    } catch {
      ShowToast.error("Failed to copy User Id");
    }
  };

  // ✅ Toggle notification popup
  const togglePopup = () => setShowPopup((prev) => !prev);

  // ✅ Close popup on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setShowPopup(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ✅ Tooltip delay logic
  const handleMouseEnter = () => {
    const timer = setTimeout(() => setShowTooltip(true), 700); // 700ms delay
    setTooltipTimer(timer);
  };

  const handleMouseLeave = () => {
    if (tooltipTimer) clearTimeout(tooltipTimer);
    setShowTooltip(false);
  };

  return (
    <header className="flex items-center justify-between w-full px-4 py-2 h-[60px] pt-3">
      {/* LEFT: Greeting */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onMenuClick}
          className="md:hidden p-1 rounded-md hover:bg-gray-100"
        >
          <HiOutlineMenuAlt2 size={30} className="text-gray-800" />
        </button>

        <h1 className="text-[1.5rem] max-md:text-[1rem] font-semibold text-gray-800 truncate max-w-[400px] max-md:max-w-[200px]">
          Hello,{" "}
          <span>
            {user?.user_name
              ? user.user_name
                  .split(" ")
                  .map(
                    (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
                  )
                  .join(" ")
              : "User"}
          </span>
        </h1>
      </div>

      {/* RIGHT: Notification + Avatar */}
      <div className="flex items-center space-x-4 max-md:space-x-2 relative">
        {/* 🔔 Notification Button */}
        <div className="relative" ref={popupRef}>
          <button
            className="p-1 rounded-full bg-gray-100 cursor-pointer relative"
            onClick={togglePopup}
          >
            <MdNotificationsNone className="w-6 h-6 text-gray-700" />
            {alerts.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full px-[5px] py-[1px]">
                {alerts.length}
              </span>
            )}
          </button>

          {/* 🔔 Popup */}
          {showPopup && (
            <div className="absolute right-0 mt-2 w-64 bg-white shadow-lg rounded-md border border-gray-200 z-50">
              <div className="p-3 border-b font-semibold text-gray-800">
                Notifications
              </div>
              <div className="max-h-64 overflow-y-auto">
                {alerts.length > 0 ? (
                  alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="px-3 py-2 hover:bg-gray-50 text-sm text-gray-700 border-b last:border-0"
                    >
                      {alert.message}
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-4 text-sm text-gray-500 text-center">
                    No new notifications
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 👤 User Avatar with delayed tooltip */}
        <div
          className="relative flex items-center justify-center"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <button
            onClick={handleCopy}
            className="px-1 rounded-full hover:bg-gray-100 flex items-center justify-center cursor-pointer"
          >
            {user?.profile ? (
              <img
                src={user.profile}
                alt="Profile"
                className="w-10 h-10 max-md:w-8 max-md:h-8 rounded-full object-cover border border-gray-300"
              />
            ) : (
              <HiUserCircle className="w-10 h-10 max-md:w-8 max-md:h-8 text-black" />
            )}
          </button>

          {/* Tooltip with fade animation + delay */}
          <div
            className={`absolute top-10 -translate-x-1/2 flex flex-col items-center bg-gray-800 text-white text-xs rounded-md px-2 py-1 whitespace-nowrap transition-all duration-300 ${
              showTooltip
                ? "opacity-100 translate-y-0"
                : "opacity-0 pointer-events-none -translate-y-1"
            }`}
          >
            <span className="uppercase">{user?.role || "N/A"}</span>
            <span>{user?.user_id || "N/A"}</span>
          </div>
        </div>
      </div>
    </header>
  );
}

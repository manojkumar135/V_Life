"use client";

import { useState, useEffect, useRef } from "react";
import { HiUserCircle } from "react-icons/hi";
import { MdNotificationsNone, MdDelete } from "react-icons/md";
import { HiOutlineMenuAlt2 } from "react-icons/hi";
import { IoClose } from "react-icons/io5";
import { useVLife } from "@/store/context";
import ShowToast from "@/components/common/Toast/toast";

export default function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const { user } = useVLife();

  const [showModal, setShowModal] = useState(false);
  const [alerts, setAlerts] = useState([
    { id: 1, message: "Payment received successfully!", seen: false },
    { id: 2, message: "Your profile was updated.", seen: true },
    { id: 3, message: "New referral joined your team.", seen: false },
  ]);

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

  // ✅ Toggle modal
  const toggleModal = () => setShowModal((prev) => !prev);

  // ✅ Mark alert as seen
  const markAsSeen = (id: number) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, seen: true } : a))
    );
  };

  // ✅ Delete alert
  const handleDelete = (id: number) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const unseenCount = alerts.filter((a) => !a.seen).length;

  // ✅ Tooltip delay logic
  const handleMouseEnter = () => {
    const timer = setTimeout(() => setShowTooltip(true), 700);
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
        <button
          className="p-1 rounded-full bg-gray-100 cursor-pointer relative"
          onClick={toggleModal}
        >
          <MdNotificationsNone className="w-6 h-6 text-gray-700" />
          {unseenCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full px-[5px] py-[1px]">
              {unseenCount}
            </span>
          )}
        </button>

        {/* 🧾 Modal */}
        {showModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
            onClick={toggleModal}
          >
            <div
              className="bg-white rounded-lg shadow-lg relative p-6 h-4/5 w-5/7 max-sm:h-6/7 max-md:w-11/12"
              onClick={(e) => e.stopPropagation()}
            >
              {/* ❌ Close Button */}
              <button
                className="absolute top-3 right-3 text-gray-500 hover:text-red-600 cursor-pointer"
                onClick={toggleModal}
              >
                <IoClose size={24} />
              </button>

              <h2 className="text-xl font-semibold mb-4">Notifications</h2>

              <div className="text-sm text-gray-700 h-8/9 overflow-y-auto border-t border-gray-200 pt-2">
                {alerts.length > 0 ? (
                  alerts.map((alert) => (
                    <div
                      key={alert.id}
                      onClick={() => markAsSeen(alert.id)}
                      className={`flex justify-between items-center px-4 py-2 border-b last:border-0 cursor-pointer transition-colors ${
                        alert.seen
                          ? "bg-gray-50 text-gray-500"
                          : "bg-white hover:bg-blue-50 text-gray-800"
                      }`}
                    >
                      <span
                        className={`text-sm ${
                          alert.seen ? "font-normal" : "font-semibold"
                        }`}
                      >
                        {alert.message}
                      </span>
                      <MdDelete
                        className="text-gray-400 hover:text-red-500 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(alert.id);
                        }}
                        size={18}
                      />
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center text-gray-500 text-sm">
                    No new notifications
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 👤 User Avatar with tooltip */}
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

          {/* Tooltip */}
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

"use client";

import { useState, useEffect, useRef } from "react";
import { HiUserCircle } from "react-icons/hi";
import { MdNotificationsNone, MdDelete } from "react-icons/md";
import { HiOutlineMenuAlt2 } from "react-icons/hi";
import { IoClose } from "react-icons/io5";
import { useVLife } from "@/store/context";
import axios from "axios";
import ShowToast from "@/components/common/Toast/toast";

export default function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const { user } = useVLife();

  const [showModal, setShowModal] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipTimer, setTooltipTimer] = useState<NodeJS.Timeout | null>(null);

  // ✅ Fetch alerts
  const fetchAlerts = async () => {
    if (!user) return;
    setLoading(true);
    try {
      let url = "/api/alerts-operations?";

      if (user.role === "admin") {
        // Admin: get alerts where (role=admin & priority=high) OR user_id=user.user_id
        url += `role=admin&priority=high&user_id=${user.user_id}`;
      } else {
        // User: get alerts for their user_id only
        url += `role=user&user_id=${user.user_id}`;
      }

      const res = await axios.get(url);
      if (res.data.success) {
        const sorted = res.data.data.sort(
          (a: any, b: any) => Number(a.read) - Number(b.read)
        );
        setAlerts(sorted);
      } else {
        ShowToast.error(res.data.message || "Failed to load alerts");
      }
    } catch (err) {
      console.error("Fetch Alerts Error:", err);
      ShowToast.error("Failed to load alerts");
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount & when user changes
  useEffect(() => {
    if (user?.user_id) fetchAlerts();
  }, [user]);

  // ✅ Mark all alerts as seen when modal opens
  const markAllAsSeen = async () => {
    if (!alerts.length) return;

    try {
      const unseenIds = alerts.filter((a) => !a.read).map((a) => a._id || a.id);
      if (unseenIds.length > 0) {
        await axios.patch("/api/alerts-operations", {
          ids: unseenIds,
          read: true,
        });
        setAlerts((prev) =>
          prev.map((a) => ({ ...a, read: true }))
        );
      }
    } catch (err) {
      console.error("Mark all seen failed:", err);
    }
  };

  // ✅ Toggle modal and mark all as seen
  const toggleModal = async () => {
    setShowModal((prev) => {
      const newState = !prev;
      if (!prev && alerts.length > 0) {
        markAllAsSeen(); // Mark all as seen when opening modal
      }
      return newState;
    });
  };

  // ✅ Mark individual alert as seen
  const markAsSeen = async (id: string) => {
    try {
      await axios.patch(`/api/alerts-operations?id=${id}`, { read: true });
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, read: true } : a))
      );
    } catch {
      // ShowToast.error("Failed to mark alert as read");
    }
  };

  // ✅ Delete alert
  const handleDelete = async (id: string) => {
    try {
      setLoading(true);
      await axios.delete(`/api/alerts-operations?id=${id}`);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
      ShowToast.success("Alert deleted");
      setShowModal(false);
    } catch {
      ShowToast.error("Failed to delete alert");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Copy User ID
  const handleCopy = async () => {
    if (!user?.user_id) return;
    try {
      await navigator.clipboard.writeText(user.user_id);
      ShowToast.success("User Id Copied successfully");
    } catch {
      ShowToast.error("Failed to copy User Id");
    }
  };

  // Tooltip show/hide logic
  const handleMouseEnter = () => {
    const timer = setTimeout(() => setShowTooltip(true), 700);
    setTooltipTimer(timer);
  };
  const handleMouseLeave = () => {
    if (tooltipTimer) clearTimeout(tooltipTimer);
    setShowTooltip(false);
  };

  const unseenCount = alerts.filter((a) => !a.read).length;

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

        {/* 🧾 Notifications Modal */}
        {showModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
            onClick={toggleModal}
          >
            <div
              className="bg-white rounded-lg shadow-lg relative p-6 h-4/5 w-5/7 max-sm:h-6/7 max-md:w-11/12"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="absolute top-3 right-3 text-gray-500 hover:text-red-600 cursor-pointer"
                onClick={toggleModal}
              >
                <IoClose size={24} />
              </button>

              <h2 className="text-xl font-semibold mb-4">Notifications</h2>

              <div className="text-sm text-gray-700 h-8/9 overflow-y-auto border-t border-gray-200 pt-2">
                {loading ? (
                  <div className="px-4 py-8 text-center text-gray-500 text-sm">
                    Loading...
                  </div>
                ) : alerts.length > 0 ? (
                  alerts.map((alert) => (
                    <div
                      key={alert._id || alert.id}
                      onClick={() => {
                        markAsSeen(alert._id || alert.id);
                        if (alert.link) window.location.href = alert.link;
                      }}
                      className={`flex justify-between items-start p-4 mb-3 rounded-lg border border-gray-200 border-l-4 cursor-pointer transition-colors shadow-sm ${
                        alert.read
                          ? "bg-gray-50 text-gray-500 border-l-gray-400"
                          : "bg-white hover:bg-blue-50 text-gray-800 border-l-blue-500"
                      }`}
                    >
                      <div className="flex flex-col flex-grow pr-3">
                        <span
                          className={`text-sm mb-1 ${
                            alert.read ? "font-normal" : "font-semibold"
                          }`}
                        >
                          {alert.title || "Notification"}
                        </span>
                        {alert.description && (
                          <p className="text-xs text-gray-600 mb-1 line-clamp-2">
                            {alert.description}
                          </p>
                        )}
                        <span className="text-[11px] text-gray-400">
                          {alert.date || ""}
                        </span>
                      </div>

                      <MdDelete
                        className="text-red-400 hover:text-red-600 cursor-pointer flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(alert._id || alert.id);
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

        {/* 👤 User Avatar */}
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

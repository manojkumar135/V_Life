"use client";

import { useEffect } from "react";
import { FaMoon, FaSun } from "react-icons/fa";
import { HiUserCircle } from "react-icons/hi";
import { MdNotificationsNone } from "react-icons/md";
import { HiOutlineMenuAlt2 } from "react-icons/hi";
import { useVLife } from "@/store/context";
import axios from "axios";

export default function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, theme, setTheme } = useVLife();

  // console.log(user,theme,"from header")

  // Apply theme globally
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    if (theme === "dark") root.classList.add("dark");
    else root.classList.add("light");
  }, [theme]);

  const toggleTheme = async () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);

    // ✅ Update user theme in backend
    try {
      await axios.patch("/api/theme-operations", {
        user_id: user.user_id,
        theme: newTheme,
      });
    } catch (error) {
      console.error("Failed to update theme:", error);
    }
  };

  return (
    <header className="flex items-center justify-between w-full max-md:w-screen px-4 py-2 bg-[var(--background)] text-[var(--foreground)] h-[60px] shadow-sm">
      <div className="flex items-center space-x-3">
        {/* Hamburger Icon - visible only on small screens */}
        <button
          onClick={onMenuClick}
          className="md:hidden p-1 rounded-md hover:bg-gray-100"
        >
          <HiOutlineMenuAlt2
            size={30}
            className="text-gray-800 dark:text-gray-200"
          />
        </button>
        <h1 className="text-[1.5rem] max-md:text-[1rem] font-semibold text-gray-800 dark:text-gray-100 truncate max-w-[400px] max-md:max-w-[150px]">
          Hello, {user?.user_name || "User"}
        </h1>
      </div>

      <div className="flex items-center space-x-4 max-md:space-x-2">
        <button className="p-1 rounded-full bg-gray-100 ">
          <MdNotificationsNone className="w-6 h-6 text-gray-700 dark:text-gray-300" />
        </button>
        <button
          className="p-2 rounded-full bg-gray-100 "
          onClick={toggleTheme}
        >
          {theme === "dark" ? (
            <FaSun className="w-5 h-5 text-yellow-400" />
          ) : (
            <FaMoon className="w-5 h-5 text-gray-700" />
          )}
        </button>
        <button
          className="px-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          title={user?.user_id}
        >
          <HiUserCircle className="w-10 h-10 max-md:w-8 max-md:h-8 text-black dark:text-purple-400" />
        </button>
      </div>
    </header>
  );
}

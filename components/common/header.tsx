"use client";

import { useEffect, useState } from "react";
import { FaMoon, FaSun } from "react-icons/fa";
import { HiUserCircle } from "react-icons/hi";
import { MdNotificationsNone } from "react-icons/md";
import { RxHamburgerMenu } from "react-icons/rx";

export default function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  return (
    <header className="flex items-center justify-between w-full px-4 py-2 bg-white dark:bg-gray-900 h-[60px] shadow-sm">
      <div className="flex items-center space-x-3">
        {/* Hamburger Icon - visible only on small screens */}
        <button onClick={onMenuClick} className="lg:hidden p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
          <RxHamburgerMenu className="text-xl text-gray-800 dark:text-gray-200" />
        </button>
        <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Hello, User</h1>
      </div>

      <div className="flex items-center space-x-4">
        <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
          <MdNotificationsNone className="w-6 h-6 text-gray-700 dark:text-gray-300" />
        </button>
        <button
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          onClick={() => setDarkMode((prev) => !prev)}
        >
          {darkMode ? (
            <FaSun className="w-5 h-5 text-yellow-400" />
          ) : (
            <FaMoon className="w-5 h-5 text-gray-700" />
          )}
        </button>
        <button className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
          <HiUserCircle className="w-10 h-10 text-black dark:text-purple-400" />
        </button>
      </div>
    </header>
  );
}

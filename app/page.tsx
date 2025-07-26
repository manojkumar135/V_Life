"use client";

import React from "react";
import { useRouter } from "next/navigation";

const WelcomePage = () => {
  const router = useRouter();

  const handleProceed = () => {
    router.push("/auth/login");
  };

  return (
    <div className="w-full h-screen flex flex-col justify-center items-center bg-gray-100">
      <h1 className="text-4xl font-bold mb-6 text-gray-800">Welcome to V Life Global</h1>
      <button
        onClick={handleProceed}
        className="px-6 py-3 bg-blue-600 text-white cursor-pointer rounded-lg hover:bg-blue-700 transition"
      >
        Proceed
      </button>
    </div>
  );
};

export default WelcomePage;

"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { FaUsers, FaMoneyBillWave, FaChartLine } from "react-icons/fa";

const WelcomePage = () => {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="w-full flex justify-between items-center px-8 py-4 bg-white shadow-md fixed top-0 left-0 right-0 z-10">
        <h2 className="text-2xl font-bold text-yellow-500">V Life Global</h2>
        <div className="space-x-4">
          <button
            onClick={() => router.push("/auth/login")}
            className="px-4 py-2 text-black border border-black rounded-lg hover:bg-gray-100 transition cursor-pointer"
          >
            Login
          </button>
          <button
            onClick={() => router.push("/auth/register")}
            className="px-4 py-2 bg-yellow-500 text-black font-semibold rounded-lg hover:bg-yellow-400 transition cursor-pointer"
          >
            Sign Up
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex flex-col justify-center items-center flex-grow text-center px-6 pt-28">
        <h1 className="text-5xl font-extrabold text-gray-900 leading-tight">
          Welcome to{" "}
          <span className="text-yellow-500">V Life Global</span>
        </h1>
        <p className="mt-4 text-lg text-gray-600 max-w-2xl">
          Join our global community and explore opportunities to grow, earn, and
          succeed together. Your journey to financial freedom starts here.
        </p>
        <button
          onClick={() => router.push("/auth/signup")}
          className="mt-6 px-8 py-3 bg-black text-yellow-400 font-semibold rounded-lg hover:bg-gray-800 shadow-lg transition transform hover:scale-105"
        >
          Get Started
        </button>
      </main>

      {/* Features Section */}
      <section className="px-8 py-16 bg-gray-50">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Why Choose Us?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="bg-white p-8 rounded-2xl shadow hover:shadow-lg transition text-center border-t-4 border-yellow-400">
            <FaUsers className="text-yellow-500 text-5xl mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Community
            </h3>
            <p className="text-gray-600">
              Be part of a strong and supportive global network.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow hover:shadow-lg transition text-center border-t-4 border-yellow-400">
            <FaMoneyBillWave className="text-yellow-500 text-5xl mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Earnings
            </h3>
            <p className="text-gray-600">
              Unlock opportunities for income and financial growth.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow hover:shadow-lg transition text-center border-t-4 border-yellow-400">
            <FaChartLine className="text-yellow-500 text-5xl mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Growth
            </h3>
            <p className="text-gray-600">
              Achieve personal and professional growth with us.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-yellow-400 py-6 mt-auto">
        <div className="text-center text-sm">
          © {new Date().getFullYear()} V Life Global. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default WelcomePage;

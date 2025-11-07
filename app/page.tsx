"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  FaUsers,
  FaMoneyBillWave,
  FaChartLine,
  FaArrowRight,
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaTwitter,
} from "react-icons/fa";

const MaverickHome = () => {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-white font-sans">
      {/* Header */}
      <header className="w-full fixed top-0 left-0 z-50 bg-white/75 backdrop-blur-md shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center px-6 md:px-10 py-4">
          <h1 className="text-2xl md:text-3xl font-extrabold text-yellow-500 tracking-wide">
            MAVERICK
          </h1>
          <div className="space-x-3 md:space-x-6 flex items-center">
            <button
              onClick={() => router.push("/auth/login")}
              className="px-4 py-2 font-semibold text-sm md:text-base border-1 border-black text-black rounded-xl hover:bg-yellow-400 hover:text-white transition-all"
            >
              Login
            </button>
            <button
              onClick={() => router.push("/auth/register")}
              className="px-4 py-2 font-semibold text-sm md:text-base bg-yellow-400 text-black rounded-xl hover:bg-yellow-500 transition-all"
            >
              Sign Up
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex flex-col justify-center items-center text-center flex-grow px-6 pt-32 pb-16 bg-gradient-to-br from-yellow-50 via-white to-yellow-100 relative overflow-hidden">
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight"
        >
          Welcome to{" "}
          <span className="bg-gradient-to-r from-yellow-400 to-gray-600 bg-clip-text text-transparent">
            Maverick
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="mt-4 text-lg md:text-xl text-gray-600 max-w-2xl"
        >
          Empowering dreamers, doers, and innovators to achieve excellence. Join
          us and experience growth like never before.
        </motion.p>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => router.push("/auth/register")}
          className="mt-8 px-8 py-3 bg-yellow-400 text-white font-semibold rounded-full shadow-lg hover:bg-yellow-700 flex items-center gap-2 transition"
        >
          Get Started <FaArrowRight />
        </motion.button>

        {/* Subtle background circles */}
        <div className="absolute w-[500px] h-[500px] bg-yellow-100 rounded-full blur-3xl opacity-40 top-[-200px] left-[-100px]" />
        <div className="absolute w-[400px] h-[400px] bg-gray-100 rounded-full blur-3xl opacity-40 bottom-[-100px] right-[-100px]" />
      </section>

      {/* Features Section */}
      <section className="px-6 md:px-12 py-20 bg-white relative">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-14">
          Why Choose <span className="text-yellow-400">Maverick</span>?
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-6xl mx-auto">
          {[
            {
              icon: <FaUsers />,
              title: "Vibrant Community",
              desc: "Connect, collaborate, and grow with visionaries from around the globe.",
            },
            {
              icon: <FaMoneyBillWave />,
              title: "Smart Earnings",
              desc: "Unlock diverse income opportunities and elevate your financial game.",
            },
            {
              icon: <FaChartLine />,
              title: "Limitless Growth",
              desc: "Expand your personal and professional horizons with Maverick’s ecosystem.",
            },
          ].map((feature, idx) => (
            <motion.div
              key={idx}
              whileHover={{ y: -8 }}
              className="bg-gradient-to-b from-gray-50 to-white p-8 rounded-2xl shadow-md hover:shadow-xl border-t-4 border-yellow-500 transition"
            >
              <div className="text-yellow-400 text-5xl mb-4 flex justify-center">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-600">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Call-to-Action */}
      <section className="bg-gradient-to-l from-yellow-300 to-gray-800 text-white py-20 text-center px-6">
        <h2 className="text-3xl md:text-4xl font-bold mb-6">
          Take the Leap with Maverick
        </h2>
        <p className="max-w-2xl mx-auto text-lg text-yellow-100 mb-8">
          Join a movement built on innovation, integrity, and inspiration. Let’s
          redefine success—together.
        </p>
        <button
          onClick={() => router.push("/auth/signup")}
          className="bg-white text-black px-8 py-3 font-semibold rounded-full hover:bg-gray-100 transition transform hover:scale-105"
        >
          Join Now
        </button>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-10 px-6 md:px-16">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10">
          <div>
            <h3 className="text-xl font-bold text-white mb-3">Maverick</h3>
            <p className="text-gray-400 text-sm">
              Pioneering a new era of opportunity, community, and growth.
            </p>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-white mb-3">
              Quick Links
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="hover:text-yellow-400 transition">
                  About Us
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-yellow-400 transition">
                  Contact
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-yellow-400 transition">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-yellow-400 transition">
                  Terms & Conditions
                </a>
              </li>
            </ul>
          </div>

          <div className="flex flex-col items-start md:items-end">
            <h4 className="text-lg font-semibold text-white mb-3">Follow Us</h4>
            <div className="flex space-x-4 text-lg">
              <a
                href="#"
                className="hover:text-yellow-400 transition"
                aria-label="Facebook"
              >
                <FaFacebookF />
              </a>
              <a
                href="#"
                className="hover:text-pink-500 transition"
                aria-label="Instagram"
              >
                <FaInstagram />
              </a>
              <a
                href="#"
                className="hover:text-yellow-400 transition"
                aria-label="Twitter"
              >
                <FaTwitter />
              </a>
              <a
                href="#"
                className="hover:text-yellow-400 transition"
                aria-label="LinkedIn"
              >
                <FaLinkedinIn />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-10 pt-6 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} Maverick. All Rights Reserved.
        </div>
      </footer>
    </div>
  );
};

export default MaverickHome;

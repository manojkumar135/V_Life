"use client";

import { useState } from "react";
import { FiMail } from "react-icons/fi";
import { TfiLock } from "react-icons/tfi";
import Image from "next/image";
import Images from "@/constant/Image";
import { useRouter } from "next/navigation"; // ✅ import router

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter(); // ✅ initialize router

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    console.log({ email, password });

    // TODO: Add your real login logic here
    // After successful login:
    router.push("/dashboard"); // ✅ navigate to dashboard
  };

  const handleForgotPassword = () => {
    router.push("/forgot-password");
  };

  const handleNavigateToSignup = () => {
    router.push("/auth/register");
  };

  return (
    <div className="flex flex-row max-md:flex-col h-screen overflow-hidden bg-[#FFFDD0]">
      {/* Left Illustration Section */}
      <div className="w-1/2 max-md:w-full flex items-center justify-center p-10 max-lg:p-5 max-md:hidden ">
        <Image
          src={Images.LoginImage}
          alt="Login Illustration"
          width={500}
          height={500}
          className="w-4/5 max-md:w-full max-lg:w-full max-md:ml-1 max-lg:ml-16"
        />
      </div>

      {/* Right Login Form */}
      <div className="w-1/2 max-lg:w-full flex flex-col justify-center items-center overflow-y-auto max-lg:py-6 max-md:h-full">
        <div className="w-[70%] max-md:w-[90%] flex flex-col justify-center items-center py-10 px-8 bg-[#fffff0] rounded-3xl shadow max-lg:py-8">
          <p className="text-[2rem] max-md:text-[1.5rem] max-lg:text-[1.5rem] font-bold text-black mb-8 max-lg:mb-5">
            Login
          </p>

          <form onSubmit={handleLogin} className="w-full space-y-6">
            {/* Email */}
            <div className="relative">
              <FiMail className="absolute left-3 top-3.5 text-gray-500" />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-md border border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
                // required
              />
            </div>

            {/* Password */}
            <div className="relative">
              <TfiLock className="absolute left-3 top-3.5 text-gray-500" />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-md border border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
                // required
              />
            </div>

            {/* Forgot password */}
            <div className="text-right text-sm">
              <span
                onClick={handleForgotPassword}
                className="text-blue-600 cursor-pointer"
              >
                Forgot password?
              </span>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              className="w-full py-2 bg-[#FFD700] text-black font-semibold rounded-md hover:bg-yellow-400 transition-colors text-[1.2rem] max-lg:text-[1rem]"
            >
              Login
            </button>

            {/* Signup prompt */}
            <div className="text-center text-sm text-black -mt-3">
              Don&apos;t have an account?{" "}
              <span
                onClick={handleNavigateToSignup}
                className="text-blue-600 font-medium cursor-pointer"
              >
                Sign Up!
              </span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

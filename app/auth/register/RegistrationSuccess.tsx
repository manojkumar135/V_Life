"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { IoIosArrowBack } from "react-icons/io";

export default function RegistrationSuccess() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const username = searchParams.get("username") || "";
  const email = searchParams.get("email") || "";
  const userId = searchParams.get("userId") || "";

  return (
    <div className="min-h-screen flex justify-center items-center bg-[#f8f4ff] p-2 ">
      <div
        className="absolute top-4 left-4  flex items-center gap-2 cursor-pointer z-30"
        onClick={() => router.push("/")}
      >
        <IoIosArrowBack size={28} className="text-black" />
        <p className="font-medium text-black">Back</p>
      </div>
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-lg p-4 text-center mx-3">
        {/* Tick Icon */}
        <div className="flex justify-center mb-2 relative">
          <div className="w-18 h-18 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 flex items-center justify-center shadow-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={3}
              stroke="white"
              className="w-9 h-9"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 12.75L9 17.25L19.5 6.75"
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-lg font-bold text-gray-900 leading-tight">
          🎉 Welcome to Maverick, {username}!
        </h1>
        <p className="mt-1 text-gray-600 text-[13px] leading-snug">
          Just one more step to unlock your exclusive access.
        </p>

        {/* User ID Box */}
        <div className="mt-2 rounded-xl p-1">
          <p className="text-gray-700 text-[13px]">
            Your User ID:{" "}
            <span className="text-md font-semibold text-gray-900">
              {userId}
            </span>
          </p>
        </div>

        {/* Activate Box */}
        <div className="mt-3 bg-pink-50 border border-pink-100 rounded-xl p-3">
          <p className="font-semibold text-gray-800 text-[14px]">
            📧 Activate Your Account
          </p>

          <p className="mt-1 text-gray-700 text-[13px]">
            We've sent an activation email to
          </p>

          <p className="text-pink-600 font-semibold text-[13px]">{email}</p>
        </div>

        {/* What To Do Next */}
        <div className="mt-3 bg-blue-50 border border-blue-100 rounded-xl p-3 text-left">
          <p className="font-semibold text-blue-800 text-[14px]">
            ⏱ What to do next:
          </p>

          <ol className="mt-1 text-gray-700 text-[13px] space-y-1 list-decimal ml-5">
            <li>Check your email inbox (including spam/junk folder).</li>
            <li>Click the activation link to verify your email.</li>
            <li>Login using User ID & mobile number.</li>
          </ol>
        </div>

        {/* Important Instructions */}
        <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-left">
          <p className="font-semibold text-yellow-800 text-[14px]">
            ⚠ Important:
          </p>

          <ul className="mt-1 text-gray-700 text-[12.5px] space-y-1 list-disc ml-5">
            <li>Do not share your User ID or password with anyone.</li>
            <li>Update your password immediately after first login.</li>
          </ul>
        </div>

        {/* Login Button */}
        <button
          onClick={() => router.push("/auth/login")}
          className="mt-4 w-full bg-yellow-400 text-gray-900 py-2.5 rounded-xl shadow-md hover:bg-yellow-300 transition-all text-[14px] font-semibold cursor-pointer"
        >
          Go to Login
        </button>
      </div>
    </div>
  );
}

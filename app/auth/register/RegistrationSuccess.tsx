"use client";

import React from "react";
import { useRouter } from "next/navigation";

interface Props {
  username: string;
  userId: string;
}

export default function RegistrationSuccess({ username, userId }: Props) {
  const router = useRouter();

  return (
    <div className="min-h-screen flex justify-center items-center bg-gradient-to-br from-pink-100 via-purple-100 to-orange-100 p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-lg p-6 text-center">
        
        {/* Circle with Tick */}
        <div className="flex justify-center mb-5">
          <div className="w-28 h-28 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-md">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={3}
              stroke="white"
              className="w-14 h-14"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 12.75L9 17.25L19.5 6.75"
              />
            </svg>
          </div>
        </div>

        {/* Welcome Message */}
        <h1 className="text-2xl font-semibold text-gray-800">
          🎉 Welcome, {username}!
        </h1>

        <p className="mt-2 text-gray-600">Your registration was successful.</p>

        {/* User ID */}
        <p className="mt-1 text-sm text-gray-700 font-medium">
          Your User ID: <span className="text-purple-600">{userId}</span>
        </p>

        {/* Description */}
        <p className="mt-4 text-gray-500 text-sm">
          You can now log in and access your dashboard.
        </p>

        {/* Login Button */}
        <button
          onClick={() => router.push("/login")}
          className="mt-6 w-full bg-gradient-to-r from-purple-600 to-pink-500 text-white py-3 rounded-xl shadow-md hover:opacity-90 transition-all"
        >
          Go to Login
        </button>
      </div>
    </div>
  );
}

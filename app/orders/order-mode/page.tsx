"use client";

import React, { useState } from "react";
import Layout from "@/layout/Layout";
import { useRouter } from "next/navigation";
import { IoIosArrowBack } from "react-icons/io";

export default function OrderModePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleUseAdvance = () => {
    router.push("/orders/addorder?flow=USE_ADVANCE");
  };

  const handleReOrder = () => {
    router.push("/orders/addorder?flow=NORMAL");
  };

  return (
    <Layout>
      <div className="relative px-3">

        {/* Back */}
        <div
          className="absolute -top-5 left-8 max-md:top-3 max-md:left-4
          flex items-center gap-2 cursor-pointer z-30"
          onClick={() => router.back()}
        >
          <IoIosArrowBack size={28} className="text-black" />
          <p className="font-semibold text-black hidden lg:block">Back</p>
        </div>

        {/* CARD */}
        <div className="max-w-2xl mx-auto p-6 max-md:p-4 mt-10 bg-white shadow-lg rounded-xl border border-gray-300">
          <h1 className="text-2xl font-bold text-gray-800 mb-3 text-center">
            Place Your Order
          </h1>

          <p className="text-gray-600 text-sm mb-4 text-center">
            You have an unused advance payment.
            Choose how you want to proceed.
          </p>

          <div className="flex flex-col gap-4 lg:flex-row">

            {/* Use Advance */}
            <button
              onClick={handleUseAdvance}
              className="flex-1 bg-gradient-to-r 
              from-[#0E8A3A] via-[#16A34A] to-[#22C55E]
              text-white font-semibold py-3 rounded-lg cursor-pointer"
            >
              Use Advance ₹15,000
            </button>

            {/* Re-Order */}
            <button
              onClick={handleReOrder}
              className="flex-1 bg-gradient-to-r 
              from-[#0C3978] via-[#106187] to-[#16B8E4]
              text-white font-semibold py-3 rounded-lg cursor-pointer"
            >
              Re-Order (Normal)
            </button>

            {/* Cancel */}
            <button
              onClick={() => router.push("/orders")}
              className="flex-1 bg-gray-200 hover:bg-gray-300
              text-gray-700 font-medium py-3 rounded-lg cursor-pointer"
            >
              Cancel
            </button>

          </div>
        </div>
      </div>
    </Layout>
  );
}

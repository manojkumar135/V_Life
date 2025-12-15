"use client";
import React from "react";
import Layout from "@/layout/Layout";
import { useRouter } from "next/navigation";
import ShowToast from "@/components/common/Toast/toast";
import { IoIosArrowBack } from "react-icons/io";

import CryptoJS from "crypto-js";

const SECRET_KEY = process.env.NEXT_PUBLIC_REF_KEY || "";

export default function ActivateAccountPage() {
  const router = useRouter();

  const handleOrder = (amount: any) => {
    if (![50, 100].includes(amount)) {
      ShowToast.error("Invalid order PV");
      return;
    }

    const payload = { amount };
    const encrypted = CryptoJS.AES.encrypt(
      JSON.stringify(payload),
      SECRET_KEY
    ).toString();

    router.push(`/orders/addorder?data=${encodeURIComponent(encrypted)}`);
  };

  const onCancel = () => {
    router.push("/historys");
  };

  return (
    <Layout>
      <div className="relative">
        {/* 🔙 Back Button */}
        <div
          className="
        absolute
        -top-5 left-8 max-md:top-3 max-md:left-4
        flex items-center gap-2
        cursor-pointer z-30 
      "
          onClick={() => router.back()}
          title="Go Back"
        >
          <IoIosArrowBack
            size={28}
            className="
          text-black
        "
          />
          <p className="font-semibold text-black hidden lg:block">Back</p>
        </div>

        {/* Main Card */}
        <div className="max-w-2xl mx-auto p-6 max-md:p-4 max-lg:mx-4 mt-10 bg-white shadow-lg rounded-xl border-1 border-gray-300">
          <h1 className="text-2xl font-bold text-gray-800 mb-3 text-center">
            Activate Your Account
          </h1>

          <p className="text-gray-600 text-sm mb-2 text-center">
            Your account is currently inactive.
          </p>

          <p className="text-gray-600 text-sm mb-4 px-4 max-lg:px-1">
            To activate your account, please place an order by choosing one of
            the available activation packages below. Once the order is
            successfully placed, your account will be activated automatically
            and you will gain full access to all features.
          </p>

          {/* Buttons */}
          <div className="flex flex-col gap-4 lg:flex-row">
            <button
              onClick={() => handleOrder(50)}
              className="flex-1 bg-gradient-to-r from-[rgb(12,57,120)] via-[#106187] to-[#16B8E4]
            text-white font-semibold py-3 rounded-lg cursor-pointer"
            >
              Order 50 PV
            </button>

            <button
              onClick={() => handleOrder(100)}
              className="flex-1 bg-gradient-to-r from-[#0C3978] via-[#106187] to-[#16B8E4]
            text-white font-semibold py-3 rounded-lg cursor-pointer"
            >
              Order 100 PV
            </button>

            <button
              onClick={onCancel}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700
            font-medium py-3 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}

"use client";

import React from "react";
import { IoArrowBackOutline } from "react-icons/io5";
import Layout from "@/layout/Layout";
import { useRouter } from "next/navigation";

export default function MakeNewWithdrawalForm() {
  const router = useRouter();

  return (
    <Layout>
      <div className="p-4">
  {/* Header */}
  <div className="flex items-center mb-6">
    <IoArrowBackOutline
      size={25}
      className="mr-3 cursor-pointer"
      onClick={() => router.push("/wallet/withdraw")}
    />
    <h2 className="text-xl max-md:text-[1rem] font-semibold">Make New Withdrawal</h2>
  </div>

  {/* Form Card */}
  <div className="rounded-xl p-6 bg-white">
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {/* Wallet ID */}
      <div className="flex flex-col">
        <label className="text-[0.9rem] max-md:text-[0.8rem] font-semibold text-gray-700 mb-1">Wallet ID</label>
        <input
          type="text"
          value="WA000003"
          // readOnly
          className="border border-gray-400 rounded px-3 py-2 text-[1rem]"
        />
      </div>

      {/* Available Balance */}
      <div className="flex flex-col">
        <label className="text-[0.9rem] max-md:text-[0.8rem] font-semibold text-gray-700 mb-1">Available Balance</label>
        <div className="flex">
          <span className="px-3 py-2 border border-gray-400 rounded-l">₹</span>
          <input
            type="text"
            value="1000.00"
            // readOnly
            className="border-t border-b border-r border-gray-400 rounded-r px-3 py-2 text-[1rem] w-full"
          />
        </div>
      </div>

      {/* Withdraw Amount */}
      <div className="flex flex-col">
        <label className="text-[0.9rem] max-md:text-[0.8rem] font-semibold text-gray-700 mb-1">Withdraw Amount</label>
        <div className="flex">
          <span className="px-3 py-2 border border-gray-400 rounded-l">₹</span>
          <input
            type="text"
            value="200.00"
            className="border-t border-b border-r border-gray-400 rounded-r px-3 py-2 text-[1rem] w-full"
          />
        </div>
      </div>

      {/* Enter OTP */}
      <div className="flex flex-col ">
        <label className="text-[0.9rem] max-md:text-[0.8rem] font-semibold text-gray-700 mb-1">Enter OTP</label>
        <div className="flex border border-gray-400 rounded px-3 py-2 justify-between bg-white">
          <input
            type="text"
            placeholder="X X X X X X"
            className="w-[70%] text-[1rem] outline-none"
          />
          <button className="text-green-600 font-medium ml-2">Verify</button>
        </div>
      </div>
    </div>

    {/* Summary & Button */}
    <div className="flex flex-col justify-end items-end mt-6">
      <p className="text-sm mr-2 font-medium">
        Make New Withdrawal: <span className="font-bold text-black">₹ 200.00</span>
      </p>
      <button className="mt-2 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-2 px-6 rounded">
        Withdraw
      </button>
    </div>

    {/* Note */}
    <p className="text-xs text-gray-600 mt-4">
      <span className="font-semibold">Note:</span> Minimum ₹ 500.00 can be withdrawn
    </p>
  </div>
</div>

    </Layout>
  );
}

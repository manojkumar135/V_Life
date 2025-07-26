"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { IoArrowBackOutline } from "react-icons/io5";
import Layout from "@/layout/Layout";

export default function AddWalletForm() {
  const router = useRouter();

  return (
    <Layout>
      <div className="p-4">
        <div className="flex flex-row">
 <IoArrowBackOutline
          size={25}
          color="black"
          className="ml-0 mr-3 mt-1 max-sm:!mt-0 max-sm:mr-1 cursor-pointer z-20 mb-3"
          onClick={() => router.push("/wallet/wallets")}
        />
        <h2 className="text-xl font-semibold mb-4">Add New Wallet</h2>
        </div>
       
        <div className="rounded-xl p-6 ">
          <div className="grid grid-cols-1 sm:grid-cols-1 gap-y-4 gap-x-6">
            <label className="flex items-center">
              <span className="w-48 text-sm font-medium">
                Account Holder Name :
              </span>
              <input
                type="text"
                placeholder="User Name"
                className=" border border-gray-500 rounded px-3 py-1 text-[1rem] w-[30%]"
              />
            </label>

            <label className="flex items-center">
              <span className="w-48 text-sm font-medium">Bank Name :</span>
              <input
                type="text"
                placeholder="State Bank ……"
                className=" border border-gray-500 rounded px-3 py-1 text-[1rem] w-[30%]"
              />
            </label>

            <label className="flex items-center">
              <span className="w-48 text-sm font-medium">Account Number :</span>
              <input
                type="text"
                placeholder="1234XXXXXX"
                className=" border border-gray-500 rounded px-3 py-1 text-[1rem] w-[30%]"
              />
            </label>

            <label className="flex items-center">
              <span className="w-48 text-sm font-medium">
                Confirm Account Number :
              </span>
              <input
                type="password"
                placeholder="........................"
                className=" border border-gray-500 rounded px-3 py-1 text-[1rem] w-[30%]"
              />
            </label>

            <label className="flex items-center">
              <span className="w-48 text-sm font-medium">IFSC Code :</span>
              <input
                type="text"
                placeholder="SBH0000123"
                className=" border border-gray-500 rounded px-3 py-1 text-[1rem] w-[30%]"
              />
            </label>

            <label className="flex items-center">
              <span className="w-48 text-sm font-medium">Enter OTP :</span>
              <div className=" flex justify-between items-center rounded px-3 py-1 text-[1rem] border border-gray-500 w-[30%]">
                <input
                  type="text"
                  placeholder="X X X X X X"
                  className="  rounded px-3 py-1 text-[1rem] w-[30%]"
                />
                <button className="text-green-600 font-medium ml-2">
                  Verify
                </button>
              </div>
            </label>
          </div>

          <div className="flex justify-end mt-6">
            <button className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-2 px-6 rounded">
              Submit
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}

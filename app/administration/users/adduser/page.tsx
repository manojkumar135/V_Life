"use client";

import React from "react";
import Layout from "@/layout/Layout";
import { IoArrowBackOutline } from "react-icons/io5";
import { useRouter } from "next/navigation";

export default function AddNewUserForm() {
  const router = useRouter();

  return (
    <Layout>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center mb-4">
          <IoArrowBackOutline
            size={25}
            className="mr-3 cursor-pointer"
            onClick={() => router.push("/administration/users")}
          />
          <h2 className="text-xl font-semibold">Add New User</h2>
        </div>

        {/* Form Card */}
        <div className="rounded-xl p-6 border border-gray-300 bg-gray-100 shadow-sm">
          <div className="space-y-4">
            {/* User ID */}
            <div className="flex items-center">
              <label className="w-48 text-sm font-medium">User ID :</label>
              <input
                type="text"
                defaultValue="US000003"
                className="border border-gray-400 rounded px-3 py-1 text-[1rem] w-[60%] bg-white"
              />
            </div>

            {/* Full Name */}
            <div className="flex items-center">
              <label className="w-48 text-sm font-medium">Full Name :</label>
              <input
                type="text"
                defaultValue="User Name"
                className="border border-gray-400 rounded px-3 py-1 text-[1rem] w-[60%] bg-white"
              />
            </div>

            {/* Email */}
            <div className="flex items-center">
              <label className="w-48 text-sm font-medium">Email :</label>
              <input
                type="email"
                defaultValue="123@gmail.com"
                className="border border-gray-400 rounded px-3 py-1 text-[1rem] w-[60%] bg-white"
              />
            </div>

            {/* Contact */}
            <div className="flex items-center">
              <label className="w-48 text-sm font-medium">Contact :</label>
              <input
                type="text"
                defaultValue="1234567890"
                className="border border-gray-400 rounded px-3 py-1 text-[1rem] w-[60%] bg-white"
              />
            </div>

            {/* Address */}
            <div className="flex items-center">
              <label className="w-48 text-sm font-medium">Address :</label>
              <input
                type="text"
                defaultValue="India"
                className="border border-gray-400 rounded px-3 py-1 text-[1rem] w-[60%] bg-white"
              />
            </div>

            {/* City */}
            <div className="flex items-center">
              <label className="w-48 text-sm font-medium">City :</label>
              <input
                type="text"
                defaultValue="none"
                className="border border-gray-400 rounded px-3 py-1 text-[1rem] w-[60%] bg-white"
              />
            </div>

            {/* State */}
            <div className="flex items-center">
              <label className="w-48 text-sm font-medium">State :</label>
              <input
                type="text"
                defaultValue="AN"
                className="border border-gray-400 rounded px-3 py-1 text-[1rem] w-[60%] bg-white"
              />
            </div>

            {/* Country */}
            <div className="flex items-center">
              <label className="w-48 text-sm font-medium">Country :</label>
              <input
                type="text"
                defaultValue="India"
                className="border border-gray-400 rounded px-3 py-1 text-[1rem] w-[60%] bg-white"
              />
            </div>

            {/* Pincode */}
            <div className="flex items-center">
              <label className="w-48 text-sm font-medium">Pincode :</label>
              <input
                type="text"
                defaultValue="123456"
                className="border border-gray-400 rounded px-3 py-1 text-[1rem] w-[60%] bg-white"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end mt-6">
            <button
              type="submit"
              className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-2 px-6 rounded"
            >
              Submit
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}

"use client";

import React from "react";
import Layout from "@/layout/Layout";
import { IoArrowBackOutline } from "react-icons/io5";
import { useRouter } from "next/navigation";

export default function AddRoleForm() {
  const router = useRouter();

  return (
    <Layout>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center mb-4">
          <IoArrowBackOutline
            size={25}
            className="mr-3 cursor-pointer"
            onClick={() => router.push("/administration/roles")}
          />
          <h2 className="text-xl font-semibold">Add New Role</h2>
        </div>

        {/* Form Card */}
        <div className="rounded-xl p-6 border border-gray-300 bg-gray-100 shadow-sm">
          <form className="space-y-5">
            {/* Role ID */}
            <div className="flex items-center">
              <label className="w-48 text-sm font-medium">Role ID :</label>
              <input
                type="text"
                defaultValue="RL000003"
                className="border border-gray-400 rounded px-3 py-1 w-[60%] bg-white"
                readOnly
              />
            </div>

            {/* Role Name */}
            <div className="flex items-center">
              <label className="w-48 text-sm font-medium">Role Name :</label>
              <input
                type="text"
                placeholder="Role Name"
                className="border border-gray-400 rounded px-3 py-1 w-[60%] bg-white"
              />
            </div>

            {/* Components */}
            <div className="flex items-start">
              <label className="w-48 text-sm font-medium mt-1">Components :</label>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm w-[60%]">
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="accent-yellow-400" />
                  <span>Administration</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="accent-yellow-400" />
                  <span>Wallet</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="accent-yellow-400" />
                  <span>Orders</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="accent-yellow-400" />
                  <span>History</span>
                </label>
              </div>
            </div>

            {/* Description */}
            <div className="flex items-start">
              <label className="w-48 text-sm font-medium mt-1">Description :</label>
              <textarea
                placeholder="Description"
                className="border border-gray-400 rounded px-3 py-2 w-[60%] h-24 bg-white resize-none"
              ></textarea>
            </div>

            {/* Submit */}
            <div className="flex justify-end">
              <button
                type="submit"
                className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-2 px-6 rounded"
              >
                Submit
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}

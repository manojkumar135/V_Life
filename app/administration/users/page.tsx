"use client";

import React from "react";
import Layout from "@/layout/Layout";
import { Users, UserCheck, TreePine } from "lucide-react"; // Lucide icons
import { FaUsers } from "react-icons/fa";
import { IoInfiniteSharp } from "react-icons/io5";

import { useRouter } from "next/navigation";
import { IoIosArrowBack } from "react-icons/io";
import { useVLife } from "@/store/context";

const Page = () => {
  const router = useRouter();
  const { user } = useVLife();

  return (
    <Layout>
      <div className="px-6 py-3">
        {user?.role === "superadmin" && (
          <IoIosArrowBack
            size={25}
            color="black"
            className="ml-0 mr-3 mt-1 max-sm:!mt-0 max-sm:mr-1 cursor-pointer z-20 mb-3"
            onClick={() => router.push("/administration")}
          />
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Tree View Card */}
          <div
            onClick={() => router.push(`/administration/users/tree`)}
            className="bg-gray-500 text-white rounded-md p-6 flex flex-col items-center justify-center hover:shadow-md transition cursor-pointer"
          >
            <TreePine size={32} />
            <span className="mt-2 text-lg font-semibold">Tree View</span>
          </div>

          {/* Left Team Card */}
          <div
            onClick={() => router.push("/administration/users/left")}
            className="bg-gray-500 text-white rounded-md p-6 flex flex-col items-center justify-center hover:shadow-md transition cursor-pointer"
          >
            <Users size={32} className="transform scale-x-[-1]" />
            <span className="mt-2 text-lg font-semibold">Left Team</span>
          </div>

          {/* Right Team Card */}
          <div
            onClick={() => router.push("/administration/users/right")}
            className="bg-gray-500 text-white rounded-md p-6 flex flex-col items-center justify-center hover:shadow-md transition cursor-pointer"
          >
            <Users size={32} />
            <span className="mt-2 text-lg font-semibold">Right Team</span>
          </div>

          
          {/* Direct Team Card */}
          <div
            onClick={() => router.push("/administration/users/direct")}
            className="bg-gray-500 text-white rounded-md p-6 flex flex-col items-center justify-center hover:shadow-md transition cursor-pointer"
          >
            <FaUsers size={32} />
            <span className="mt-2 text-lg font-semibold">Direct Team</span>
          </div>

          {/* Infinity Team Card */}
          <div
            onClick={() => router.push("/administration/users/infinity")}
            className="bg-gray-500 text-white rounded-md p-6 flex flex-col items-center justify-center hover:shadow-md transition cursor-pointer"
          >
            <IoInfiniteSharp size={32} />
            <span className="mt-2 text-lg font-semibold">Infinity Team</span>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Page;

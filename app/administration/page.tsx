"use client";

import React from "react";
import Layout from "@/layout/Layout";
import { useRouter } from "next/navigation";
import { Users, UserPlus, Network } from "lucide-react";

const page = () => {
  // console.log("User from context:", user);
  const router = useRouter();

  return (
    <Layout>
      <div className="px-5 py-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Groups Card */}
          <div
            onClick={() => router.push("/administration/groups")}
            className="bg-gray-500 text-white rounded-md p-6 flex flex-col items-center justify-center hover:shadow-md transition cursor-pointer"
          >
            <UserPlus size={32} />
            <span className="mt-2 text-lg font-semibold">Groups</span>
          </div>

          {/* Roles Card */}
          <div
            onClick={() => router.push("/administration/roles")}
            className="bg-gray-500 text-white rounded-md p-6 flex flex-col items-center justify-center hover:shadow-md transition cursor-pointer"
          >
            <Network size={32} />
            <span className="mt-2 text-lg font-semibold">Roles</span>
          </div>

          {/* Users Card */}
          <div
            onClick={() => router.push("/administration/users")}
            className="bg-gray-500 text-white rounded-md p-6 flex flex-col items-center justify-center hover:shadow-md transition cursor-pointer"
          >
            <Users size={32} />
            <span className="mt-2 text-lg font-semibold">Users</span>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default page;

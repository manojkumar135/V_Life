"use client";

import React from "react";
import Layout from "@/layout/Layout";
import { useRouter } from "next/navigation";
import { useVLife } from "@/store/context";
import { IoIosArrowBack } from "react-icons/io";
import { BsCalendarDay, BsCalendarRange } from "react-icons/bs";
import { RiMoneyRupeeCircleLine } from "react-icons/ri";
import { LuTicketsPlane } from "react-icons/lu";
import { GiDoubled } from "react-icons/gi";

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
            onClick={() => router.back()}
          />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Daily Report */}
          <div
            onClick={() => router.push("/reports/daily")}
            className="bg-gray-500 text-white rounded-md p-6 flex flex-col items-center justify-center hover:shadow-md transition cursor-pointer"
          >
            <BsCalendarDay size={32} />
            <span className="mt-2 text-lg font-semibold">Daily Report</span>
          </div>

          {/* Fortnight Report */}
          <div
            onClick={() => router.push("/reports/fortnight")}
            className="bg-gray-500 text-white rounded-md p-6 flex flex-col items-center justify-center hover:shadow-md transition cursor-pointer"
          >
            <BsCalendarRange size={32} />
            <span className="mt-2 text-lg font-semibold">Fortnight Report</span>
          </div>

          {/* Cashback Report */}
          <div
            onClick={() => router.push("/reports/cashback")}
            className="bg-gray-500 text-white rounded-md p-6 flex flex-col items-center justify-center hover:shadow-md transition cursor-pointer"
          >
            <RiMoneyRupeeCircleLine size={32} />
            <span className="mt-2 text-lg font-semibold">Cashback Report</span>
          </div>

          {/* Reward Report */}
          <div
            onClick={() => router.push("/reports/reward")}
            className="bg-gray-500 text-white rounded-md p-6 flex flex-col items-center justify-center hover:shadow-md transition cursor-pointer"
          >
            <LuTicketsPlane size={32} />
            <span className="mt-2 text-lg font-semibold">Reward Report</span>
          </div>

          {/* Matches Report */}
          {user?.role !== "user" && (
            <div
              onClick={() => router.push("/matches")}
              className="bg-gray-500 text-white rounded-md p-6 flex flex-col items-center justify-center hover:shadow-md transition cursor-pointer"
            >
              <GiDoubled size={32} />
              <span className="mt-2 text-lg font-semibold">Matches Report</span>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Page;

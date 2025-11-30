"use client";

import React from "react";
import Layout from "@/layout/Layout";
import { Wallet, Banknote, Shuffle } from "lucide-react";
import { useRouter } from "next/navigation";
import { FaGift } from "react-icons/fa6";
import { VscGraph } from "react-icons/vsc";
import { useVLife } from "@/store/context";

const page = () => {
  const router = useRouter();
  const { user } = useVLife();

  return (
    <Layout>
      <div className="px-6 py-3">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          {/* Wallets Card */}
          <div
            onClick={() => router.push("/wallet/wallets")}
            className="bg-gray-500 text-white rounded-md p-6 flex flex-col items-center justify-center hover:shadow-md transition cursor-pointer"
          >
            <Wallet size={32} />
            <span className="mt-2 text-lg font-semibold">
              {user.role === "admin" ? "Wallets" : "Wallet"}
            </span>
          </div>

          {/* Withdraw Card */}
          <div
            onClick={() => router.push("/wallet/payout")}
            className="bg-gray-500 text-white rounded-md p-6 flex flex-col items-center justify-center hover:shadow-md transition cursor-pointer"
          >
            <Banknote size={32} />
            <span className="mt-2 text-lg font-semibold">Payouts</span>
          </div>
          {/* Rewards Card */}
          <div
            onClick={() => router.push("/wallet/rewards")}
            className="bg-gray-500 text-white rounded-md p-6 flex flex-col items-center justify-center hover:shadow-md transition cursor-pointer"
          >
            <FaGift size={32} />
            <span className="mt-2 text-lg font-semibold">Rewards</span>
          </div>

          {/* Reports Card */}
          <div
            onClick={() => router.push("/reports")}
            className="bg-gray-500 text-white rounded-md p-6 flex flex-col items-center justify-center hover:shadow-md transition cursor-pointer"
          >
            <VscGraph size={32} />
            <span className="mt-2 text-lg font-semibold">Reports</span>
          </div>

          {/* Convert Card */}
          {/* <div className="bg-gray-500 text-white rounded-md p-6 flex flex-col items-center justify-center hover:shadow-md transition cursor-pointer">
            <Shuffle size={32} />
            <span className="mt-2 text-lg font-semibold">Convert</span>
          </div> */}
        </div>
      </div>
    </Layout>
  );
};

export default page;

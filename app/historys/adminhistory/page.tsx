"use client";

import React from "react";
import Layout from "@/layout/Layout";
// import { Wallet, Banknote, Shuffle } from "lucide-react";
import { useRouter } from "next/navigation";
import { BiTransferAlt } from "react-icons/bi";
import { LuHandCoins } from "react-icons/lu";
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
            onClick={() => router.push("/historys")}
            className="bg-gray-500 text-white rounded-md p-6 flex flex-col items-center justify-center hover:shadow-md transition cursor-pointer"
          >
            <BiTransferAlt size={36} />
            <span className="mt-2 text-lg font-semibold">
              Transactions
            </span>
          </div>

          {/* Withdraw Card */}
          <div
            onClick={() => router.push("/historys/advancehistory")}
            className="bg-gray-500 text-white rounded-md p-6 flex flex-col items-center justify-center hover:shadow-md transition cursor-pointer"
          >
            <LuHandCoins size={36} />
            <span className="mt-2 text-lg font-semibold">First Orders</span>
          </div>
         
        </div>
      </div>
    </Layout>
  );
};

export default page;

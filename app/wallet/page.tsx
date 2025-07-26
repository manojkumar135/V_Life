"use client";

import React from "react";
import Layout from "@/layout/Layout";
import { Wallet, Banknote, Shuffle } from "lucide-react";
import { useRouter } from "next/navigation";

const page = () => {
  const router = useRouter();

  return (
    <Layout>
      <div className="px-6 py-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Wallets Card */}
          <div
            onClick={() => router.push("/wallet/wallets")}
            className="bg-gray-500 text-white rounded-md p-6 flex flex-col items-center justify-center hover:shadow-md transition cursor-pointer"
          >
            <Wallet size={32} />
            <span className="mt-2 text-lg font-semibold">Wallets</span>
          </div>

          {/* Withdraw Card */}
          <div
            onClick={() => router.push("/wallet/withdraw")}
            className="bg-gray-500 text-white rounded-md p-6 flex flex-col items-center justify-center hover:shadow-md transition cursor-pointer"
          >
            <Banknote size={32} />
            <span className="mt-2 text-lg font-semibold">Withdraw</span>
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

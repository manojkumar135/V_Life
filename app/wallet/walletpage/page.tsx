// payout/index.tsx
"use client";

import React from "react";
import Layout from "@/layout/Layout";
import { useRouter } from "next/navigation";
import { IoIosArrowBack } from "react-icons/io";
import { FaGift } from "react-icons/fa6";
import { MdOutlineContactMail } from "react-icons/md";
import { IoIosMail } from "react-icons/io";




const WalletPage = () => {
  const router = useRouter();

  return (
    <Layout>
      <div className="px-6 py-3">
        <IoIosArrowBack
          size={25}
          color="black"
          className="ml-0 mr-3 mt-1 max-sm:mt-0! max-sm:mr-1 cursor-pointer z-20 mb-3"
          onClick={() => router.push("/wallet")}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          {/* Daily Payout Card */}
          <div
            onClick={() => router.push("/wallet/wallets")}
            className="bg-gray-500 text-white rounded-md p-6 flex flex-col items-center justify-center hover:shadow-md transition cursor-pointer"
          >
            <MdOutlineContactMail size={32} />
            <span className="mt-2 text-lg font-semibold">KYC</span>
          </div>

          {/* Weekly Payout Card */}
          <div
            onClick={() => router.push("/wallet/change-requests")}
            className="bg-gray-500 text-white rounded-md p-6 flex flex-col items-center justify-center hover:shadow-md transition cursor-pointer"
          >
            <IoIosMail size={32} />
            <span className="mt-2 text-lg font-semibold">KYC Requests</span>
          </div>
          {/* Rewards Card */}
          {/* <div
            onClick={() => router.push("/wallet/payout/rewards")}
            className="bg-gray-500 text-white rounded-md p-6 flex flex-col items-center justify-center hover:shadow-md transition cursor-pointer"
          >
            <FaGift size={32} />
            <span className="mt-2 text-lg font-semibold">Rewards</span>
          </div> */}
        </div>
        
      </div>
    </Layout>
  );
};

export default WalletPage;

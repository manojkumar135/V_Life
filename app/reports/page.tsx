"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { RiMoneyRupeeCircleLine } from "react-icons/ri";
import { FaWallet } from "react-icons/fa";
import { FaPercent } from "react-icons/fa";
import Layout from "@/layout/Layout";
import { useVLife } from "@/store/context";
import { IoIosArrowBack } from "react-icons/io";
import { useRouter } from "next/navigation";

/* ---------------------- TYPES ---------------------- */

type RewardSummary = {
  daily: number;
  fortnight: number;
  cashback: number;
};

/* ---------------------- PAGE ---------------------- */

export default function ReportsPage() {
  const { user } = useVLife();
  const user_id = user?.user_id;
  const router = useRouter();

  const [rewardSummary, setRewardSummary] = useState<RewardSummary>({
    daily: 0,
    fortnight: 0,
    cashback: 0,
  });

  /* ---------------- FETCH REWARD POINTS ---------------- */

  useEffect(() => {
    const fetchRewardPoints = async () => {
      if (!user_id) return;

      try {
        const res = await axios.get(
          `/api/dashboard-operations/reward-points?user_id=${user_id}`
        );

        if (res.data.success) {
          setRewardSummary(res.data.data);
        }
      } catch (err) {
        console.error("Error fetching reward points:", err);
      }
    };

    fetchRewardPoints();
  }, [user_id]);

  /* ---------------------- UI ---------------------- */

  return (
    <Layout>
      <div className="w-full p-4">
        {/* Header */}
        <div className="flex items-center mb-6 max-md:mb-2">
          <IoIosArrowBack
            size={25}
            className="mr-2 cursor-pointer"
            onClick={() => router.push("/wallet")}
          />
          <p className="text-xl max-md:text-[1rem] font-semibold">
            Reports
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 -mt-3 mb-5">
          <Card
            icon={
              <RiMoneyRupeeCircleLine className="text-green-600" size={35} />
            }
            label="Daily Rewards"
            amount={`₹ ${rewardSummary.daily.toFixed(2)}`}
            className="bg-green-50 border-green-200"
          />

          <Card
            icon={<FaWallet className="text-pink-600" size={30} />}
            label="Fortnight Rewards"
            amount={`₹ ${rewardSummary.fortnight.toFixed(2)}`}
            className="bg-pink-50 border-pink-200"
          />

          <Card
            icon={<FaPercent className="text-yellow-600" size={30} />}
            label="Cashback Points"
            amount={`₹ ${rewardSummary.cashback.toFixed(2)}`}
            className="bg-yellow-50 border-yellow-200"
          />
        </div>

        {/* Table / More Details Later */}
        <div className="mt-6">
          {/* future expansion */}
        </div>
      </div>
    </Layout>
  );
}

/* ---------------------- CARD COMPONENT ---------------------- */

const Card = ({
  icon,
  label,
  amount,
  className = "",
}: {
  icon: React.ReactNode;
  label: string;
  amount: string;
  className?: string;
}) => (
  <div
    className={`flex items-center justify-between shadow rounded-lg p-4 border ${className}`}
  >
    <div className="flex items-center gap-4">
      <div className="bg-transparent p-2 rounded-full">
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-xl font-semibold">{amount}</p>
      </div>
    </div>
  </div>
);

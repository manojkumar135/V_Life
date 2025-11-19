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

type AmountSummary = {
  income: number;
  purchases: number;
  tax: number;
};

export default function ReportsPage() {
  const { user } = useVLife();
  const user_id = user?.user_id;

  const [amountSummary, setAmountSummary] = useState<AmountSummary>({
    income: 0,
    purchases: 0,
    tax: 0,
  });

  // Fetch Summary Data (Correct Logic)
  useEffect(() => {
    const fetchAmountSummary = async () => {
      if (!user_id) return;
      try {
        const res = await axios.get(
          `/api/dashboard-operations/amount-count?user_id=${user_id}&role=${user.role}`
        );
        if (res.data.success) {
          setAmountSummary(res.data.data);
        }
      } catch (err) {
        console.error("Error fetching amount summary:", err);
      }
    };
    fetchAmountSummary();
  }, [user_id, user?.role]);

  const router = useRouter();

  return (
    <Layout>
      <div className="w-full p-4">
        <div className="flex items-center mb-6 max-md:mb-2">
          <IoIosArrowBack
            size={25}
            className="mr-2 cursor-pointer"
            onClick={() => router.push("/wallet")}
          />
          <p className="text-xl max-md:text-[1rem] font-semibold">Reports</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 -mt-3 mb-5">
          <Card
            icon={
              <RiMoneyRupeeCircleLine className="text-green-600" size={35} />
            }
            label="Income"
            amount={`₹ ${amountSummary.income.toFixed(2)}`}
            className="bg-green-50 border-green-200"
          />

          <Card
            icon={<FaWallet className="text-pink-600" size={30} />}
            label="Expense"
            amount={`₹ ${amountSummary.purchases.toFixed(2)}`}
            className="bg-pink-50 border-pink-200"
          />

          <Card
            icon={<FaPercent className="text-yellow-600" size={30} />}
            label="Tax Deducted"
            amount={`₹ ${amountSummary.tax.toFixed(2)}`}
            className="bg-yellow-50 border-yellow-200"
          />
        </div>

        {/* Table Coming Later */}
        <div className="mt-6">
          {/* <p className="text-gray-600">More report details coming here...</p> */}
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
      <div className="bg-transparent p-2 rounded-full">{icon}</div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-xl font-semibold">{amount}</p>
      </div>
    </div>
  </div>
);

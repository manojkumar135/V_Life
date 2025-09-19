"use client";

import React from "react";
import Layout from "@/layout/Layout";
import { FaWallet } from "react-icons/fa";
import { RiMoneyRupeeCircleLine } from "react-icons/ri";
import { MdOutlineAttachMoney } from "react-icons/md";
import { IoClose } from "react-icons/io5";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useVLife } from "@/store/context";
import AlertBox from "@/components/Alerts/advanceAlert";
import { hasAdvancePaid } from "@/utils/hasAdvancePaid";

const page = () => {
  const { user } = useVLife();
  const user_id = user?.user_id || "";
  const router = useRouter();

  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    const checkAdvancePayment = async () => {
      try {
        const paid = await hasAdvancePaid(user_id, 10000);

        if (!paid) {
          setShowAlert(true);
        }
      } catch (err) {
        console.error("Error checking payment history:", err);
        setShowAlert(true); // fallback → show alert
      }
    };

    if (user_id) {
      checkAdvancePayment();
    }
  }, [user_id]);

  return (
    <Layout>
      <div className=" space-y-6 bg-white px-6 scrollbar-hide">
        {/* 🔔 Right Side Alert */}
        <AlertBox
          visible={showAlert}
          title="Action Required!"
          message={
            <>
              To activate your account, please pay{" "}
              <span className="font-semibold text-lg">₹10,000</span> as prepaid.
              This will be adjusted in your first order.
            </>
          }
          buttonLabel="Pay Now"
          buttonAction={() => router.push("/historys/payAdvance")}
          onClose={() => setShowAlert(false)}
        />

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card
            icon={<FaWallet className="text-pink-600" size={30} />}
            label="Wallet"
            amount="₹ 220.00"
          />
          <Card
            icon={
              <RiMoneyRupeeCircleLine className="text-purple-600" size={30} />
            }
            label="Total Income"
            amount="₹ 7209.00"
          />
          <Card
            icon={<MdOutlineAttachMoney className="text-green-600" size={30} />}
            label="Withdrawal"
            amount="₹ 800.00"
          />
        </div>

        {/* Rank Info + Direct Business */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Rank Info */}
          <div className="bg-gray-800 text-white p-5 rounded-xl space-y-4">
            <p className="text-lg font-bold">Rank Information</p>
            <div className="flex justify-between">
              <span>Current Rank</span>
              <span>₹ 000.00</span>
            </div>
            <div className="flex justify-between">
              <span>Next Rank</span>
              <span>₹ 000.00</span>
            </div>

            <div className="flex justify-between items-center gap-4 mt-4">
              <div className="flex-1 text-center">
                <p>Power Team</p>
                <div className="text-xs text-gray-300 mb-1">70%</div>
                <div className="bg-white text-black text-sm font-semibold rounded-full py-1">
                  6950 Archived
                </div>
                <p className="text-xs mt-1">BV : 6950</p>
              </div>
              <div className="flex-1 text-center">
                <p>Paying Team</p>
                <div className="text-xs text-gray-300 mb-1">70%</div>
                <div className="bg-white text-black text-sm font-semibold rounded-full py-1">
                  980 Remain
                </div>
                <p className="text-xs mt-1">BV : 0</p>
              </div>
            </div>
          </div>

          {/* Direct Business */}
          <div className="bg-white border rounded-xl p-5 shadow space-y-4">
            <div className="flex justify-between items-center">
              <p className="font-semibold">Direct Business - Self Business</p>
              <span className="text-xs bg-gray-200 text-gray-800 px-2 py-1 rounded">
                INACTIVE
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-center">
                <p className="font-bold">BV0.00</p>
                <p>Direct Business</p>
              </div>
              <div className="text-center">
                <p className="font-bold">BV</p>
                <p>Self Business</p>
              </div>
            </div>

            <div className="text-xs text-gray-500">
              <p>Balance BV 0.00 / BV 0.00 Remaining</p>
              <p>Balance BV 0.00</p>
              <p>Activated Date: 17 Jun 2025 21:05:19</p>
              <div className="w-full h-1 bg-gray-300 rounded mt-1">
                <div className="h-full bg-green-500 w-full rounded" />
              </div>
              <p className="text-right text-[0.7rem] mt-1">100.00% Remaining</p>
            </div>

            <div>
              <p className="font-semibold mb-2">Team Business</p>
              <div className="flex justify-between text-sm">
                <div>
                  <p className="text-purple-600 font-semibold">Left Business</p>
                  <p>BV 0.00</p>
                  <p>
                    Today BV <span className="text-green-500">0.00</span>
                  </p>
                </div>
                <div>
                  <p className="text-green-600 font-semibold">Right Business</p>
                  <p>BV 6,950.00</p>
                  <p>
                    Today BV <span className="text-green-500">0.00</span>
                  </p>
                </div>
              </div>

              <div className="flex justify-between text-xs mt-2">
                <p>
                  Left Team : <span className="text-red-500">0</span>
                </p>
                <p>
                  Right Team : <span className="text-green-500">395</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Referral Table */}
        {/* <div className="bg-white p-4 rounded-xl shadow-md border">
          <table className="w-full text-sm text-left">
            <thead className="text-gray-600 font-semibold border-b">
              <tr>
                <th className="p-2">#ID</th>
                <th className="p-2">Name</th>
                <th className="p-2">Referral ID</th>
                <th className="p-2">Joined On</th>
                <th className="p-2">Contact</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4].map((id) => (
                <tr key={id} className="border-b hover:bg-gray-50">
                  <td className="p-2">{id}</td>
                  <td className="p-2">Aarav Sharma</td>
                  <td className="p-2">1234567890</td>
                  <td className="p-2">18-06-2025</td>
                  <td className="p-2">1234567890</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div> */}
      </div>
    </Layout>
  );
};

export default page;

// Summary card component
const Card = ({
  icon,
  label,
  amount,
}: {
  icon: React.ReactNode;
  label: string;
  amount: string;
}) => (
  <div className="flex items-center justify-between bg-white shadow rounded-lg p-4 border border-gray-200">
    <div className="flex items-center gap-4">
      <div className="bg-gray-100 p-2 rounded-full">{icon}</div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-xl font-semibold">{amount}</p>
      </div>
    </div>
  </div>
);

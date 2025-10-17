"use client";

import React from "react";
import Layout from "@/layout/Layout";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useVLife } from "@/store/context";
import AlertBox from "@/components/Alerts/advanceAlert";
import { hasAdvancePaid } from "@/utils/hasAdvancePaid";

import {
  FaLink,
  FaRupeeSign,
  FaUser,
  FaShoppingBag,
  FaWallet,
} from "react-icons/fa";
import { MdOutlineCheckCircle } from "react-icons/md";

const DashboardPage: React.FC = () => {
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
      <div className="min-h-screen px-4 py-6 text-black mb-10">
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* --- LEFT COLUMN --- */}
          <div className="space-y-6">
            {/* Profile Card */}
            <div className="bg-white rounded-2xl shadow-md p-6 border-[1.5px] border-gray-300">
              <div className="flex flex-col md:flex-row justify-center  lg:flex-col items-center text-center">
                <div className="w-24 h-24 md:w-28 md:h-28 border-2 border-gray-600 rounded-full flex items-center justify-center bg-white shadow-lg md:mr-8 lg:mr-0">
                  <img
                    src={
                      user.profile ||
                      "https://res.cloudinary.com/dtb4vozhy/image/upload/v1760695970/gray-user-profile-icon-png-fP8Q1P_ggaoim.png"
                    }
                    alt="Profile"
                    className="w-full h-full object-cover rounded-full border-1 border-gray-300 shadow-md"
                  />
                </div>
                <div className="mt-4 space-y-1 text-sm">
                  <p>
                    <span className="font-semibold">USER ID:</span>{" "}
                    {user?.user_id || "N/A"}
                  </p>
                  <p>
                    <span className="font-semibold">Name:</span>{" "}
                    {user?.user_name || "N/A"}
                  </p>
                  <p>
                    <span className="font-semibold">Signup Date:</span> 21 Aug
                    2025
                  </p>
                  <p>
                    <span className="font-semibold">Activated Date:</span> --
                  </p>
                  <p>
                    <span className="font-semibold">Last Purchase Date:</span>{" "}
                  </p>
                </div>
              </div>
            </div>

            {/* Product Card */}
            <div className="bg-white rounded-2xl  shadow-md border border-gray-400 overflow-hidden h-58">
              <img src="https://res.cloudinary.com/dtb4vozhy/image/upload/v1760703131/vitamin-c-day-regime_oczd3osurv4zkp0f_yhqhh4.avif" alt="Product" className="w-full object-cover" />
            </div>
          </div>

          {/* --- RIGHT COLUMN (MAIN DASHBOARD) --- */}
          <div className="lg:col-span-2 space-y-6">
            {/* Top Info Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <InfoCard title="Achieved Rank">
                <div className="mx-auto">
                  <img
                    src="https://res.cloudinary.com/dtb4vozhy/image/upload/v1760703374/first-rank-badge-3d-icon-png-download-6878280_vqspgk.webp"
                    alt="Rank Badge"
                    className="mx-auto w-24 h-24 rounded-full mb-4"
                  />
                  <p className="mt-2 text-center text-sm font-semibold items-end">
                    NO STAR
                  </p>
                </div>
              </InfoCard>

              <InfoCard title="KYC Status">
                <div className="text-sm space-y-1">
                  <StatusItem label="Bank" status="Rejected" />
                  <StatusItem label="PAN" status="Rejected" />
                  <StatusItem label="Address" status="Rejected" />
                  <StatusItem label="ID Proof" status="Rejected" />
                </div>
              </InfoCard>

              <InfoCard title="Victous Links">
                <LinkButton text="JOIN COMMUNITY 1" />
                <LinkButton text="JOIN COMMUNITY 2" />
                <LinkButton text="SHOPPING LINK" />
              </InfoCard>
            </div>

            {/* My Business Summary */}
            <div className="bg-gray-100 rounded-2xl shadow-md border border-gray-100">
             <div className="bg-gradient-to-r from-yellow-400 to-orange-400 text-black text-center py-2 rounded-t-2xl font-semibold shadow-md [text-shadow:1px_1px_2px_rgba(0,0,0,0.2)]">
  MY BUSINESS SUMMARY
</div>




              {/* Dashboard Boxes */}
              <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-4 p-4">
                <DashBox
                  icon={<FaRupeeSign />}
                  title="Total Payout"
                  value="0.00"
                />
                <DashBox icon={<FaUser />} title="Self PV" value="0" />
                <DashBox
                  icon={<MdOutlineCheckCircle />}
                  title="Purchase Countdown"
                  value="Purchase Required"
                />
                <DashBox
                  icon={<FaShoppingBag />}
                  title="Lifestyle Bonus"
                  value="0.00"
                />
                <DashBox
                  icon={<FaShoppingBag />}
                  title="Carry Forward Community 1 PV"
                  value="0.00"
                />
                <DashBox
                  icon={<FaShoppingBag />}
                  title="Carry Forward Community 2 PV"
                  value="0.00"
                />
                <DashBox
                  icon={<FaShoppingBag />}
                  title="PW Community 1 PV"
                  value="0.00"
                />
                <DashBox
                  icon={<FaShoppingBag />}
                  title="PW Community 2 PV"
                  value="0.00"
                />
                <DashBox
                  icon={<FaShoppingBag />}
                  title="Direct Customer PV"
                  value="0.00"
                />
                <DashBox
                  icon={<FaWallet />}
                  title="Shopping Wallet"
                  value="0.00"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default DashboardPage;

/* ------------ Sub Components ------------- */

const InfoCard = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
    <div className="bg-yellow-400 text-gray-800 text-sm text-center font-semibold py-2">
      {title}
    </div>
    <div className="p-4 text-gray-700">{children}</div>
  </div>
);

const StatusItem = ({ label, status }: { label: string; status: string }) => (
  <div className="flex justify-between border-b border-gray-100 pb-1">
    <span>{label}</span>
    <span className="text-red-500 font-semibold">{status}</span>
  </div>
);

const LinkButton = ({ text }: { text: string }) => (
  <button className="w-full flex items-center justify-between text-sm bg-yellow-400 hover:bg-yellow-400 text-white px-3 py-2 rounded-md mt-2">
    {text} <FaLink />
  </button>
);

const DashBox = ({
  icon,
  title,
  value,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
}) => (
  <div className=" text-black bg-white rounded-xl p-4 text-center flex flex-col items-center justify-center shadow-[0_4px_10px_rgba(255, 218, 68, 0.2)] border-[1.5px] border-gray-500 hover:scale-[1.01] transition-transform duration-150">
    <div className="text-2xl mb-2 text-yellow-400">{icon}</div>
    <p className="text-xs font-medium">{title}</p>
    <p className="text-lg font-bold mt-1">{value}</p>
  </div>
);

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
      <div className="min-h-full px-4 py-6 text-black">
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 -mt-5">
          {/* --- LEFT COLUMN --- */}
          <div className="space-y-6">
            {/* Profile Card */}
            <div className="bg-white rounded-2xl shadow-md p-6 border-[1.5px] border-gray-300">
              <div className="flex flex-col md:flex-row justify-center  lg:flex-col items-center text-center">
                <div className="w-24 h-24 mb-4 md:w-28 md:h-28 border-2 border-gray-600 rounded-full flex items-center justify-center bg-white shadow-lg md:mr-12 lg:mr-0">
                  <img
                    src={
                      user.profile ||
                      "https://res.cloudinary.com/dtb4vozhy/image/upload/v1760695970/gray-user-profile-icon-png-fP8Q1P_ggaoim.png"
                    }
                    alt="Profile"
                    className="w-full h-full object-cover rounded-full border-1 border-gray-300 shadow-md"
                  />
                </div>
                <div className="space-y-1 text-sm xl:-ml-3">
                  <div className="flex items-center ">
                    <span className="font-semibold w-25 text-left">
                      USER ID
                    </span>
                    <span className="w-3 mx-1 text-center">:</span>
                    <span>{user?.user_id || "N/A"}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-semibold w-25 text-left ">Name</span>
                    <span className="w-3 mx-1 text-center">:</span>
                    <span>{user?.user_name || "N/A"}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-semibold w-25 text-left ">
                      Signup Date
                    </span>
                    <span className="w-3 mx-1 text-center">:</span>
                    <span>21 Aug 2025</span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-semibold w-25 text-left ">
                      Activated Date
                    </span>
                    <span className="w-3 mx-1 text-center">:</span>
                    <span>--</span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-semibold w-25 text-left ">
                      Last Order Date
                    </span>
                    <span className="w-3 mx-1 text-center">:</span>
                    <span>--</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Product Card */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-400 overflow-hidden max-md:h-30 max-lg:h-55 h-50">
              {/* For screens up to lg */}
              <img
                src="https://res.cloudinary.com/dtb4vozhy/image/upload/v1760765861/ionizer_with_kitchen_t3da7q.jpg"
                alt="Product small"
                className="w-full object-contain block lg:hidden"
              />

              {/* For screens lg and above */}
              <img
                src="https://res.cloudinary.com/dtb4vozhy/image/upload/v1760763474/ionizers_khpjpn.jpg"
                alt="Product large"
                className="w-full object-cover hidden lg:block"
              />
            </div>
          </div>

          {/* --- RIGHT COLUMN (MAIN DASHBOARD) --- */}
          <div className="lg:col-span-2 space-y-6">
            {/* Top Info Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <InfoCard title="Achieved Rank">
                <div className="mx-auto">
                  <img
                    src="https://res.cloudinary.com/dtb4vozhy/image/upload/v1760782170/ChatGPT_Image_Oct_18_2025_03_38_44_PM_lxgtnf.png"
                    alt="Rank Badge"
                    className="mx-auto w-36 h-24 rounded-full mb-2"
                  />
                  <p className="mt-2 text-center text-sm font-semibold items-end">
                    NO STAR
                  </p>
                </div>
              </InfoCard>

              <InfoCard title="KYC Status">
                <div className="text-sm space-y-1">
                  <StatusItem label="Bank" status="N/A" />
                  <StatusItem label="PAN" status="N/A" />
                  <StatusItem label="Address" status="N/A" />
                  <StatusItem label="ID Proof" status="N/A" />
                </div>
              </InfoCard>

              <InfoCard title="Maverick Links">
                <LinkButton text="JOIN ORGANISATION 1" />
                <LinkButton text="JOIN ORGANISATION 2" />
                <LinkButton text="SHOPPING LINK" />
              </InfoCard>
            </div>

            {/* My Business Summary */}
            <div className="bg-gray-100 rounded-2xl shadow-md border border-gray-100">
              <div className="bg-[radial-gradient(circle_at_top,_#222731,_#a2a7b3)] text-white max-md:text-sm text-center py-2 rounded-t-2xl font-semibold shadow-md 0">
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
                  value="1"
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
                {/* <DashBox
                  icon={<FaShoppingBag />}
                  title="Direct Customer PV"
                  value="0.00"
                />
                <DashBox
                  icon={<FaWallet />}
                  title="Shopping Wallet"
                  value="0.00"
                /> */}
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
  <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden ">
    <div className="bg-[radial-gradient(circle_at_top,_#353a44,_#7e8594)] text-white text-sm text-center font-semibold py-2">
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
  <button className="w-full flex items-center justify-between max-md:text-xs text-xs border border-gray-500 text-black px-3 py-2 rounded-md mt-2 cursor-pointer">
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
  <div className=" text-black bg-white rounded-xl p-3 text-center flex flex-col items-center justify-center shadow-[0_4px_10px_rgba(255, 218, 68, 0.2)] border-[1.5px] border-gray-500 hover:scale-[1.01] transition-transform duration-150">
    <div className="text-2xl mb-2 text-yellow-400">{icon}</div>
    <p className="text-xs font-medium">{title}</p>
    <p className="text-lg font-bold mt-1">{value}</p>
  </div>
);

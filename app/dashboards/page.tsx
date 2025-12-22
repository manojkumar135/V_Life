"use client";

import React from "react";
import Layout from "@/layout/Layout";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { TiTick } from "react-icons/ti";

import { useVLife } from "@/store/context";
import AlertBox from "@/components/Alerts/advanceAlert";
import { hasFirstOrder } from "@/services/hasFirstOrder";
import showToast from "@/components/common/Toast/toast";
import TimeRemainingCard from "@/app/dashboards/TimeRemainingCard";
import CryptoJS from "crypto-js";

import {
  FaLink,
  FaRupeeSign,
  FaUser,
  FaShoppingBag,
  FaWallet,
} from "react-icons/fa";
import { MdOutlineCheckCircle } from "react-icons/md";
import { RiMoneyRupeeCircleLine } from "react-icons/ri";
import { MdOutlineAttachMoney } from "react-icons/md";
import { FaPercent } from "react-icons/fa";
import { CiEdit } from "react-icons/ci";
import { BsFillPeopleFill } from "react-icons/bs";
import { FaGift } from "react-icons/fa6";

interface DashboardSummary {
  user_id: string;
  totalPayout: number;
  matches: number;
  purchaseCount: number;
  rewardValue: number;
  matchingBonus: number;
  infinityBonus: number;
  directTeamSales: number;
  infinityTeamSales: number;
  daysAfterActivation: number;
  cashbackPoints:number;
}

interface CycleStats {
  daysAfterActivation: number;
  matches: number;
  matchingBonus: number;
  cycleIndex: number;
  cycleStart: string;
  cycleEnd: string;
  daysPassed: number;
  remainingDays: number;
}

interface LinkButtonProps {
  text: string;
  onClick: () => void;
}

const rankImages: Record<string, string> = {
  no: "https://res.cloudinary.com/dtb4vozhy/image/upload/v1761374765/Untitled_design_2_buhazb.png",
  1: "https://res.cloudinary.com/dtb4vozhy/image/upload/v1761367318/ChatGPT_Image_Oct_25_2025_09_53_33_AM_b6tic2.png",
  2: "https://res.cloudinary.com/dtb4vozhy/image/upload/v1761367492/ChatGPT_Image_Oct_20_2025_09_19_12_PM_lykzu7.png",
  3: "https://res.cloudinary.com/dtb4vozhy/image/upload/v1761367549/ChatGPT_Image_Oct_20_2025_09_21_04_PM_fpgj0v.png",
  4: "https://res.cloudinary.com/dtb4vozhy/image/upload/v1761367566/ChatGPT_Image_Oct_20_2025_09_26_35_PM_bbl4go.png",
  5: "https://res.cloudinary.com/dtb4vozhy/image/upload/v1761367581/ChatGPT_Image_Oct_20_2025_09_30_19_PM_ixcuyj.png",
  Bronze:
    "https://res.cloudinary.com/dtb4vozhy/image/upload/v1764656253/Untitled_design_6_fwn8o6.png",
  Sliver:
    "https://res.cloudinary.com/dtb4vozhy/image/upload/v1764664375/Untitled_design_7_pyar1u.png",
  Gold: "https://res.cloudinary.com/dtb4vozhy/image/upload/v1764664414/Untitled_design_8_vh0npp.png",
  Emerald:
    "https://res.cloudinary.com/dtb4vozhy/image/upload/v1764664466/Untitled_design_9_n46vye.png",
  Platinum:
    "https://res.cloudinary.com/dtb4vozhy/image/upload/v1764664632/Untitled_design_10_gvft4o.png",
  Diamond:
    "https://res.cloudinary.com/dtb4vozhy/image/upload/v1764664884/Untitled_design_11_m1wixb.png",
  "Blue Diamond":
    "https://res.cloudinary.com/dtb4vozhy/image/upload/v1764664916/Untitled_design_12_opwh7d.png",
  "Black Diamond":
    "https://res.cloudinary.com/dtb4vozhy/image/upload/v1764665001/Untitled_design_13_mkxup3.png",
  "Crown Diamond":
    "https://res.cloudinary.com/dtb4vozhy/image/upload/v1764665045/Untitled_design_14_kyqgsj.png",
  "Royal Crown Diamond":
    "https://res.cloudinary.com/dtb4vozhy/image/upload/v1764665085/Untitled_design_15_kfpqqa.png",
};

const DashboardPage: React.FC = () => {
  const { user } = useVLife();
  // console.log(user);
  const user_id = user?.user_id || "";
  const router = useRouter();

  const SECRET_KEY = process.env.NEXT_PUBLIC_REF_KEY || "";

  const [showAlert, setShowAlert] = useState(false);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [cycles, setCycles] = useState<CycleStats | null>(null);
  const [amountSummary, setAmountSummary] = useState({
    income: 0,
    purchases: 0,
    tax: 0,
  });

  // console.log(cycles);

  useEffect(() => {
    const checkFirstOrder = async () => {
      try {
        const res = await hasFirstOrder(user_id);

        if (!res.hasPermission) {
          setShowAlert(true);
        } else {
          setShowAlert(false);
        }
      } catch (err) {
        console.error("Error checking first order:", err);
        setShowAlert(true); // safe fallback
      }
    };

    if (user_id) {
      checkFirstOrder();
    }
  }, [user_id]);

  // console.log(showAlert)
  // console.log(user.rank);

  useEffect(() => {
    const fetchDashboardSummary = async () => {
      if (!user_id) return;
      try {
        const res = await axios.get(
          `/api/dashboard-operations/purchase-count?user_id=${user_id}`
        );

        // console.log("Dashboard Summary Response:", res.data);
        if (res.data.success) {
          setSummary(res.data.data);
        } else {
          setSummary(null);
        }
      } catch (err) {
        console.error("Error fetching dashboard summary:", err);
        setSummary(null);
      }
    };

    fetchDashboardSummary();
  }, [user_id]);

  useEffect(() => {
    const fetchAmountSummary = async () => {
      if (!user_id) return;
      try {
        const role = user?.role || "user";
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
  }, [user_id]);

  useEffect(() => {
    if (!user_id) return;
    (async () => {
      try {
        const res = await axios.get(`/api/get-cycles?user_id=${user_id}`);
        if (res.data.success) setCycles(res.data.data);
      } catch (err) {
        console.error("Cycle API error:", err);
        setCycles(null);
      }
    })();
  }, [user_id]);

  // console.log("Cycles Data:", cycles);

  /* ------------ Maverick Link Actions ------------ */
  const handleCopyLink = async (position: "left" | "right") => {
    if (!user_id) {
      showToast.error("User ID missing");
      return;
    }

    // Payload to encrypt
    const payload = { referBy: user_id, position };

    // Encrypt using AES
    const encrypted = CryptoJS.AES.encrypt(
      JSON.stringify(payload),
      SECRET_KEY
    ).toString();

    // URL encoded encrypted string
    const link = `https://v-life-gules.vercel.app/auth/register?ref=${encodeURIComponent(
      encrypted
    )}`;

    // Copy URL to clipboard
    await navigator.clipboard.writeText(link);

    const orgName = position === "left" ? "Left Team" : "Right Team";
    showToast.success(`Copied ${orgName} link to share`);
  };

  const handleShopping = () => {
    router.push(showAlert ? "/orders" : "/orders/addorder");
  };

  return (
    <Layout>
      <div className="min-h-full px-4 py-6 text-black">
        <AlertBox
          visible={showAlert}
          title="Action Required!"
          message={<>To activate your account, please place an order</>}
          buttonLabel="ORDER NOW"
          buttonAction={() => router.push("/historys/payAdvance")}
          onClose={() => setShowAlert(false)}
        />

        {/* Summary Cards */}
        {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-4 -mt-5 mb-5"> */}
        {/* <Card
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
          /> */}
        {/* <Card
            icon={<FaPercent className="text-yellow-600" size={30} />}
            label="Tax Deducted"
            amount={`₹ ${amountSummary.tax.toFixed(2)}`}
            className="bg-yellow-50 border-yellow-200"
          /> */}
        {/* </div> */}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6  -mt-5">
          {/* --- LEFT COLUMN --- */}
          <div className="space-y-6 max-md:space-y-3">
            {/* Profile Card */}
            <div
              className="bg-white
 rounded-2xl shadow-md p-6 max-md:p-3 border-[1.5px] border-gray-300 relative"
            >
              <div
                onClick={() => router.push("/settings")}
                className="absolute bottom-2 right-5 flex items-center gap-1 cursor-pointer
             text-black hover:text-blue-700 text-xs md:text-sm"
              >
                <CiEdit className="w-4 h-4 md:w-5 md:h-5" />
                <span>Edit</span>
              </div>
              <div className="flex flex-col md:flex-row justify-center  lg:flex-col items-center text-center">
                <div className="w-24 h-24 mb-4 md:w-28 md:h-28 border-0 border-gray-600 rounded-full flex items-center justify-center bg-white shadow-lg md:mr-12 lg:mr-0">
                  <img
                    src={
                      user.profile ||
                      "https://res.cloudinary.com/dtb4vozhy/image/upload/v1760695970/gray-user-profile-icon-png-fP8Q1P_ggaoim.png"
                    }
                    alt="Profile"
                    className={`w-full h-full object-cover rounded-full border-3 shadow-md p-[2px] ${
                      user?.status?.toLowerCase() === "active"
                        ? "border-green-600"
                        : "border-red-600"
                    }`}
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
                    <span>
                      {user?.user_name
                        ? user.user_name.charAt(0).toUpperCase() +
                          user.user_name.slice(1)
                        : "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center ">
                    <span className="font-semibold w-25 text-left">Status</span>
                    <span className="w-3 mx-1 text-center">:</span>
                    <span
                      className={`font-semibold capitalize ${
                        user?.status?.toLowerCase() === "active"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {user?.status || "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-semibold w-25 text-left ">
                      Date of Birth
                    </span>
                    <span className="w-3 mx-1 text-center">:</span>
                    <span>
                      {user?.dob
                        ? user.dob.split("-").reverse().join("-")
                        : "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-semibold w-25 text-left ">
                      Signup Date
                    </span>
                    <span className="w-3 mx-1 text-center">:</span>
                    <span>
                      {user?.created_at
                        ? new Date(user.created_at)
                            .toLocaleDateString("en-GB")
                            .replace(/\//g, "-")
                        : "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-semibold w-25 text-left ">
                      Activated Date
                    </span>
                    <span className="w-3 mx-1 text-center">:</span>
                    <span>{user?.activated_date || "N/A"}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-semibold w-25 text-left ">
                      Blood Group
                    </span>
                    <span className="w-3 mx-1 text-center">:</span>
                    <span>{user?.blood || "N/A"}</span>
                  </div>
                  {/* <div className="flex items-center">
                    <span className="font-semibold w-27 text-left ">
                      Last Order Date
                    </span>
                    <span className="w-3 mx-1 text-center">:</span>
                    <span>--</span>
                  </div> */}
                </div>
              </div>
            </div>

            <TimeRemainingCard />

            {/* Product Card */}
            {/* <div className="bg-white rounded-2xl shadow-md border border-gray-400 overflow-hidden max-md:h-30 max-lg:h-55 h-44 2xl:h-120"> */}
            {/* For screens up to lg */}
            {/* <img
                src="https://res.cloudinary.com/dtb4vozhy/image/upload/v1760765861/ionizer_with_kitchen_t3da7q.jpg"
                alt="Product small"
                className="w-full object-contain block lg:hidden"
              /> */}

            {/* For screens lg and above */}
            {/* <img
                src="https://res.cloudinary.com/dtb4vozhy/image/upload/v1760763474/ionizers_khpjpn.jpg"
                alt="Product large"
                className="w-full object-cover hidden lg:block"
              /> */}
            {/* </div> */}
          </div>

          {/* --- RIGHT COLUMN (MAIN DASHBOARD) --- */}
          <div className="lg:col-span-2 space-y-6 max-md:space-y-3">
            {/* Top Info Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-md:-mt-2">
              <InfoCard title="Achieved Rank ">
                <div className="mx-auto">
                  {/* --- Dynamic Rank Image --- */}
                  <img
                    src={
                      rankImages[
                        user?.rank && user.rank !== "none" && user.rank !== "0"
                          ? user.rank
                          : "no"
                      ]
                    }
                    alt="Rank Badge"
                    className="h-26 -mt-2 mx-auto"
                  />
                  <p className="text-black text-center text-sm font-semibold items-end">
                    {user?.rank && user.rank !== "0" && user.rank !== "none" ? (
                      <>
                        <span className="text-black text-lg font-extrabold">
                          {user.rank}
                        </span>{" "}
                        {!isNaN(Number(user.rank)) && "STAR"}
                      </>
                    ) : (
                      <>
                        <span className="text-black text-lg font-bold">NO</span>{" "}
                        STAR
                      </>
                    )}
                  </p>
                </div>
              </InfoCard>

              <InfoCard title="KYC Status">
                <div className="text-sm space-y-1">
                  <StatusItem label="PAN" value={user?.pan} />
                  <StatusItem label="Bank" value={user?.wallet_id} />
                  <StatusItem label="ID Proof" value={user?.aadhar} />
                  <StatusItem label="Address" value={user?.pincode} />
                </div>
              </InfoCard>

              {/* --- Maverick Links --- */}
              <InfoCard title="Maverick Links">
                <LinkButton
                  text="JOIN LEFT TEAM"
                  onClick={() => handleCopyLink("left")}
                />
                <LinkButton
                  text="JOIN RIGHT TEAM"
                  onClick={() => handleCopyLink("right")}
                />
                <LinkButton text="SHOPPING LINK" onClick={handleShopping} />
              </InfoCard>
            </div>

            {/* My Business Summary */}
            <div className="bg-gray-50 rounded-2xl shadow-md border border-gray-100">
              <div
                className="bg-gray-500  text-white
               max-md:text-sm text-center py-2 rounded-t-2xl font-semibold shadow-md font-sans"
              >
                MY BUSINESS SUMMARY
              </div>

              {/* Dashboard Boxes */}
              <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 2xl:grid-cols-2 gap-5 p-5">
                <DashBox
                  icon={<FaRupeeSign />}
                  title="Total Payout"
                  value={`₹ ${summary?.totalPayout?.toFixed(2) || "0.00"}`}
                />
                <DashBox
                  icon={<FaGift />}
                  title="Reward Value"
                  value={`₹ ${summary?.rewardValue?.toFixed(2) || "0.00"}`}
                />
                <DashBox
                  icon={<BsFillPeopleFill />}
                  title={`Matching pairs (${
                    cycles?.matches?.toString() || "0"
                  }) `}
                  value={`${
                    cycles?.remainingDays?.toString() || "0"
                  } days left`}
                />

                {/* <DashBox
                  icon={<MdOutlineCheckCircle />}
                  title="Purchase Countdown"
                  value={summary?.purchaseCount?.toString() || "0"}
                /> */}
                <DashBox
                  icon={<MdOutlineCheckCircle />}
                  title="Cashback Points"
                  value={`${summary?.cashbackPoints?.toFixed(2) || "0.00"}`}
                />

                <DashBox
                  icon={<FaShoppingBag />}
                  title="Matching Bonus"
                  value={`₹ ${summary?.matchingBonus?.toFixed(2) || "0.00"}`}
                />
                <DashBox
                  icon={<FaShoppingBag />}
                  title="Infinity Matching Bonus"
                  value={`₹ ${summary?.infinityBonus?.toFixed(2) || "0.00"}`}
                />
                <DashBox
                  icon={<FaShoppingBag />}
                  title="Direct Team Sales"
                  value={`₹  ${summary?.directTeamSales?.toFixed(2) || "0.00"}`}
                />
                <DashBox
                  icon={<FaShoppingBag />}
                  title="Infinity Team Sales"
                  value={`₹ ${
                    summary?.infinityTeamSales?.toFixed(2) || "0.00"
                  }`}
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

// ---------------- InfoCard ----------------
const InfoCard = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden h-46">
    <div
      className="bg-gray-500
                 text-white text-md text-center font-semibold py-2 font-sans"
    >
      {title}
    </div>
    <div className="py-2 px-4 text-gray-700">{children}</div>
  </div>
);

const StatusItem = ({ label, value }: { label: string; value?: string }) => {
  const hasValue = Boolean(value);

  return (
    <div className="flex justify-between border-b border-gray-100 pb-1">
      <span>{label}</span>
      {hasValue ? (
        <span className="text-green-500 font-semibold">
          <TiTick size={25} className="w-6 h-6" />
        </span>
      ) : (
        <span className="text-red-500 font-semibold">N/A</span>
      )}
    </div>
  );
};

// ---------------- LinkButton ----------------
const LinkButton = ({
  text,
  onClick,
}: {
  text: string;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="w-full flex items-center justify-between text-xs border border-gray-500 text-black px-3 py-2 rounded-md mt-2 cursor-pointer hover:bg-gray-100 transition"
  >
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
    <div className="text-2xl mb-2 text-[#106187]">{icon}</div>
    <p className="text-xs font-medium">{title}</p>
    <p className="text-md font-semibold mt-1">{value}</p>
  </div>
);

// Summary card component
const Card = ({
  icon,
  label,
  amount,
  className = "", // allows passing bg, border, etc.
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

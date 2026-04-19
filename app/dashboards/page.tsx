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
import { hasAdvancePaid } from "@/services/hasAdvancePaid";
import showToast from "@/components/common/Toast/toast";
import TimeRemainingCard from "@/app/dashboards/TimeRemainingCard";
import NewsTicker from "@/components/NewsTicker";
import LoginWelcomePopup from "@/components/LoginWelcomePopup";

import CryptoJS from "crypto-js";

import {
  FaLink,
  FaRupeeSign,
  FaUser,
  FaShoppingBag,
  FaWallet,FaReceipt,FaPercent 
} from "react-icons/fa";

import { MdOutlineCheckCircle } from "react-icons/md";
import { RiMoneyRupeeCircleLine } from "react-icons/ri";
import { MdOutlineAttachMoney } from "react-icons/md";
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
  cashbackPoints: number;
  payoutReleased: number;
  payoutOnHold: number;
  totalGST: number;
  totalTDS: number;
  totalAdminCharge: number;
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

function resolveBadge(user: any): string {
  const status = (user?.user_status || user?.status || "").toLowerCase();
  const notes = (user?.status_notes || "").toLowerCase();
  const rank = user?.rank || "";
  const club = user?.club || "";

  if (status === "inactive" || status === "deactivated") {
    if (notes.includes("deactivated by admin")) return "blocked";
    return "registered";
  }

  if (!rank || rank === "none" || rank === "0") return "associate";

  // ✅ Handle numeric star ranks
  const numericRank = Number(rank);
  if (!isNaN(numericRank)) {
    if (numericRank === 1) return "star";
    if (numericRank >= 2 && numericRank <= 5) return "twostar";
  }

  // Keep club fallback if needed
  if (club === "Star") return "star";

  const namedRanks: Record<string, string> = {
    Bronze: "bronze",
    Sliver: "sliver",
    Silver: "sliver",
    Gold: "gold",
    Emerald: "emerald",
    Platinum: "platinum",
    Diamond: "diamond",
    "Blue Diamond": "bluediamond",
    "Black Diamond": "blackdiamond",
    "Crown Diamond": "crowndiamond",
    "Royal Crown Diamond": "royalcrowndiamond",
    Royality: "royalcrowndiamond",
  };

  if (namedRanks[rank]) return namedRanks[rank];

  return "associate";
}

const rankImages: Record<string, string> = {
  no: "https://res.cloudinary.com/dtb4vozhy/image/upload/v1761374765/Untitled_design_2_buhazb.png",
  star: "https://res.cloudinary.com/dtb4vozhy/image/upload/v1769360047/Gemini_Generated_Image_qg6njaqg6njaqg6n_a8dpp6.png",
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

  const isNumericRank = !isNaN(Number(user?.rank));
  const hasRank = user?.rank && user.rank !== "none" && user.rank !== "0";

  const user_id = user?.user_id || "";
  const router = useRouter();

  const SECRET_KEY = process.env.NEXT_PUBLIC_REF_KEY || "";

  const [showAlert, setShowAlert] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [cycles, setCycles] = useState<CycleStats | null>(null);
  const [showQuickStarAlert, setShowQuickStarAlert] = useState(false);
  const [quickStarDaysLeft, setQuickStarDaysLeft] = useState<number>(0);
  const [amountSummary, setAmountSummary] = useState({
    income: 0,
    purchases: 0,
    tax: 0,
  });

  const badgeKey = resolveBadge(user);

  useEffect(() => {
    const shouldShow = sessionStorage.getItem("showLoginPopup");
    if (shouldShow === "true") {
      setShowPopup(true);
      sessionStorage.removeItem("showLoginPopup");
    }
  }, []);

  useEffect(() => {
    if (!user) {
      console.log("User not ready yet");
      return;
    }
    if (!user.user_id) {
      console.log("User ID missing");
      return;
    }

    let isMounted = true;

    (async () => {
      try {
        const firstOrderRes = await hasFirstOrder(user.user_id);
        const advanceRes = await hasAdvancePaid(user.user_id, 15000);

        if (!isMounted) return;

        const hasPermission =
          firstOrderRes?.hasFirstOrder ||
          advanceRes?.hasPermission ||
          firstOrderRes?.activatedByAdmin ||
          firstOrderRes?.isActive;

        setShowAlert(!hasPermission);
      } catch (err) {
        console.error("Permission check error:", err);
        if (isMounted) setShowAlert(true);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    if (!user?.activated_date) return;

    const hasRank = user?.rank && user.rank !== "none" && user.rank !== "0";

    if (hasRank) {
      setShowQuickStarAlert(false);
      return;
    }

    const [day, month, year] = user.activated_date.split("-");

    const activationDate = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
    );

    const today = new Date();
    const diffTime = today.getTime() - activationDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const remainingDays = 7 - diffDays;

    if (remainingDays > 0) {
      setQuickStarDaysLeft(remainingDays);
      setShowQuickStarAlert(true);
    } else {
      setShowQuickStarAlert(false);
    }
  }, [user?.activated_date, user?.rank]);

  useEffect(() => {
    const fetchDashboardSummary = async () => {
      if (!user_id) return;
      try {
        const res = await axios.get(
          `/api/dashboard-operations/purchase-count?user_id=${user_id}`,
        );
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
        const res = await axios.get(
          `/api/dashboard-operations/amount-count?user_id=${user_id}&role=${user.role}`,
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

  const handleCopyLink = async (position: "left" | "right") => {
    if (!user_id) {
      showToast.error("User ID missing");
      return;
    }

    const payload = { referBy: user_id, position };

    const encrypted = CryptoJS.AES.encrypt(
      JSON.stringify(payload),
      SECRET_KEY,
    ).toString();

    const link = `https://maverickmoney.in/auth/register?ref=${encodeURIComponent(
      encrypted,
    )}`;

    await navigator.clipboard.writeText(link);

    const orgName = position === "left" ? "Left Team" : "Right Team";
    showToast.success(`Copied ${orgName} link to share`);
  };

  const handleShopping = () => {
    router.push(showAlert ? "/orders" : "/orders/addorder");
  };

  return (
    <Layout>
      <LoginWelcomePopup open={showPopup} onClose={() => setShowPopup(false)} />

      <div className="min-h-full px-4 pt-6 pb-3 text-black">
        <AlertBox
          visible={showAlert}
          title="Action Required!"
          message={<>To activate your account, please place an order</>}
          buttonLabel="ORDER NOW"
          buttonAction={() => router.push("/historys/payAdvance")}
          onClose={() => setShowAlert(false)}
        />
        <AlertBox
          visible={showQuickStarAlert}
          title="Quick Star Bonus Opportunity!"
          message={
            <>
              Achieve <b>Star Rank</b> to get <b>Quick Star Bonus</b>.<br />⏳{" "}
              {quickStarDaysLeft} day
              {quickStarDaysLeft > 1 ? "s" : ""} left to complete 7 days from
              activation.
            </>
          }
          onClose={() => setShowQuickStarAlert(false)}
        />

        {/* ── NewsTicker — mobile only, at the very top ── */}
        <div className="block md:hidden mb-8 -mt-5">
          <NewsTicker />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 -mt-5">
          {/* --- LEFT COLUMN --- */}
          <div className="space-y-3 max-md:space-y-3">
            {/* ── PROFILE CARD ── */}
            <div
              className="bg-white rounded-2xl shadow-md border-[1.5px] border-gray-300 relative overflow-hidden"
              style={{
                backgroundImage: "url('/profilebgnew.png')",
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
              }}
            >
              <div className="px-4 pb-2 pt-2 lg:pt-1">
                <img
                  src="/maverick-logo.png"
                  alt="Maverick Logo"
                  className="h-11 lg:h-11 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>

              <div
                onClick={() => router.push("/settings")}
                className="absolute bottom-4 right-4 flex items-center gap-1 cursor-pointer text-black hover:text-blue-700 text-xs md:text-sm z-10"
              >
                <CiEdit className="w-4 h-4 md:w-5 md:h-5" />
                <span>Edit</span>
              </div>

              <div className="flex flex-col items-center text-center px-6 pb-6 -mt-5">
                <div className="relative w-36 h-36 mb-3 shrink-0">
                  <img
                    src={
                      user?.profile
                        ? user.profile
                        : "https://res.cloudinary.com/dtb4vozhy/image/upload/v1760695970/gray-user-profile-icon-png-fP8Q1P_ggaoim.png"
                    }
                    alt="Profile"
                    className={`w-full h-full object-cover rounded-full border-2 shadow-md p-0.5 ${
                      user?.status?.toLowerCase() === "active"
                        ? "border-green-500"
                        : "border-red-500"
                    }`}
                  />
                  <img
                    src={`/badges/${badgeKey}.png`}
                    alt={badgeKey}
                    className="absolute w-14 h-14 object-contain drop-shadow-md"
                    style={{ bottom: "-15px", right: "-20px" }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>

                <p className="font-bold text-lg capitalize leading-tight">
                  {user?.user_name
                    ? user.user_name.charAt(0).toUpperCase() +
                      user.user_name.slice(1)
                    : "N/A"}
                </p>

                <div
                  className="space-y-1.5 text-sm mt-4 mb-3"
                  style={{ width: "fit-content", margin: "10px auto 0" }}
                >
                  {[
                    {
                      label: "USER ID",
                      value: (
                        <span className="font-semibold">
                          {user?.user_id || "N/A"}
                        </span>
                      ),
                    },
                    {
                      label: "Status",
                      value: user?.status || "N/A",
                      isStatus: true,
                    },
                    {
                      label: "Date of Birth",
                      value: user?.dob
                        ? user.dob.split("-").reverse().join("-")
                        : "N/A",
                    },
                    {
                      label: "Activated Date",
                      value: user?.activated_date || "N/A",
                    },
                    { label: "Blood Group", value: user?.blood || "N/A" },
                  ].map(({ label, value, isStatus }) => (
                    <div key={label} className="flex items-center">
                      <span className="font-semibold w-32 text-left shrink-0">
                        {label}
                      </span>
                      <span className="mx-2 text-center">:</span>
                      {isStatus ? (
                        <span
                          className={`font-semibold capitalize ${
                            value?.toLowerCase() === "active"
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {value}
                        </span>
                      ) : (
                        <span>{value}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Total Earnings card — mobile only ── */}
            <div
              className="md:hidden rounded-2xl p-4 py-5 text-white relative overflow-hidden"
              style={{
                background:
                  "linear-gradient(135deg, #0C3978 0%, #106187 50%, #16B8E4 100%)",
              }}
            >
              <div
                className="absolute -top-5 -right-5 w-24 h-24 rounded-full pointer-events-none"
                style={{ background: "rgba(255,255,255,0.1)" }}
              />
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "rgba(255,255,255,0.2)" }}
                >
                  <FaRupeeSign className="text-white text-xl" />
                </div>
                <div>
                  <p className="text-white/80 text-xs font-medium">
                    Total Earnings
                  </p>
                  <p className="text-white text-2xl font-bold py-2">
                    ₹ {summary?.totalPayout?.toFixed(2) || "0.00"}
                  </p>
                </div>
              </div>
            </div>

            {/* ── Maverick Cycle + MNF — mobile only ── */}
            {/* ✅ UPDATED: onClick navigates to rewards with correct tab param */}
            <div className="md:hidden grid grid-cols-2 gap-3">
              <DashBox
                icon={<BsFillPeopleFill />}
                title={`MAVERICK WINNERS CYCLE (${cycles?.matches?.toString() || "0"})`}
                value={`${cycles?.remainingDays?.toString() || "0"} days left`}
                index={2}
                onClick={() => router.push("/wallet/rewards?tab=matching")}
              />
              <DashBox
                icon={<FaGift />}
                title="MAVERICK NEXUS"
                value={`₹ ${summary?.rewardValue?.toFixed(2) || "0.00"}`}
                index={1}
                onClick={() => router.push("/wallet/rewards?tab=score")}
              />
            </div>

            {/* ── Direct Sales Bonus + Infinity Sales Bonus — mobile only ── */}
            <div className="md:hidden grid grid-cols-2 gap-3">
              <DashBox
                icon={<FaShoppingBag />}
                title="Direct Sales Bonus"
                value={`₹ ${summary?.directTeamSales?.toFixed(2) || "0.00"}`}
                index={6}
              />
              <DashBox
                icon={<FaShoppingBag />}
                title="Infinity Sales Bonus"
                value={`₹ ${summary?.infinityTeamSales?.toFixed(2) || "0.00"}`}
                index={7}
              />
            </div>

            {/* ── Matching Bonus + Infinity Matching Bonus — mobile only ── */}
            <div className="md:hidden grid grid-cols-2 gap-3">
              <DashBox
                icon={<FaShoppingBag />}
                title="Matching Bonus"
                value={`₹ ${summary?.matchingBonus?.toFixed(2) || "0.00"}`}
                index={4}
              />
              <DashBox
                icon={<FaShoppingBag />}
                title="Infinity Matching Bonus"
                value={`₹ ${summary?.infinityBonus?.toFixed(2) || "0.00"}`}
                index={5}
              />
            </div>

            {/* ── TimeRemainingCard ── */}
            <div className="md:hidden">
              <TimeRemainingCard />
            </div>
            <div className="hidden md:block">
              <TimeRemainingCard />
            </div>

            {/* ── NewsTicker — tablet only ── */}
            <div className="hidden md:block lg:hidden">
              <NewsTicker />
            </div>
          </div>

          {/* --- RIGHT COLUMN (MAIN DASHBOARD) --- */}
          <div className="lg:col-span-2 space-y-6 max-md:space-y-3">
            {/* Top Info Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-md:-mt-2">
              {/* Achieved Rank — hidden on mobile, visible sm+ */}
              <div className="hidden sm:block">
                <InfoCard title="Achieved Rank">
                  <div className="mx-auto flex flex-col items-center justify-center py-2">
                    <img
                      src={`/badges/${badgeKey}.png`}
                      alt={badgeKey}
                      className="h-30 w-30 object-contain drop-shadow-md mx-auto"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                </InfoCard>
              </div>

              <InfoCard title="KYC Status">
                <div className="text-sm space-y-1">
                  <StatusItem label="PAN" value={user?.pan} />
                  <StatusItem label="Bank" value={user?.wallet_id} />
                  <StatusItem label="ID Proof" value={user?.aadhar} />
                  <StatusItem label="Address" value={user?.pincode} />
                </div>
              </InfoCard>

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

            {/* ── NewsTicker — desktop only ── */}
            <div className="hidden lg:block">
              <NewsTicker />
            </div>

            {/* My Business Summary */}
            <div className="bg-gray-50 rounded-2xl shadow-md border border-gray-100 my-0 py-0">
              <div className="bg-gray-700 text-white max-md:text-sm text-center py-2 rounded-t-2xl font-semibold shadow-md font-sans">
                MY BUSINESS SUMMARY
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-4 p-4">
                {/* Hidden on mobile — already shown above */}
                {/* ✅ UPDATED: onClick navigates to rewards with tab=matching */}
                <div className="hidden md:block">
                  <DashBox
                    icon={<BsFillPeopleFill />}
                    title={`MAVERICK CYCLE (${cycles?.matches?.toString() || "0"})`}
                    value={`${cycles?.remainingDays?.toString() || "0"} days left`}
                    index={2}
                    onClick={() => router.push("/wallet/rewards?tab=matching")}
                  />
                </div>

                {/* Hidden on mobile — already shown above */}
                {/* ✅ UPDATED: onClick navigates to rewards with tab=score */}
                <div className="hidden md:block">
                  <DashBox
                    icon={<FaGift />}
                    title="MAVERICK NEXUS"
                    value={`₹ ${summary?.rewardValue?.toFixed(2) || "0.00"}`}
                    index={1}
                    onClick={() => router.push("/wallet/rewards?tab=score")}
                  />
                </div>

                <div className="hidden md:block">
                  <DashBox
                    icon={<FaRupeeSign />}
                    title="Total Payout"
                    value={`₹ ${summary?.totalPayout?.toFixed(2) || "0.00"}`}
                    index={0}
                  />
                </div>

                {/* Payout Released — visible on all screens */}
                <DashBox
                  icon={<MdOutlineCheckCircle />}
                  title="Payout Released"
                  value={`₹ ${summary?.payoutReleased?.toFixed(2) || "0.00"}`}
                  index={0}
                />

                {/* Payout On Hold — visible on all screens */}
                <DashBox
                  icon={<FaWallet />}
                  title="Payout On Hold"
                  value={`₹ ${summary?.payoutOnHold?.toFixed(2) || "0.00"}`}
                  index={5}
                />

                <DashBox
                  icon={<MdOutlineCheckCircle />}
                  title="Cashback Points"
                  value={`${summary?.cashbackPoints?.toFixed(2) || "0.00"}`}
                  index={3}
                />

                {/* Hidden on mobile — already shown above */}
                <div className="hidden md:block">
                  <DashBox
                    icon={<FaShoppingBag />}
                    title="Matching Bonus"
                    value={`₹ ${summary?.matchingBonus?.toFixed(2) || "0.00"}`}
                    index={4}
                  />
                </div>

                {/* Hidden on mobile — already shown above */}
                <div className="hidden md:block">
                  <DashBox
                    icon={<FaShoppingBag />}
                    title="Infinity Matching Bonus"
                    value={`₹ ${summary?.infinityBonus?.toFixed(2) || "0.00"}`}
                    index={5}
                  />
                </div>

                {/* Hidden on mobile — already shown above */}
                <div className="hidden md:block">
                  <DashBox
                    icon={<FaShoppingBag />}
                    title="Direct Team Sales"
                    value={`₹ ${summary?.directTeamSales?.toFixed(2) || "0.00"}`}
                    index={6}
                  />
                </div>

                {/* Hidden on mobile — already shown above */}
                <div className="hidden md:block">
                  <DashBox
                    icon={<FaShoppingBag />}
                    title="Infinity Team Sales"
                    value={`₹ ${summary?.infinityTeamSales?.toFixed(2) || "0.00"}`}
                    index={7}
                  />
                </div>
                <DashBox
                  icon={<FaReceipt />}
                  title="Total GST"
                  value={`${summary?.totalGST?.toFixed(2) || "0.00"}`}
                  index={3}
                />
                <DashBox
                  icon={<FaPercent  />}
                  title="Total TDS"
                  value={`${summary?.totalTDS?.toFixed(2) || "0.00"}`}
                  index={3}
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
  <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden h-46">
    <div className="bg-gray-700 text-white text-md text-center font-semibold py-2 font-sans">
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

const DASH_GRADIENTS = [
  "linear-gradient(135deg, #0C3978 0%, #106187 50%, #16B8E4 100%)",
];

// ✅ UPDATED: DashBox now accepts an optional onClick prop
const DashBox = ({
  icon,
  title,
  value,
  index = 0,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  index?: number;
  onClick?: () => void;
}) => (
  <div
    className={`rounded-xl p-3 text-center flex flex-col items-center justify-center relative overflow-hidden hover:scale-[1.01] transition-transform duration-150 ${
      onClick ? "cursor-pointer" : ""
    }`}
    style={{ background: DASH_GRADIENTS[index % DASH_GRADIENTS.length] }}
    onClick={onClick}
  >
    <div
      className="absolute -top-4 -right-4 w-16 h-16 rounded-full pointer-events-none"
      style={{ background: "rgba(255,255,255,0.15)" }}
    />
    <div className="text-2xl mb-2 text-white">{icon}</div>
    <p className="text-xs font-medium text-white/90">{title}</p>
    <p className="text-md font-semibold mt-1 text-white">{value}</p>
  </div>
);

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

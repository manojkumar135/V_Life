"use client";

import React, { useEffect } from "react";
import Layout from "@/layout/Layout";
import { useVLife } from "@/store/context";
import AlertBox from "@/components/Alerts/advanceAlert";
import { hasFirstOrder } from "@/services/hasFirstOrder";
import { useRouter } from "next/navigation";

import TimeRemainingCard from "@/app/dashboards/TimeRemainingCard";
import NewsTicker from "@/components/NewsTicker";
import LoginWelcomePopup from "@/components/LoginWelcomePopup";

export default function AdminDashboard() {
  const { user } = useVLife();
  const router = useRouter();

  const [showAlert, setShowAlert] = React.useState(false);
  const [showPopup, setShowPopup] = React.useState(false);

  useEffect(() => {
    const shouldShow = sessionStorage.getItem("showLoginPopup");
    if (shouldShow === "true") {
      setShowPopup(true);
      sessionStorage.removeItem("showLoginPopup");
    }
  }, []);

  useEffect(() => {
    if (!user?.user_id) return;

    const checkFirstOrder = async () => {
      try {
        const res = await hasFirstOrder(user.user_id);
        if (!res.hasPermission) setShowAlert(true);
      } catch {
        setShowAlert(true);
      }
    };

    checkFirstOrder();
  }, [user?.user_id]);

  return (
    <Layout>
      <LoginWelcomePopup open={showPopup} onClose={() => setShowPopup(false)} />

      <AlertBox
        visible={showAlert}
        title="Action Required!"
        message={<>To activate your account, please place an order</>}
        buttonLabel="ORDER NOW"
        buttonAction={() => router.push("/historys/payAdvance")}
        onClose={() => setShowAlert(false)}
      />

      {/* 🔴 NO space-y HERE */}
      <div className="px-3 md:px-4 pb-6 text-black ">
        {/* News ticker isolated */}
        <div className="max-w-[100vw] md:max-w-[85vw] xl:max-w-[90vw] mb-5 mx-auto">
          <NewsTicker />
        </div>

        {/* TOP SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <AdminCard title="My Sales">
            <StatRow label="Total Sales" value="₹ 0.00" />
            <StatRow label="First Order" value="₹ 0.00" />
            <StatRow label="Re-Order" value="₹ 0.00" />
          </AdminCard>

          <AdminCard title="My Orders">
            <StatRow label="Total Orders" value="0" />
            <StatRow label="Pending Orders" value="0" />
            <StatRow label="Dispatched Orders" value="0" />
          </AdminCard>

          <AdminCard title="My Team">
            <StatRow label="Total Registered" value="0" />
            <StatRow label="Total Activations" value="0" />
            <StatRow label="Admin Activations" value="0" />
            <StatRow label="Blocked IDs" value="0" />
          </AdminCard>

          <AdminCard title="My Tickets">
            <StatRow label="Open Tickets" value="0" />
            <StatRow label="Closed Tickets" value="0" />
          </AdminCard>
        </div>

        {/* WALLET */}
        <div className="mb-8">
          <SectionHeader title="My Wallet & Payout" />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            <MiniCard title="Total Payout Generated" value="₹ 0.00" />
            <MiniCard title="Total Released Payout" value="₹ 0.00" />
            <MiniCard title="Total Pending Payout" value="₹ 0.00" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            <MiniCard title="Generated Reward Points" value="0" />
            <MiniCard title="Released Reward Points" value="0" />
            <MiniCard title="Pending Reward Points" value="0" />
          </div>
        </div>

        {/* CYCLE CLOSINGS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TimeRemainingCard />

          <AdminCard title="Cycle Closings">
            <StatRow label="Current PV (Left Team)" value="0" />
            <StatRow label="Current PV (Right Team)" value="0" />
            <StatRow label="Previous PV" value="0" />
            <StatRow label="Total PV" value="0" />
          </AdminCard>
        </div>
      </div>
    </Layout>
  );
}

/* ===== Reusable ===== */

const AdminCard = ({ title, children }: any) => (
  <div className="bg-white rounded-xl border border-gray-300 shadow-sm">
    <div className="bg-gray-700 text-white text-sm font-semibold px-4 py-2 rounded-t-xl">
      {title}
    </div>
    <div className="p-4 space-y-2">{children}</div>
  </div>
);

const SectionHeader = ({ title }: any) => (
  <div className="bg-gray-800 text-white text-center py-2 rounded-lg font-semibold">
    {title}
  </div>
);

const StatRow = ({ label, value }: any) => (
  <div className="flex justify-between items-center text-sm border-b last:border-b-0 pb-1">
    <span className="text-gray-600">{label}</span>
    <span className="font-semibold">{value}</span>
  </div>
);

const MiniCard = ({ title, value }: any) => (
  <div className="bg-white border border-gray-300 rounded-lg p-4 text-center shadow-sm">
    <p className="text-xs text-gray-500">{title}</p>
    <p className="text-lg font-bold mt-1">{value}</p>
  </div>
);

"use client";

import { useEffect, useState, useCallback } from "react";
import Layout from "@/layout/Layout";

import { useVLife } from "@/store/context";
import AlertBox from "@/components/Alerts/advanceAlert";
import { hasFirstOrder } from "@/services/hasFirstOrder";
import { useRouter } from "next/navigation";
import axios from "axios";

import TimeRemainingCard from "@/app/dashboards/TimeRemainingCard";
import NewsTicker from "@/components/NewsTicker";
import LoginWelcomePopup from "@/components/LoginWelcomePopup";

import { FiFilter } from "react-icons/fi";
import DateFilterModal from "@/components/common/DateRangeModal/daterangemodal";
import Loader from "@/components/common/loader";

/* =====================================================
   TYPES
===================================================== */
interface AdminDashboardData {
  sales: {
    totalSales: number;
    firstOrder: number;
    reorder: number;
  };
  orders: {
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
  };
  team: {
    totalRegistered: number;
    normalActivations: number;
    adminActivations: number;
    deactivatedIds: number;
  };
  wallet: {
    totalGeneratedPayout: number;
    totalReleasedPayout: number;
    totalPendingPayout: number;
    generatedRewardPoints: number;
  };
}

export default function AdminDashboard() {
  const { user } = useVLife();
  const router = useRouter();

  const [showAlert, setShowAlert] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [loading, setLoading] = useState(false);

  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null);

  const [showFilterModal, setShowFilterModal] = useState(false);
  const [dateFilter, setDateFilter] = useState<any>(null);

  /* =====================================================
     LOGIN POPUP
  ===================================================== */
  useEffect(() => {
    const shouldShow = sessionStorage.getItem("showLoginPopup");
    if (shouldShow === "true") {
      setShowPopup(true);
      sessionStorage.removeItem("showLoginPopup");
    }
  }, []);

  /* =====================================================
     FIRST ORDER CHECK
  ===================================================== */
  useEffect(() => {
    if (!user?.user_id) return;

    (async () => {
      try {
        const res = await hasFirstOrder(user.user_id);
        setShowAlert(!res.hasPermission);
      } catch {
        setShowAlert(true);
      }
    })();
  }, [user?.user_id]);

  /* =====================================================
     FETCH ADMIN DASHBOARD DATA
  ===================================================== */
  const fetchAdminDashboard = useCallback(async () => {
    if (!user?.user_id) return;

    try {
      setLoading(true);

      const params: any = {
        user_id: user.user_id,
      };

      // single date
      if (dateFilter?.type === "on") {
        params.date = dateFilter.date;
      }

      // date range
      if (dateFilter?.type === "range") {
        params.from = dateFilter.from;
        params.to = dateFilter.to;
      }

      const res = await axios.get("/api/admindashboard-operations", { params });

      if (res.data.success) {
        setDashboard(res.data.data);
      } else {
        setDashboard(null);
      }
    } catch (err) {
      console.error("Admin dashboard fetch error:", err);
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  }, [user?.user_id, dateFilter]);

  useEffect(() => {
    fetchAdminDashboard();
  }, [fetchAdminDashboard]);

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

      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <Loader />
        </div>
      )}

      {/* Floating Filter Button */}
      <div className="fixed bottom-5 right-6 z-20">
        <button
          title="Filter"
          onClick={() => setShowFilterModal(true)}
          className="w-12 h-12 rounded-full bg-gradient-to-r from-[#0C3978] via-[#106187] to-[#16B8E4]
          text-white flex items-center justify-center shadow-lg"
        >
          <FiFilter size={20} />
        </button>
      </div>

      <div className="px-3 md:px-4 pb-6 text-black">
        <div className="max-w-[100vw] md:max-w-[85vw] xl:max-w-[90vw] mb-5 mx-auto">
          <NewsTicker />
        </div>

        {/* ================= TOP SECTION ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <AdminCard
            title="My Sales"
            footerLabel="View Report"
            footerLink="/orders"
          >
            <StatRow
              label="Total Sales"
              value={`₹ ${dashboard?.sales.totalSales.toFixed(2) || "0.00"}`}
            />
            <StatRow
              label="First Order"
              value={`₹ ${dashboard?.sales.firstOrder.toFixed(2) || "0.00"}`}
            />
            <StatRow
              label="Re-Order"
              value={`₹ ${dashboard?.sales.reorder.toFixed(2) || "0.00"}`}
            />
          </AdminCard>

          <AdminCard
            title="My Orders"
            footerLabel="View Report"
            footerLink="/orders"
          >
            <StatRow
              label="Total Orders"
              value={dashboard?.orders.totalOrders || 0}
            />
            <StatRow
              label="Pending Orders"
              value={dashboard?.orders.pendingOrders || 0}
            />
            <StatRow
              label="Dispatched Orders"
              value={dashboard?.orders.completedOrders || 0}
            />
          </AdminCard>

          <AdminCard
            title="My Team"
            footerLabel="View Report"
            footerLink="/administration/users"
          >
            <StatRow
              label="Total Registered"
              value={dashboard?.team.totalRegistered || 0}
            />
            <StatRow
              label="Activations"
              value={dashboard?.team.normalActivations || 0}
            />
            <StatRow
              label="Admin Activations"
              value={dashboard?.team.adminActivations || 0}
            />
            <StatRow
              label="Deactivated IDs"
              value={dashboard?.team.deactivatedIds || 0}
            />
          </AdminCard>

          <AdminCard
            title="My Tickets"
            footerLabel="View Report"
            footerLink="/administration/users"
          >
            <StatRow label="Open Tickets" value="0" />
            <StatRow label="Closed Tickets" value="0" />
          </AdminCard>
        </div>

        {/* ================= WALLET ================= */}
        <div className="mb-8">
          <SectionHeader title="My Wallet & Payout" />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            <MiniCard
              title="Total Payout Generated"
              value={`₹ ${
                dashboard?.wallet.totalGeneratedPayout.toFixed(2) || "0.00"
              }`}
            />
            <MiniCard
              title="Total Released Payout"
              value={`₹ ${
                dashboard?.wallet.totalReleasedPayout.toFixed(2) || "0.00"
              }`}
            />
            <MiniCard
              title="Total Pending Payout"
              value={`₹ ${
                dashboard?.wallet.totalPendingPayout.toFixed(2) || "0.00"
              }`}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            <MiniCard
              title="Generated Reward Points"
              value={dashboard?.wallet.generatedRewardPoints || 0}
            />
            <MiniCard title="Released Reward Points" value="0" />
            <MiniCard title="Pending Reward Points" value="0" />
          </div>
        </div>

        {/* ================= CYCLE ================= */}
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

      {/* Date Filter Modal */}
      <DateFilterModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onSubmit={(filter) => {
          setDateFilter(filter);
          setShowFilterModal(false);
        }}
      />
    </Layout>
  );
}

/* ================= REUSABLE ================= */

const AdminCard = ({ title, children, footerLabel, footerLink }: any) => {
  const router = useRouter();

  return (
    <div className="bg-white rounded-xl border border-gray-300 shadow-sm flex flex-col h-full">
      {/* Header */}
      <div className="bg-gray-700 text-white text-sm font-semibold px-4 py-2 rounded-t-xl">
        {title}
      </div>

      {/* Body */}
      <div className="px-4 py-2 space-y-2 flex-1">{children}</div>

      {/* Footer (optional) */}
      {footerLabel && footerLink && (
        <div className=" px-4 pb-2 text-right">
          <button
            onClick={() => router.push(footerLink)}
            className="text-sm  text-blue-600 hover:text-blue-800 underline transition cursor-pointer"
          >
            {footerLabel}
          </button>
        </div>
      )}
    </div>
  );
};

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

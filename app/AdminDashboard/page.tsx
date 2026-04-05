"use client";

import { useEffect, useState, useCallback } from "react";
import Layout from "@/layout/Layout";

import { useVLife } from "@/store/context";
import AlertBox from "@/components/Alerts/advanceAlert";
import { hasFirstOrder } from "@/services/hasFirstOrder";
import { hasAdvancePaid } from "@/services/hasAdvancePaid";
import { useRouter } from "next/navigation";
import axios from "axios";

import TimeRemainingCard from "@/app/dashboards/TimeRemainingCard";
import NewsTicker from "@/components/NewsTicker";
import LoginWelcomePopup from "@/components/LoginWelcomePopup";

import {
  FiFilter,
  FiShoppingCart,
  FiUsers,
  FiMessageSquare,
  FiTrendingUp,
} from "react-icons/fi";
import DateFilterModal from "@/components/common/DateRangeModal/daterangemodal";
import Loader from "@/components/common/loader";

import {
  FaRupeeSign,
  FaBoxOpen,
  FaTruck,
  FaCheckCircle,
  FaTimesCircle,
  FaClipboardList,
  FaWallet,
  FaGift,
  FaMoneyBillWave,
  FaUserShield,
  FaPercent,
  FaChartLine,
  FaReceipt,
} from "react-icons/fa";
import { MdOutlineCheckCircle, MdPendingActions } from "react-icons/md";
import { HiOutlineUserGroup, HiOutlineUserAdd } from "react-icons/hi";

/* =====================================================
   TYPES
===================================================== */
interface AdminDashboardData {
  sales: {
    totalSales: number;
    firstOrder: number;
    reorder: number;
    advanceSales: number;
  };
  orders: {
    totalOrders: number;
    pendingOrders: number;
    dispatchedOrders: number;
    deliveredOrders: number;
    returnedOrders: number;
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
    totalHoldPayout: number;
    generatedRewardPoints: number;
    releasedRewardPoints: number;
    holdRewardPoints: number;
    totalWithdraw: number;
    totalAdminCharge: number;
    totalTds: number;
    totalPayable: number;
    holdPayable: number;
    pendingPayable: number;
    releasedPayable: number;
    totalGst: number;
  };
}

export default function AdminDashboard() {
  const { user } = useVLife();
  const router = useRouter();

  const [showAlert, setShowAlert] = useState(false);
  const [showWalletAlert, setShowWalletAlert] = useState(false);
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

    let isMounted = true;

    (async () => {
      try {
        const firstOrderRes = await hasFirstOrder(user.user_id);
        const advanceRes = await hasAdvancePaid(user.user_id, 15000);

        if (!isMounted) return;

        const hasPermission =
          firstOrderRes.hasFirstOrder ||
          advanceRes.hasPermission ||
          firstOrderRes.activatedByAdmin;

        setShowAlert(!hasPermission);
      } catch (err) {
        console.error("Permission check error:", err);
        if (isMounted) setShowAlert(true);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [user?.user_id]);

  /* =====================================================
     FETCH ADMIN DASHBOARD DATA
  ===================================================== */
  const fetchAdminDashboard = useCallback(async () => {
    if (!user?.user_id) return;

    try {
      setLoading(true);

      const params: any = { user_id: user.user_id };

      if (dateFilter?.type === "on") params.date = dateFilter.date;
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

  const checkWalletChangeRequests = useCallback(async () => {
    if (!user?.user_id) return;

    try {
      const res = await axios.get("/api/wallet-change-requests", {
        params: { status: "pending" },
      });

      if (res.data.success && res.data.data.length > 0) {
        setShowWalletAlert(true);
      } else {
        setShowWalletAlert(false);
      }
    } catch (err) {
      console.error("Wallet request check error:", err);
      setShowWalletAlert(false);
    }
  }, [user?.user_id]);

  useEffect(() => {
    if (user?.user_id) checkWalletChangeRequests();
  }, [user?.user_id]);

  const fmt = (val?: number) => `₹ ${(val ?? 0).toFixed(2)}`;

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

      <AlertBox
        visible={user?.role !== "user" && showWalletAlert}
        title="Wallet Change Request Pending!"
        message={
          <>You have pending wallet change requests. Please review them.</>
        }
        buttonLabel="VIEW REQUESTS"
        buttonAction={() => router.push("/wallet/change-requests")}
        onClose={() => setShowWalletAlert(false)}
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
          className="w-12 h-12 rounded-full bg-linear-to-r from-[#0C3978] via-[#106187] to-[#16B8E4] text-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
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
          {/* MY SALES */}
          <AdminCard
            title="My Sales"
            icon={<FiTrendingUp size={16} />}
            footerLabel="View Report"
            footerLink="/orders"
          >
            <StatRow
              icon={<FaRupeeSign className="text-blue-600" />}
              label="Total Sales"
              value={fmt(dashboard?.sales.totalSales)}
              highlight
            />
            <StatRow
              icon={<FaBoxOpen className="text-green-500" />}
              label="First Order"
              value={fmt(dashboard?.sales.firstOrder)}
            />
            <StatRow
              icon={<FiShoppingCart className="text-orange-500" />}
              label="Re-Order"
              value={fmt(dashboard?.sales.reorder)}
            />
            <StatRow
              icon={<FaWallet className="text-purple-500" />}
              label="Advance"
              value={fmt(dashboard?.sales.advanceSales)}
            />
             <StatRow
              icon={<FaPercent className="text-red-500" />}
              label="GST Collected"
              value={fmt(dashboard?.wallet.totalGst ?? 0)}
              badgeColor="red"
            />
          </AdminCard>

          {/* MY ORDERS */}
          <AdminCard
            title="My Orders"
            icon={<FiShoppingCart size={16} />}
            footerLabel="View Report"
            footerLink="/orders"
          >
            <StatRow
              icon={<FaClipboardList className="text-blue-600" />}
              label="Total Orders"
              value={dashboard?.orders.totalOrders ?? 0}
              highlight
            />
            <StatRow
              icon={<MdPendingActions className="text-yellow-500" />}
              label="Pending Orders"
              value={dashboard?.orders.pendingOrders ?? 0}
              badgeColor="yellow"
            />
            <StatRow
              icon={<FaTruck className="text-blue-500" />}
              label="Dispatched Orders"
              value={dashboard?.orders.dispatchedOrders ?? 0}
              badgeColor="blue"
            />
            <StatRow
              icon={<FaCheckCircle className="text-green-500" />}
              label="Delivered Orders"
              value={dashboard?.orders.deliveredOrders ?? 0}
              badgeColor="green"
            />
            <StatRow
              icon={<FaTimesCircle className="text-red-500" />}
              label="Returned / Failed"
              value={dashboard?.orders.returnedOrders ?? 0}
              badgeColor="red"
            />
          </AdminCard>

          {/* TOTAL SUMMARY */}
          <AdminCard title="Total Summary" icon={<FaWallet size={16} />}>
            {/* GRAND TOTAL (USE EXISTING FIELD) */}
            <StatRow
              icon={<FaChartLine className="text-blue-600" />}
              label="Total Generated"
              value={fmt(dashboard?.wallet.totalGeneratedPayout ?? 0)}
              highlight
            />

            {/* WITHDRAW */}
            <StatRow
              icon={<FaMoneyBillWave className="text-green-500" />}
              label="Withdraw"
              value={fmt(dashboard?.wallet.totalWithdraw ?? 0)}
              badgeColor="green"
            />

            {/* REWARD */}
            <StatRow
              icon={<FaGift className="text-purple-500" />}
              label="Reward"
              value={fmt(dashboard?.wallet.generatedRewardPoints ?? 0)}
              badgeColor="purple"
            />

            {/* ADMIN CHARGES */}
            <StatRow
              icon={<FaUserShield className="text-yellow-500" />}
              label="Admin Charges"
              value={fmt(dashboard?.wallet.totalAdminCharge ?? 0)}
              badgeColor="yellow"
            />

            {/* TDS */}
            <StatRow
              icon={<FaPercent className="text-red-500" />}
              label="TDS"
              value={fmt(dashboard?.wallet.totalTds ?? 0)}
              badgeColor="red"
            />
          </AdminCard>

           {/* MY PAYABLES */}
          <AdminCard
            title="My Payables"
            icon={<FaRupeeSign size={16} />}
            footerLabel="View Report"
            footerLink="/wallet/payout"
          >
            <StatRow
              icon={<FaRupeeSign className="text-blue-600" />}
              label="Total Payable"
              value={fmt(dashboard?.wallet.totalWithdraw ?? 0)}
              highlight
            />

            <StatRow
              icon={<FaRupeeSign className="text-yellow-500" />}
              label="OnHold Payable"
              value={fmt(dashboard?.wallet.holdPayable ?? 0)}
              badgeColor="yellow"
            />

            <StatRow
              icon={<FaRupeeSign className="text-orange-500" />}
              label="Pending Payable"
              value={fmt(dashboard?.wallet.pendingPayable ?? 0)}
              badgeColor="orange"
            />

            <StatRow
              icon={<FaRupeeSign className="text-green-500" />}
              label="Released Payable"
              value={fmt(dashboard?.wallet.releasedPayable ?? 0)}
              badgeColor="green"
            />
          </AdminCard>

          {/* MY TEAM */}
          <AdminCard
            title="My Team"
            icon={<FiUsers size={16} />}
            footerLabel="View Report"
            footerLink="/administration/users"
          >
            <StatRow
              icon={<HiOutlineUserGroup className="text-blue-600" />}
              label="Total Registered"
              value={dashboard?.team.totalRegistered ?? 0}
              highlight
            />
            <StatRow
              icon={<HiOutlineUserAdd className="text-green-500" />}
              label="Activations"
              value={dashboard?.team.normalActivations ?? 0}
              badgeColor="green"
            />
            <StatRow
              icon={<HiOutlineUserAdd className="text-purple-500" />}
              label="Admin Activations"
              value={dashboard?.team.adminActivations ?? 0}
              badgeColor="purple"
            />
            <StatRow
              icon={<FaTimesCircle className="text-red-500" />}
              label="Deactivated IDs"
              value={dashboard?.team.deactivatedIds ?? 0}
              badgeColor="red"
            />
          </AdminCard>

         

          {/* MY TICKETS */}
          <AdminCard
            title="My Tickets"
            icon={<FiMessageSquare size={16} />}
            footerLabel="View Report"
            footerLink="/administration/users"
          >
            <StatRow
              icon={<MdPendingActions className="text-yellow-500" />}
              label="Open Tickets"
              value="0"
              badgeColor="yellow"
            />
            <StatRow
              icon={<FaCheckCircle className="text-green-500" />}
              label="Closed Tickets"
              value="0"
              badgeColor="green"
            />
          </AdminCard>
        </div>

        {/* ================= WALLET ================= */}
        <div className="mb-8">
          <SectionHeader title="My Wallet & Payout" />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            <DashBox
              icon={<FaRupeeSign />}
              title="Total Payout Generated"
              value={fmt(dashboard?.wallet.totalGeneratedPayout)}
            />
            <DashBox
              icon={<MdOutlineCheckCircle />}
              title="Total Released Payout"
              value={fmt(dashboard?.wallet.totalReleasedPayout)}
            />
            <DashBox
              icon={<FaWallet />}
              title="Total Payout On Hold"
              value={fmt(dashboard?.wallet.totalHoldPayout)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            <DashBox
              icon={<FaGift />}
              title="Generated Reward Points"
              value={(dashboard?.wallet.generatedRewardPoints ?? 0).toFixed(2)}
            />
            <DashBox
              icon={<MdOutlineCheckCircle />}
              title="Released Reward Points"
              value={(dashboard?.wallet.releasedRewardPoints ?? 0).toFixed(2)}
            />
            <DashBox
              icon={<FaWallet />}
              title="Pending Reward Points"
              value={(dashboard?.wallet.holdRewardPoints ?? 0).toFixed(2)}
            />
          
            <DashBox
              icon={<FaReceipt />}
              title="GST Amount"
              value={fmt(dashboard?.wallet.totalGst)}
            />
            
          </div>
        </div>

        {/* ================= CYCLE ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TimeRemainingCard />
          <AdminCard title="Cycle Closings" icon={<FiTrendingUp size={16} />}>
            <StatRow
              icon={<FaRupeeSign className="text-blue-500" />}
              label="Current PV (Left Team)"
              value="0"
            />
            <StatRow
              icon={<FaRupeeSign className="text-blue-500" />}
              label="Current PV (Right Team)"
              value="0"
            />
            <StatRow
              icon={<FaRupeeSign className="text-gray-400" />}
              label="Previous PV"
              value="0"
            />
            <StatRow
              icon={<FaRupeeSign className="text-green-500" />}
              label="Total PV"
              value="0"
              highlight
            />
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

const AdminCard = ({
  title,
  icon,
  children,
  footerLabel,
  footerLink,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footerLabel?: string;
  footerLink?: string;
}) => {
  const router = useRouter();

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col h-full overflow-hidden">
      {/* Card Header */}
      <div
        className="flex items-center gap-2 px-4 py-2 bg-gray-700"
        // style={{
        //   background: "linear-gradient(135deg, #106187 0%, #106187 60%, #106187 100%)",
        // }}
      >
        {icon && (
          <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-white shrink-0">
            {icon}
          </div>
        )}
        <span className="text-white font-semibold text-sm tracking-wide">
          {title}
        </span>
      </div>

      {/* Card Body */}
      <div className="px-4 py-3 space-y-1 flex-1">{children}</div>

      {/* Card Footer */}
      {footerLabel && footerLink && (
        <div className="px-4 pb-3 pt-1 text-right border-t border-gray-100">
          <button
            onClick={() => router.push(footerLink)}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium underline underline-offset-2 transition cursor-pointer"
          >
            {footerLabel} →
          </button>
        </div>
      )}
    </div>
  );
};

const SectionHeader = ({ title }: { title: string }) => (
  <div
    className="text-white bg-gray-700 text-center py-2.5 rounded-xl font-semibold text-sm tracking-wider shadow-sm"
    // style={{
    //   background: "linear-gradient(135deg, #0C3978 0%, #106187 60%, #16B8E4 100%)",
    // }}
  >
    {title}
  </div>
);

const badgeColorMap: Record<string, string> = {
  yellow: "bg-yellow-100 text-yellow-700",
  green: "bg-green-100 text-green-700",
  blue: "bg-blue-100 text-blue-700",
  red: "bg-red-100 text-red-700",
  purple: "bg-purple-100 text-purple-700",
};

const StatRow = ({
  icon,
  label,
  value,
  highlight = false,
  badgeColor,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string | number;
  highlight?: boolean;
  badgeColor?: string;
}) => (
  <div
    className={`flex items-center justify-between py-1 border-b last:border-b-0 border-gray-100 ${
      highlight ? "bg-blue-50/60 -mx-4 px-4 rounded" : ""
    }`}
  >
    <div className="flex items-center gap-2">
      {icon && <span className="text-base shrink-0">{icon}</span>}
      <span
        className={`text-sm ${highlight ? "font-semibold text-gray-800" : "text-gray-600"}`}
      >
        {label}
      </span>
    </div>
    {badgeColor ? (
      <span
        className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${badgeColorMap[badgeColor] || "bg-gray-100 text-gray-700"}`}
      >
        {value}
      </span>
    ) : (
      <span
        className={`text-sm font-bold ${highlight ? "text-blue-700" : "text-gray-800"}`}
      >
        {value}
      </span>
    )}
  </div>
);

const MiniCard = ({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) => (
  <div className="bg-white border border-gray-300 rounded-lg p-4 text-center shadow-sm">
    <p className="text-xs text-gray-500">{title}</p>
    <p className="text-lg font-bold mt-1">{value}</p>
  </div>
);

const DASH_GRADIENTS = [
  "linear-gradient(135deg, #0C3978 0%, #106187 50%, #16B8E4 100%)",
];

const DashBox = ({
  icon,
  title,
  value,
  index = 0,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  index?: number;
}) => (
  <div className="rounded-xl p-4 text-center flex flex-col items-center justify-center relative overflow-hidden hover:scale-[1.01] transition-transform duration-150 bg-white border border-gray-200 shadow-sm">
    {/* Decorative corner circle */}
    <div
      className="absolute -top-4 -right-4 w-16 h-16 rounded-full pointer-events-none opacity-10"
      style={{ background: DASH_GRADIENTS[index % DASH_GRADIENTS.length] }}
    />

    {/* Gradient Icon */}
    <div
      className="text-2xl mb-2"
      style={{
        background: DASH_GRADIENTS[index % DASH_GRADIENTS.length],
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
      }}
    >
      {icon}
    </div>

    {/* Title */}
    <p className="text-xs font-medium text-gray-500">{title}</p>

    {/* Gradient Value */}
    <p
      className="text-md font-bold mt-1"
      style={{
        background: DASH_GRADIENTS[index % DASH_GRADIENTS.length],
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
      }}
    >
      {value}
    </p>
  </div>
);

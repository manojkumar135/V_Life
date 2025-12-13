"use client";

import React, { useEffect, useMemo, useState } from "react";
import Layout from "@/layout/Layout";
import { FaWallet } from "react-icons/fa";
import { RiMoneyRupeeCircleLine } from "react-icons/ri";
import { MdOutlineAttachMoney } from "react-icons/md";
import { useRouter } from "next/navigation";
import { useVLife } from "@/store/context";
import AlertBox from "@/components/Alerts/advanceAlert";
import { hasAdvancePaid } from "@/utils/hasAdvancePaid";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Title,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Title
);

type RangeKey = "daily" | "weekly" | "monthly" | "yearly";

const DashboardPage: React.FC = () => {
  const { user } = useVLife();
  const user_id = user?.user_id || "";
  const router = useRouter();

  const [showAlert, setShowAlert] = useState(false);
  const [range, setRange] = useState<RangeKey>("daily");

  useEffect(() => {
    const checkAdvancePayment = async () => {
      try {
        const paid = await hasAdvancePaid(user_id, 10000);
        if (!paid.hasPermission) setShowAlert(true);
      } catch (err) {
        console.error("Error checking payment history:", err);
        setShowAlert(true);
      }
    };

    if (user_id) checkAdvancePayment();
  }, [user_id]);

  // Dummy data for chart — replace with API calls later
  const chartDataSets = useMemo(
    () => ({
      daily: {
        labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        data: [12, 19, 8, 22, 16, 9, 14],
      },
      weekly: {
        labels: ["Wk1", "Wk2", "Wk3", "Wk4"],
        data: [120, 190, 80, 220],
      },
      monthly: {
        labels: [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ],
        data: [120, 150, 170, 140, 190, 220, 200, 210, 180, 195, 230, 250],
      },
      yearly: {
        labels: ["2019", "2020", "2021", "2022", "2023", "2024"],
        data: [1200, 1500, 1700, 1400, 1900, 2200],
      },
    }),
    []
  );

  const activeDataset = chartDataSets[range];

  const chartData = {
    labels: activeDataset.labels,
    datasets: [
      {
        label: "Orders",
        data: activeDataset.data,
        fill: false,
        tension: 0.3,
        pointRadius: 3,
        borderWidth: 2,
        borderColor: "#facc15", // yellow-400
        backgroundColor: "#facc15",
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false as const,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
      tooltip: {
        enabled: true,
      },
    },
    scales: {
      x: {
        ticks: { color: "#111827" }, // gray-900 / black-ish
      },
      y: {
        ticks: { color: "#111827" },
        grid: {
          color: "#e5e7eb", // gray-200
        },
      },
    },
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 px-4 py-6">
        {/* Advance Alert */}
        <AlertBox
          visible={showAlert}
          title="Action Required!"
          message={
            <>
              To activate your account, please place{" "}an order
            </>
          }
          buttonLabel="ORDER NOW"
          buttonAction={() => router.push("/historys/payAdvance")}
          onClose={() => setShowAlert(false)}
        />

        {/* Top 3 cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <SummaryCard
            icon={<FaWallet size={20} className="text-yellow-400" />}
            label="Wallet"
            amount="₹ 220.00"
          />
          <SummaryCard
            icon={<RiMoneyRupeeCircleLine size={20} className="text-yellow-400" />}
            label="Total Income"
            amount="₹ 7,209.00"
          />
          <SummaryCard
            icon={<MdOutlineAttachMoney size={20} className="text-yellow-400" />}
            label="Withdrawal"
            amount="₹ 800.00"
          />
        </div>

        {/* Middle: Left (BV cards) & Right (Profile) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Left: BV Cards + extras (span 2 columns on large) */}
          <div className="lg:col-span-2 space-y-4 order-2 lg:order-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <BVCard title="Direct BV" value="0.00" />
              <BVCard title="Team BV" value="6,950.00" />
            </div>

            {/* Additional BV-like small cards row — you can add/remove */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <SmallStat title="Carry Forward" value="0.00" />
              <SmallStat title="PW Community 1 PV" value="0.00" />
              <SmallStat title="PW Community 2 PV" value="0.00" />
            </div>
          </div>

          {/* Right: Profile summary */}
          <div className="order-1 lg:order-2">
            <ProfileCard
              name={user?.user_name || "UMA MOTHUKURI"}
              associateId={user?.user_id || "VI83647893"}
              signupDate="21 Aug 2025"
              activatedDate="--"
              lastPurchase="102"
              nextPurchase="99 (18 Sep 2025 - 24 Sep 2025)"
              rank="No Rank"
            />
          </div>
        </div>

        {/* Bottom: Chart with range tabs */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Orders</h3>

            <div className="flex gap-2">
              {(["daily", "weekly", "monthly", "yearly"] as RangeKey[]).map(
                (r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={`text-sm px-3 py-1 rounded-full font-medium ${
                      range === r
                        ? "bg-yellow-400 text-black shadow"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {r[0].toUpperCase() + r.slice(1)}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="w-full h-64">
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default DashboardPage;

/* ---------- Child components below ---------- */

const SummaryCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  amount: string;
}> = ({ icon, label, amount }) => {
  return (
    <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="bg-yellow-50 p-2 rounded-lg">{icon}</div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-xl font-bold text-black">{amount}</p>
        </div>
      </div>
      <div className="text-gray-300 text-xl">● ●</div>
    </div>
  );
};

const BVCard: React.FC<{ title: string; value: string }> = ({ title, value }) => (
  <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
    <p className="text-xs text-gray-500">{title}</p>
    <div className="flex items-end justify-between mt-2">
      <p className="text-2xl font-bold text-black">{value}</p>
      <div className="text-sm text-gray-400">PV</div>
    </div>
    <div className="mt-3 text-xs text-gray-500">Updated just now</div>
  </div>
);

const SmallStat: React.FC<{ title: string; value: string }> = ({ title, value }) => (
  <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 text-center">
    <p className="text-sm text-gray-600">{title}</p>
    <p className="mt-1 font-semibold text-black">{value}</p>
  </div>
);

const ProfileCard: React.FC<{
  name: string;
  associateId: string;
  signupDate?: string;
  activatedDate?: string;
  lastPurchase?: string;
  nextPurchase?: string;
  rank?: string;
}> = ({
  name,
  associateId,
  signupDate,
  activatedDate,
  lastPurchase,
  nextPurchase,
  rank,
}) => {
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
      <div className="flex gap-4 items-center">
        <div className="w-20 h-20 rounded-full border-4 border-yellow-400 flex items-center justify-center text-3xl font-bold text-gray-700">
          {name?.[0]?.toUpperCase() || "U"}
        </div>
        <div>
          <p className="text-lg font-semibold text-gray-900">{name}</p>
          <p className="text-sm text-gray-500">Associate ID: {associateId}</p>
          <div className="mt-2 inline-flex items-center gap-2">
            <span className="px-2 py-1 text-xs bg-gray-100 rounded text-gray-700">
              Rank: {rank}
            </span>
            <span className="px-2 py-1 text-xs bg-yellow-400 rounded text-black">
              Active
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-600 space-y-1">
        <div>
          <span className="font-medium">Signup:</span> {signupDate}
        </div>
        <div>
          <span className="font-medium">Activated:</span> {activatedDate}
        </div>
        <div>
          <span className="font-medium">Last Purchase:</span> {lastPurchase}
        </div>
        <div>
          <span className="font-medium">Next Purchase:</span> {nextPurchase}
        </div>
      </div>

      <div className="mt-4">
        <button
          className="w-full bg-black text-white py-2 rounded-lg font-semibold hover:opacity-95"
          onClick={() => {
            /* example action — replace with real route */
            console.log("View profile clicked");
          }}
        >
          View Profile
        </button>
      </div>
    </div>
  );
};
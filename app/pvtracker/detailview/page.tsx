"use client";
import React, { useEffect, useState } from "react";
import Layout from "@/layout/Layout";
import Loader from "@/components/common/loader";
import { useRouter, useSearchParams } from "next/navigation";
import { IoIosArrowBack } from "react-icons/io";
import axios from "axios";

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────

interface PvOrder {
  order_id:            string;
  pv:                  number;
  order_amount:        number;
  date:                string;
  time:                string;
  cumulative_pv_after: number;
  triggered_release:   boolean;
  pv_required_at_time: number;
}

interface PvMonth {
  month:            string;
  total_payout:     number;
  pv_required:      number;
  pv_fulfilled:     number;
  pv_remaining:     number;
  hold_released:    boolean;
  hold_released_at: string | null;
  crossed_1lakh_at: string | null;
  crossed_3lakh_at: string | null;
  pv_orders:        PvOrder[];
}

interface PvSummary {
  totalPvRequired:  number;
  totalPvFulfilled: number;
  totalPvRemaining: number;
  totalMonths:      number;
  pendingMonths:    number;
  clearedMonths:    number;
}

interface PvDetailData {
  user_id:   string;
  user_name: string;
  contact:   string;
  mail:      string;
  summary:   PvSummary;
  months:    PvMonth[];
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

const SummaryCard = ({
  label,
  value,
  color = "text-gray-800",
}: {
  label: string;
  value: string | number;
  color?: string;
}) => (
  <div className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
    <p className="text-xs text-gray-500 mb-1">{label}</p>
    <p className={`text-xl font-bold ${color}`}>{value}</p>
  </div>
);

const InfoRow = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <div className="flex justify-between items-center text-sm border-b last:border-b-0 py-2">
    <span className="text-gray-500">{label}</span>
    <span className="font-semibold text-gray-800">{value}</span>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────
// Month Card
// ─────────────────────────────────────────────────────────────────────────

const MonthCard = ({ month }: { month: PvMonth }) => {
  const [showOrders, setShowOrders] = useState(false);

  const progressPct =
    month.pv_required > 0
      ? Math.min(100, Math.round((month.pv_fulfilled / month.pv_required) * 100))
      : 100;

  const statusColor = month.hold_released
    ? "bg-green-100 text-green-700 border-green-300"
    : month.pv_required === 0
    ? "bg-gray-100 text-gray-600 border-gray-300"
    : "bg-red-100 text-red-700 border-red-300";

  const statusLabel = month.hold_released
    ? "✅ Cleared"
    : month.pv_required === 0
    ? "— No Obligation"
    : "⏳ Pending";

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b">
        <span className="font-semibold text-gray-800 text-sm">{month.month}</span>
        <span className={`text-xs font-medium px-3 py-1 rounded-full border ${statusColor}`}>
          {statusLabel}
        </span>
      </div>

      <div className="px-5 py-4 space-y-4">

        {/* ── PV Stats ── */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Required</p>
            <p className="text-base font-bold text-gray-700">{month.pv_required}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Fulfilled</p>
            <p className="text-base font-bold text-green-600">{month.pv_fulfilled}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Remaining</p>
            <p className={`text-base font-bold ${
              month.pv_remaining > 0 ? "text-red-500" : "text-green-600"
            }`}>
              {month.pv_remaining > 0 ? month.pv_remaining : "✅"}
            </p>
          </div>
        </div>

        {/* ── Progress Bar ── */}
        {month.pv_required > 0 && (
          <div>
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Progress</span>
              <span>{progressPct}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  progressPct === 100 ? "bg-green-500" : "bg-amber-400"
                }`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* ── Monthly Payout Total ── */}
        <div className="flex justify-between text-xs text-gray-500">
          <span>Monthly Payout Total</span>
          <span className="font-semibold text-gray-700">
            ₹ {month.total_payout.toLocaleString("en-IN")}
          </span>
        </div>

        {/* ── Threshold Timestamps ── */}
        {(month.crossed_1lakh_at || month.crossed_3lakh_at) && (
          <div className="space-y-1">
            {month.crossed_1lakh_at && (
              <div className="flex justify-between text-xs text-gray-400">
                <span>Crossed ₹1L at</span>
                <span>{new Date(month.crossed_1lakh_at).toLocaleString("en-IN")}</span>
              </div>
            )}
            {month.crossed_3lakh_at && (
              <div className="flex justify-between text-xs text-gray-400">
                <span>Crossed ₹3L at</span>
                <span>{new Date(month.crossed_3lakh_at).toLocaleString("en-IN")}</span>
              </div>
            )}
          </div>
        )}

        {/* ── Released At ── */}
        {month.hold_released && month.hold_released_at && (
          <div className="flex justify-between text-xs text-green-600">
            <span>Released at</span>
            <span>{new Date(month.hold_released_at).toLocaleString("en-IN")}</span>
          </div>
        )}

        {/* ── PV Orders Toggle ── */}
        {month.pv_orders.length > 0 && (
          <div>
            <button
              onClick={() => setShowOrders((p) => !p)}
              className="text-xs text-blue-600 underline hover:text-blue-800"
            >
              {showOrders
                ? "Hide PV Orders ▲"
                : `View ${month.pv_orders.length} PV Order(s) ▼`}
            </button>

            {showOrders && (
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600">
                      <th className="text-left px-2 py-1.5 border-b">Order ID</th>
                      <th className="text-center px-2 py-1.5 border-b">PV</th>
                      <th className="text-center px-2 py-1.5 border-b">Amount</th>
                      <th className="text-center px-2 py-1.5 border-b">Cumulative</th>
                      <th className="text-center px-2 py-1.5 border-b">Date</th>
                      <th className="text-center px-2 py-1.5 border-b">Released?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {month.pv_orders.map((o, i) => (
                      <tr
                        key={o.order_id}
                        className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        <td className="px-2 py-1.5 text-gray-600 font-mono">{o.order_id}</td>
                        <td className="px-2 py-1.5 text-center font-semibold text-blue-600">{o.pv}</td>
                        <td className="px-2 py-1.5 text-center text-gray-600">
                          ₹ {o.order_amount.toLocaleString("en-IN")}
                        </td>
                        <td className="px-2 py-1.5 text-center text-gray-600">
                          {o.cumulative_pv_after} PV
                        </td>
                        <td className="px-2 py-1.5 text-center text-gray-500">
                          {o.date} {o.time}
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          {o.triggered_release
                            ? <span className="text-green-600 font-semibold">✅ Yes</span>
                            : <span className="text-gray-400">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── No orders yet ── */}
        {month.pv_orders.length === 0 && month.pv_required > 0 && !month.hold_released && (
          <p className="text-xs text-red-400 italic">No PV orders placed yet</p>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────

export default function PvTrackerDetailPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const user_id      = searchParams.get("user_id");

  const [data,    setData]    = useState<PvDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!user_id) {
      setError("No user selected");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        setLoading(true);

        // ── Same API, pass user_id as param → detail response ──────
        const res = await axios.get("/api/pv-tracker", {
          params: { user_id },
        });

        if (res.data.success) {
          setData(res.data.data);
        } else {
          setError(res.data.message || "Failed to load data");
        }
      } catch (err) {
        console.error("PV detail fetch error:", err);
        setError("Failed to load PV tracker details");
      } finally {
        setLoading(false);
      }
    })();
  }, [user_id]);

  return (
    <Layout>
      <div className="max-md:px-4 px-6 py-4 w-full max-w-[99%] mx-auto">

        {/* ── Back ── */}
        <IoIosArrowBack
          size={25}
          color="black"
          className="cursor-pointer mb-4"
          onClick={() => router.push("/pvtracker")}
        />

        {/* ── Loading ── */}
        {loading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <Loader />
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div className="bg-red-50 border border-red-300 text-red-700 rounded-xl px-5 py-4 text-sm">
            {error}
          </div>
        )}

        {data && (
          <>
            {/* ── User Info ── */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-5 py-4 mb-6">
              <p className="text-xs text-gray-400 uppercase font-semibold mb-3">
                User Details
              </p>
              <InfoRow label="User ID"  value={data.user_id}   />
              <InfoRow label="Name"     value={data.user_name} />
              <InfoRow label="Contact"  value={data.contact}   />
              <InfoRow label="Email"    value={data.mail}      />
            </div>

            {/* ── Summary Cards ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
              <SummaryCard
                label="Total Required"
                value={`${data.summary.totalPvRequired} PV`}
              />
              <SummaryCard
                label="Total Fulfilled"
                value={`${data.summary.totalPvFulfilled} PV`}
                color="text-green-600"
              />
              <SummaryCard
                label="Total Remaining"
                value={
                  data.summary.totalPvRemaining > 0
                    ? `${data.summary.totalPvRemaining} PV`
                    : "✅ Clear"
                }
                color={
                  data.summary.totalPvRemaining > 0
                    ? "text-red-500"
                    : "text-green-600"
                }
              />
              <SummaryCard
                label="Total Months"
                value={data.summary.totalMonths}
              />
              <SummaryCard
                label="Pending Months"
                value={data.summary.pendingMonths}
                color={data.summary.pendingMonths > 0 ? "text-red-500" : "text-green-600"}
              />
              <SummaryCard
                label="Cleared Months"
                value={data.summary.clearedMonths}
                color="text-green-600"
              />
            </div>

            {/* ── Month Cards ── */}
            <p className="text-xs text-gray-400 uppercase font-semibold mb-3">
              Month-wise Breakdown
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {data.months.map((m) => (
                <MonthCard key={m.month} month={m} />
              ))}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
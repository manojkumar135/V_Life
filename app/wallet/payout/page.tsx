"use client";

import React, { useEffect, useState } from "react";
import Layout from "@/layout/Layout";
import { CalendarDays, CalendarRange } from "lucide-react";
import { useRouter } from "next/navigation";
import { IoIosArrowBack } from "react-icons/io";
import { FaGift } from "react-icons/fa6";
import { useVLife } from "@/store/context";
import AlertBox from "@/components/Alerts/advanceAlert";
import axios from "axios";

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────

interface PvMonthBreakdown {
  month:        string;
  pv_required:  number;
  pv_fulfilled: number;
  pv_remaining: number;
  cleared:      boolean;
}

interface PvAlertSummary {
  hasAlert:         boolean;
  totalPvRequired:  number;
  totalPvFulfilled: number;
  totalPvRemaining: number;
  months:           PvMonthBreakdown[];
  alertMessage:     string;
}

// ─────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────

const PayoutPage = () => {
  const router     = useRouter();
  const { user }   = useVLife();

  const [showPvAlert, setShowPvAlert] = useState(false);
  const [pvSummary,   setPvSummary]   = useState<PvAlertSummary | null>(null);

  // ── Fetch PV Alert ────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.user_id) return;

    let isMounted = true;

    (async () => {
      try {
        const res = await axios.get("/api/pv-alert", {
          params: { user_id: user.user_id },
        });

        if (!isMounted) return;

        if (res.data.success && res.data.data.hasAlert) {
          setPvSummary(res.data.data);
          setShowPvAlert(true);
        }
      } catch (err) {
        console.error("PV alert fetch error:", err);
      }
    })();

    return () => { isMounted = false; };
  }, [user?.user_id]);

  // ── Build alert message with month breakdown ──────────────────────────
  const pvAlertMessage = pvSummary ? (
    <>
      {pvSummary.alertMessage}
      <div className="mt-2 text-xs space-y-1">
        {pvSummary.months.map((m) => (
          <div key={m.month} className="flex justify-between gap-4">
            <span>{m.month}</span>
            <span>
              {m.cleared
                ? "✅ Cleared"
                : `${m.pv_remaining} PV remaining`}
            </span>
          </div>
        ))}
        <div className="flex justify-between gap-4 font-semibold border-t pt-1 mt-1">
          <span>Total Remaining</span>
          <span>{pvSummary.totalPvRemaining} PV</span>
        </div>
      </div>
    </>
  ) : null;

  return (
    <Layout>

      {/* ── PV Alert Box ── */}
      <AlertBox
        visible={showPvAlert}
        title="PV Order Required!"
        message={pvAlertMessage}
        buttonLabel="PLACE ORDER NOW"
        buttonAction={() => router.push("/orders/addorder")}
        onClose={() => setShowPvAlert(false)}
      />

      <div className="px-6 py-3">
        <IoIosArrowBack
          size={25}
          color="black"
          className="ml-0 mr-3 mt-1 max-sm:mt-0! max-sm:mr-1 cursor-pointer z-20 mb-3"
          onClick={() => router.push("/wallet")}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">

          {/* Daily Payout Card */}
          <div
            onClick={() => router.push("/wallet/payout/daily")}
            className="bg-gray-500 text-white rounded-md p-6 flex flex-col items-center justify-center hover:shadow-md transition cursor-pointer"
          >
            <CalendarDays size={32} />
            <span className="mt-2 text-lg font-semibold">Daily Payouts</span>
          </div>

          {/* Weekly Payout Card */}
          <div
            onClick={() => router.push("/wallet/payout/weekly")}
            className="bg-gray-500 text-white rounded-md p-6 flex flex-col items-center justify-center hover:shadow-md transition cursor-pointer"
          >
            <CalendarRange size={32} />
            <span className="mt-2 text-lg font-semibold">Fortnightly Payouts</span>
          </div>

          {/* Rewards Card */}
          {/* <div
            onClick={() => router.push("/wallet/payout/rewards")}
            className="bg-gray-500 text-white rounded-md p-6 flex flex-col items-center justify-center hover:shadow-md transition cursor-pointer"
          >
            <FaGift size={32} />
            <span className="mt-2 text-lg font-semibold">Rewards</span>
          </div> */}

        </div>
      </div>
    </Layout>
  );
};

export default PayoutPage;
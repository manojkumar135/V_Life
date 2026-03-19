"use client";

import React, { useEffect, useState } from "react";
import Layout from "@/layout/Layout";
import { Wallet, Banknote, Shuffle } from "lucide-react";
import { useRouter } from "next/navigation";
import { FaGift } from "react-icons/fa6";
import { VscGraph } from "react-icons/vsc";
import { useVLife } from "@/store/context";
import { FaPercent } from "react-icons/fa";
import { MdOutlineVerifiedUser } from "react-icons/md";
import { FaCrown } from "react-icons/fa";
import { FaRegUserCircle } from "react-icons/fa";
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

const page = () => {
  const router   = useRouter();
  const { user } = useVLife();

  // ── PV Alert ──────────────────────────────────────────────────────────
  const [showPvAlert, setShowPvAlert] = useState(false);
  const [pvSummary,   setPvSummary]   = useState<PvAlertSummary | null>(null);

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

  // ── PV Alert message ──────────────────────────────────────────────────
  const pvAlertMessage = pvSummary ? (
    <>
      {pvSummary.alertMessage}
      <div className="mt-2 text-xs space-y-1">
        {pvSummary.months.map((m) => (
          <div key={m.month} className="flex justify-between gap-4">
            <span>{m.month}</span>
            <span>
              {m.cleared ? "✅ Cleared" : `${m.pv_remaining} PV remaining`}
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

      {/* ── PV Alert ── */}
      <AlertBox
        visible={showPvAlert}
        title="PV Order Required!"
        message={pvAlertMessage}
        buttonLabel="PLACE ORDER NOW"
        buttonAction={() => router.push("/orders/addorder")}
        onClose={() => setShowPvAlert(false)}
      />

      <div className="px-6 py-3">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">

          {/* Wallets Card */}
          <div
            onClick={() => router.push("/wallet/walletpage")}
            className="bg-linear-to-br from-[#106187] via-[#106187]  to-[#339AB5] text-white rounded-md p-6 flex flex-col items-center justify-center hover:shadow-md transition cursor-pointer"
          >
            <Wallet size={32} />
            <span className="mt-2 text-lg font-semibold">
              {user.role === "admin" ? "KYC" : "KYC"}
            </span>
          </div>

          {/* Withdraw Card */}
          <div
            onClick={() => router.push("/wallet/payout")}
            className="bg-linear-to-br from-[#106187] via-[#106187]  to-[#339AB5] text-white rounded-md p-6 flex flex-col items-center justify-center hover:shadow-md transition cursor-pointer"
          >
            <Banknote size={32} />
            <span className="mt-2 text-lg font-semibold">Payouts</span>
          </div>

          {/* TDS Table */}
          {user.role === "admin" && (
            <div
              onClick={() => router.push("/tds")}
              className="bg-linear-to-br from-[#106187] via-[#106187]  to-[#339AB5] text-white rounded-md p-6 flex flex-col items-center justify-center hover:shadow-md transition cursor-pointer"
            >
              <FaPercent size={26} />
              <span className="mt-2 text-lg font-semibold">TDS Table</span>
            </div>
          )}

          {/* Rewards Card */}
          <div
            onClick={() => router.push("/wallet/rewards")}
            className="bg-linear-to-br from-[#106187] via-[#106187]  to-[#339AB5] text-white rounded-md p-6 flex flex-col items-center justify-center hover:shadow-md transition cursor-pointer"
          >
            <FaGift size={32} />
            <span className="mt-2 text-lg font-semibold">Rewards</span>
          </div>

          {/* Reports Card */}
          {/* <div
            onClick={() => router.push("/reports")}
            className="bg-linear-to-br from-[#106187] via-[#106187]  to-[#339AB5] text-white rounded-md p-6 flex flex-col items-center justify-center hover:shadow-md transition cursor-pointer"
          >
            <VscGraph size={32} />
            <span className="mt-2 text-lg font-semibold">Reports</span>
          </div> */}

          {/* ID activation */}
          {/* {user.status!=="inactive" &&(<div
            onClick={() => router.push("/activation/activationform")}
            className="bg-linear-to-br from-[#106187] via-[#106187]  to-[#339AB5] text-white rounded-md p-6 flex flex-col items-center justify-center hover:shadow-md transition cursor-pointer"
          >
            <MdOutlineVerifiedUser  size={32} />
            <span className="mt-2 text-lg font-semibold">Activation</span>
          </div>)} */}

          {/* Royal Club */}
          {/* <div
            onClick={() => router.push("/reports")}
            className="bg-linear-to-br from-[#106187] via-[#106187]  to-[#339AB5] text-white rounded-md p-6 flex flex-col items-center justify-center hover:shadow-md transition cursor-pointer"
          >
            <FaCrown  size={32} />
            <span className="mt-2 text-lg font-semibold">Royality Club</span>
          </div> */}

          {/* Profile Management */}
          {user.role === "admin" && (
            <div
              onClick={() => router.push("/profileedit")}
              className="bg-linear-to-br from-[#106187] via-[#106187]  to-[#339AB5] text-white rounded-md p-6 flex flex-col items-center justify-center hover:shadow-md transition cursor-pointer"
            >
              <FaRegUserCircle size={32} />
              <span className="mt-2 text-lg font-semibold">Profile Management</span>
            </div>
          )}

          {/* Convert Card */}
          {/* <div className="bg-linear-to-br from-[#106187] via-[#106187]  to-[#339AB5] text-white rounded-md p-6 flex flex-col items-center justify-center hover:shadow-md transition cursor-pointer">
            <Shuffle size={32} />
            <span className="mt-2 text-lg font-semibold">Convert</span>
          </div> */}

        </div>
      </div>
    </Layout>
  );
};

export default page;
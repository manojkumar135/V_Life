"use client";
import React, { useState } from "react";
import Layout from "@/layout/Layout";
import { useRouter } from "next/navigation";
import ShowToast from "@/components/common/Toast/toast";
import { IoIosArrowBack } from "react-icons/io";
import CryptoJS from "crypto-js";
import { useVLife } from "@/store/context";
import PaymentModal from "@/components/common/PaymentModal/paymentmodal";
import axios from "axios";
import Loader from "@/components/common/loader";
import { formatDate } from "@/components/common/formatDate";

const SECRET_KEY = process.env.NEXT_PUBLIC_REF_KEY || "";
const ADVANCE_AMOUNT = 15000;

export default function ActivateAccountPage() {
  const router = useRouter();
  const { user } = useVLife();

  const [mode100, setMode100] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [loading, setLoading] = useState(false);

  /* ---------------------------
     TEXT CONTENT
  ----------------------------*/
  const normalText = `To activate your account, please place an order by choosing one of
the available activation packages below. Once the order is successfully placed,
your account will be activated automatically and you will gain full access to all features.`;

  const textFor100PV = `You can activate your account by either placing a 100 PV order
or by paying an advance amount for the ionizer. If you choose to pay the advance,
the amount will be adjusted in your first order.`;

  /* ---------------------------
     ORDER HANDLER
  ----------------------------*/
  const handleOrder = (pv: number) => {
    if (!user?.user_id) {
      ShowToast.error("User not logged in");
      return;
    }

    if (pv === 100) {
      setMode100(true); // switch only content + buttons
      return;
    }

    placeOrder(pv);
  };

  const placeOrder = (pv: number) => {
    const payload = {
      order_mode: "SELF",
      pv,
      beneficiary_id: user!.user_id,
      placed_by: user!.user_id,
      source: "self_activation",
      timestamp: Date.now(),
    };

    const encrypted = CryptoJS.AES.encrypt(
      JSON.stringify(payload),
      SECRET_KEY,
    ).toString();

    router.push(`/orders/addorder?data=${encodeURIComponent(encrypted)}`);
  };

  const onCancel = () => {
    if (mode100) {
      setMode100(false); // revert text + buttons
    } else {
      router.push("/historys");
    }
  };

  return (
    <Layout>
      {/* Loader */}
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <Loader />
        </div>
      )}

      <div className="relative">
        {/* Back */}
        <div
          className="absolute -top-5 left-8 max-md:top-3 max-md:left-4
          flex items-center gap-2 cursor-pointer z-30"
          onClick={() => router.back()}
        >
          <IoIosArrowBack size={28} className="text-black" />
          <p className="font-semibold text-black hidden lg:block">Back</p>
        </div>

        {/* CARD */}
        <div className="max-w-2xl mx-auto p-6 max-md:p-4 max-lg:mx-4 mt-10 bg-white shadow-lg rounded-xl border border-gray-300">
          <h1 className="text-2xl font-bold text-gray-800 mb-3 text-center">
            Activate Your Account
          </h1>

          <p className="text-gray-600 text-sm mb-2 text-center">
            Your Account is currently inactive.
          </p>

          {/* 🔁 TEXT CHANGES ONLY */}
          <p className="text-gray-600 text-sm mb-4 px-4 max-lg:px-1">
            {mode100 ? textFor100PV : normalText}
          </p>

          {/* 🔁 BUTTONS CHANGE ONLY */}
          <div className="flex flex-col gap-4 lg:flex-row">
            {!mode100 ? (
              <>
                <button
                  onClick={() => handleOrder(50)}
                  className="flex-1 cursor-pointer bg-gradient-to-r from-[#0C3978] via-[#106187] to-[#16B8E4]
                  text-white font-semibold py-3 rounded-lg"
                >
                  Order 50 PV
                </button>

                <button
                  onClick={() => handleOrder(100)}
                  className="flex-1 cursor-pointer bg-gradient-to-r from-[#0C3978] via-[#106187] to-[#16B8E4]
                  text-white font-semibold py-3 rounded-lg"
                >
                  Order 100 PV
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => placeOrder(100)}
                  className="flex-1 cursor-pointer bg-gradient-to-r from-[#0C3978] via-[#106187] to-[#16B8E4]
                  text-white font-semibold py-3 rounded-lg"
                >
                  Place Order (100 PV)
                </button>

                <button
                  onClick={() => setShowPayment(true)}
                  className="cursor-pointer flex-1
  bg-gradient-to-r from-[#0E8A3A] via-[#16A34A] to-[#22C55E]
  text-white font-semibold py-3 rounded-lg"
                >
                  Pay Advance ₹{ADVANCE_AMOUNT.toLocaleString()}
                </button>
              </>
            )}

            <button
              onClick={onCancel}
              className="flex-1 cursor-pointer bg-gray-200 hover:bg-gray-300
              text-gray-700 font-medium py-3 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Razorpay */}
      {showPayment && (
        <PaymentModal
          amount={ADVANCE_AMOUNT}
          user={{
            name: user?.user_name,
            email: user?.mail,
            contact: user?.contact,
          }}
          onSuccess={async (res) => {
  try {
    setLoading(true);

    await axios.post("/api/history-operations", {
      transaction_id: res.razorpay_payment_id,
      wallet_id: user?.wallet_id || "",
      user_id: user?.user_id,
      user_name: user?.user_name,
      rank: user?.rank,

      account_holder_name: user?.user_name,
      bank_name: "Razorpay",
      account_number: "N/A",
      ifsc_code: "N/A",

      date: formatDate(new Date()),
      time: new Date().toLocaleTimeString(),
      available_balance: 0,
      amount: ADVANCE_AMOUNT,
      advance: true,
      source: "advance",
      transaction_type: "Debit",
      details: "Advance Payment for Account Activation",
      status: "Completed",

      created_by: user?.user_id,
    });

    ShowToast.success("Advance payment successful!");
    router.push("/orders");
  } catch (error) {
    console.error("History save error:", error);
    ShowToast.error("Payment successful, but failed to save history");
  } finally {
    setLoading(false);
    setShowPayment(false);
  }
}}

          onClose={() => setShowPayment(false)}
        />
      )}
    </Layout>
  );
}

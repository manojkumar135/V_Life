"use client";
import React, { useState } from "react";
import Layout from "@/layout/Layout";
import { useRouter } from "next/navigation";
import axios from "axios";
import ShowToast from "@/components/common/Toast/toast";
import Loader from "@/components/common/loader";
import { useVLife } from "@/store/context";
import PaymentModal from "@/components/common/PaymentModal/paymentmodal";
import { formatDate } from "@/components/common/formatDate";

export default function PayAdvancePage() {
  const { user } = useVLife();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  // console.log(user,"advance")

  const ADVANCE_AMOUNT = 10000;

  const handlePayNow = () => {
    if (!user?.user_id) {
      ShowToast.error("User not found");
      return;
    }
    setShowPayment(true); // open Razorpay modal
  };

  const onBack = () => {
    router.push("/historys");
  };

  return (
    <Layout>
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <Loader />
        </div>
      )}

      <div className="max-w-xl mx-auto p-6 mt-5 bg-white shadow-lg rounded-xl">
        <h1 className="text-2xl font-bold text-gray-800 mb-4 text-center">
          Activate Your Account
        </h1>
        <p className="text-gray-600 text-sm mb-4 text-center">
          To activate your account, you need to pay{" "}
          <span className="font-semibold text-green-700">
            ₹{ADVANCE_AMOUNT.toLocaleString()}
          </span>{" "}
          as a prepaid amount.
        </p>
        <p className="text-gray-600 text-sm mb-6 text-center">
          This amount will be <strong>adjusted in your first order</strong>.
          Example: If your first order is{" "}
          <span className="font-semibold">₹15,000</span>, then the prepaid{" "}
          <span className="font-semibold">₹10,000</span> will be deducted, and
          you only pay <span className="font-semibold">₹5,000</span>.
        </p>

        <div className="flex justify-center gap-4">
          <button
            onClick={onBack}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-6 rounded-lg cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handlePayNow}
            className="bg-yellow-400 hover:bg-yellow-300 text-black font-semibold py-2 px-6 rounded-lg transition-colors duration-200 cursor-pointer"
          >
            Pay ₹{ADVANCE_AMOUNT.toLocaleString()}
          </button>
        </div>
      </div>

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

              // save history record
              await axios.post("/api/history-operations", {
                transaction_id: res.razorpay_payment_id,
                wallet_id: user?.wallet_id || "",
                user_id: user?.user_id,
                user_name: user?.user_name,
                account_holder_name: user?.user_name,
                bank_name: "Razorpay",
                account_number: "N/A",
                ifsc_code: "N/A",
                date: formatDate(new Date()), // Or get from Razorpay if available
                time: new Date().toLocaleTimeString(), // store human-readable
                available_balance: 0,
                amount: ADVANCE_AMOUNT,
                transaction_type: "Debit",
                details: "Advance Payment for Account Activation",
                status: "Completed",
                created_by: user?.user_id,
              });

              ShowToast.success("Advance payment successful!");
              router.push("/historys");
            } catch (error: any) {
              console.error("Error saving history:", error);
              ShowToast.error("Payment success but failed to save history!");
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

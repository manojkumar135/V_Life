"use client";
import React, { useState } from "react";
import Layout from "@/layout/Layout";
import { useRouter } from "next/navigation";
import axios from "axios";
import ShowToast from "@/components/common/Toast/toast";
import Loader from "@/components/common/loader";
import { useVLife } from "@/store/context";

export default function PayAdvancePage() {
  const { user } = useVLife();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const ADVANCE_AMOUNT = 10000;

  const handlePayment = async () => {
    if (!user?.user_id) {
      ShowToast.error("User not found");
      return;
    }

    try {
      setLoading(true);

      // 📌 Call backend to create Razorpay/Stripe/Custom transaction
      const { data } = await axios.post("/api/payout/payAdvance", {
        user_id: user.user_id,
        amount: ADVANCE_AMOUNT,
      });

      if (data.success) {
        ShowToast.success("Advance payment successful!");
        router.push("/wallet"); // redirect to wallet/dashboard
      } else {
        ShowToast.error(data.message || "Payment failed");
      }
    } catch (error: any) {
      console.error("Error processing payment:", error);
      ShowToast.error("Payment failed");
    } finally {
      setLoading(false);
    }
  };

  const onBack = () => {
    router.push("/wallet/payout");
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
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-6 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handlePayment}
            className="bg-yellow-400 hover:bg-yellow-300 text-black font-semibold py-2 px-6 rounded-lg transition-colors duration-200"
          >
            Pay ₹{ADVANCE_AMOUNT.toLocaleString()}
          </button>
        </div>
      </div>
    </Layout>
  );
}

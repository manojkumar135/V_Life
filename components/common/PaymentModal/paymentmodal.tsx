"use client";

import React, { useEffect } from "react";
import axios from "axios";
import Loader from "@/components/common/loader";

interface PaymentModalProps {
  amount: number; // amount in rupees
  user?: {
    name: string;
    email: string;
    contact: string;
  };
  onSuccess: (response: any) => void;
  onClose: () => void;
}

export default function PaymentModal({
  amount,
  user,
  onSuccess,
  onClose,
}: PaymentModalProps) {
  // Load Razorpay script once
  useEffect(() => {
    if (!document.getElementById("razorpay-script")) {
      const script = document.createElement("script");
      script.id = "razorpay-script";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Trigger Razorpay on mount
  useEffect(() => {
    const startPayment = async () => {
      try {
        const res = await axios.post("/api/payment-operations", { amount });

        const order = res.data.order || res.data;
        if (!order || !order.amount) {
          throw new Error("Invalid Razorpay order response");
        }

        const options: any = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount: order.amount, // in paise
          currency: order.currency,
          name: "V Life Global",
          description: "Payment Transaction",
          order_id: order.id,
          handler: async (response: any) => {
            try {
              const verifyRes = await axios.post(
                "/api/payment-verify-operations",
                {
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature,
                }
              );

              if (verifyRes.data.success) {
                onSuccess(response);
              } else {
                console.error("❌ Payment verification failed");
              }
            } catch (err) {
              console.error("❌ Payment verification error", err);
            } finally {
              onClose();
            }
          },
          prefill: {
            name: user?.name || "Guest",
            email: user?.email || "guest@example.com",
            contact: user?.contact || "9999999999",
          },
          theme: { color: "#facc15" },
          modal: { ondismiss: () => onClose() },
        };

        const rzp1 = new (window as any).Razorpay(options);
        rzp1.open();
      } catch (err) {
        console.error("Error creating Razorpay order:", err);
        onClose();
      }
    };

    startPayment();
  }, [amount, user, onSuccess, onClose]);

  return (
    <div className="fixed inset-0 z-80 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <Loader />
    </div>
  );
}

"use client";

import React, { useEffect } from "react";
import axios from "axios";

interface PaymentModalProps {
  amount: number;
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
  // Load Razorpay script
  useEffect(() => {
    if (!document.getElementById("razorpay-script")) {
      const script = document.createElement("script");
      script.id = "razorpay-script";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Trigger Razorpay
  useEffect(() => {
    const startPayment = async () => {
      try {
        const res = await axios.post("/api/payment-operations", { amount });
        const { order } = res.data;

        const options: any = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount: order.amount,
          currency: order.currency,
          name: "V Life Global",
          description: "Payment Transaction",
          order_id: order.id,
          handler: async (response: any) => {
            try {
              const verifyRes = await axios.post("/api/payment-verify-operations", {
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              });

              console.log(verifyRes)
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
          modal: {
            ondismiss: () => onClose(), // ✅ navigate to /ordersummary on close
          },
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

  return null;
}

"use client";

import React, { useEffect, useRef } from "react";
import axios from "axios";
import Loader from "@/components/common/loader";

interface PaymentModalProps {
  amount: number; // RUPEES
  user?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  onSuccess: (response: any) => Promise<void> | void;
  onClose: () => void;
}

/**
 * Load Razorpay SDK safely and wait until it's ready
 */
const loadRazorpayScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if ((window as any).Razorpay) {
      resolve();
      return;
    }

    const existing = document.getElementById("razorpay-script") as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject());
      return;
    }

    const script = document.createElement("script");
    script.id = "razorpay-script";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject();
    document.body.appendChild(script);
  });
};

export default function PaymentModal({
  amount,
  user,
  onSuccess,
  onClose,
}: PaymentModalProps) {
  const openedRef = useRef(false);
  const handledRef = useRef(false);

  useEffect(() => {
    if (openedRef.current) return;
    openedRef.current = true;

    const startPayment = async () => {
      try {
        if (!amount || amount <= 0) {
          onClose();
          return;
        }

        // ✅ RUPEES → PAISE (ONLY HERE)
        const amountInPaise = Math.round(amount * 100);

        // Load Razorpay SDK
        await loadRazorpayScript();

        if (!(window as any).Razorpay) {
          throw new Error("Razorpay SDK not available");
        }

        // Create Razorpay order (PAISE)
        const res = await axios.post("/api/payment-operations", {
          amount: amountInPaise,
        });

        const order = res.data?.order;
        if (!order?.id) {
          throw new Error("Invalid Razorpay order response");
        }

        const options: any = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          order_id: order.id,
          amount: order.amount, // PAISE
          currency: "INR",
          name: "Maverick",
          description: "Order Payment",

          handler: async (response: any) => {
            if (handledRef.current) return;
            handledRef.current = true;

            try {
              const verifyRes = await axios.post(
                "/api/payment-verify-operations",
                {
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature,
                }
              );

              if (!verifyRes.data?.success) {
                throw new Error("Payment verification failed");
              }

              await onSuccess(response);
            } catch (err) {
              console.error("Payment verification error:", err);
            } finally {
              onClose();
            }
          },

          modal: {
            ondismiss: () => {
              if (handledRef.current) return;
              handledRef.current = true;
              onClose();
            },
          },

          prefill: {
            name: user?.name || "",
            email: user?.email || "",
            contact: user?.contact || "",
          },

          theme: {
            color: "#0C3978",
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } catch (err) {
        console.error("Error creating Razorpay order:", err);
        onClose();
      }
    };

    startPayment();
  }, [amount]);

  return (
    <div className="fixed inset-0 z-80 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <Loader />
    </div>
  );
}

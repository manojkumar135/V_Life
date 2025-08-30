"use client";

import React, { useState } from "react";
import { IoClose, IoQrCodeOutline, IoWalletOutline, IoCardOutline } from "react-icons/io5";
import SubmitButton from "@/components/common/submitbutton";

type PaymentMethod = "qr" | "upi" | "card";

interface PaymentModalProps {
  getTotalPrice: () => number;
  handleSubmit: (e: React.FormEvent) => void;
  setShowPayment: (show: boolean) => void;
}

export default function PaymentModal({
  getTotalPrice,
  handleSubmit,
  setShowPayment,
}: PaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("qr");
  const [paymentDetails, setPaymentDetails] = useState({
    upiId: "",
    cardNumber: "",
    expiryDate: "",
    cvv: "",
  });

  const handlePaymentInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPaymentDetails((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-5 w-full max-w-md h-[560px] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Complete Payment</h2>
          <button
            onClick={() => setShowPayment(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            <IoClose size={24} />
          </button>
        </div>

        {/* Amount */}
        <p className="text-gray-600 mb-4">
          Amount to Pay:{" "}
          <span className="font-bold">₹ {getTotalPrice().toFixed(2)}</span>
        </p>

        {/* Payment Options */}
        <div className="mb-4">
          <h3 className="font-medium mb-2">Select Payment Method</h3>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              className={`flex flex-col items-center justify-center p-3 border rounded-lg ${
                paymentMethod === "qr"
                  ? "border-blue-600 bg-blue-50"
                  : "border-gray-300 hover:bg-gray-100"
              }`}
              onClick={() => setPaymentMethod("qr")}
            >
              <IoQrCodeOutline size={24} />
              <span className="text-sm mt-1">QR Code</span>
            </button>

            <button
              type="button"
              className={`flex flex-col items-center justify-center p-3 border rounded-lg ${
                paymentMethod === "upi"
                  ? "border-blue-600 bg-blue-50"
                  : "border-gray-300 hover:bg-gray-100"
              }`}
              onClick={() => setPaymentMethod("upi")}
            >
              <IoWalletOutline size={24} />
              <span className="text-sm mt-1">UPI</span>
            </button>

            <button
              type="button"
              className={`flex flex-col items-center justify-center p-3 border rounded-lg ${
                paymentMethod === "card"
                  ? "border-blue-600 bg-blue-50"
                  : "border-gray-300 hover:bg-gray-100"
              }`}
              onClick={() => setPaymentMethod("card")}
            >
              <IoCardOutline size={24} />
              <span className="text-sm mt-1">Card</span>
            </button>
          </div>
        </div>

        {/* Payment Form (scrollable) */}
        <div className="flex-1 overflow-y-auto">
          {paymentMethod === "qr" && (
            <div className="flex flex-col items-center">
              <div className="w-48 h-48 bg-gray-100 flex items-center justify-center rounded-lg border">
                <IoQrCodeOutline size={120} className="text-gray-600" />
              </div>
              <p className="mt-3 text-sm text-gray-600 text-center">
                Scan this QR code using your UPI app to complete the payment
              </p>
            </div>
          )}

          {paymentMethod === "upi" && (
            <div className="space-y-3">
              <input
                type="text"
                name="upiId"
                placeholder="Enter UPI ID (e.g. name@upi)"
                value={paymentDetails.upiId}
                onChange={handlePaymentInputChange}
                className="w-full border px-3 py-2 rounded-lg focus:ring focus:ring-blue-300"
              />
              <p className="text-xs text-gray-500">
                We'll send a payment request to this UPI ID
              </p>
            </div>
          )}

          {paymentMethod === "card" && (
            <div className="space-y-3">
              <input
                type="text"
                name="cardNumber"
                placeholder="Card Number"
                value={paymentDetails.cardNumber}
                onChange={handlePaymentInputChange}
                className="w-full border px-3 py-2 rounded-lg"
              />
              <div className="flex space-x-3">
                <input
                  type="text"
                  name="expiryDate"
                  placeholder="MM/YY"
                  value={paymentDetails.expiryDate}
                  onChange={handlePaymentInputChange}
                  className="w-1/2 border px-3 py-2 rounded-lg"
                />
                <input
                  type="text"
                  name="cvv"
                  placeholder="CVV"
                  value={paymentDetails.cvv}
                  onChange={handlePaymentInputChange}
                  className="w-1/2 border px-3 py-2 rounded-lg"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <SubmitButton
          type="button"
          onClick={(e) => handleSubmit(e as any)}
          className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-md"
        >
          Pay Now
        </SubmitButton>
      </div>
    </div>
  );
}

"use client";

import React, { useState, ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { IoIosArrowBack } from "react-icons/io";
import Layout from "@/layout/Layout";
import InputField from "@/components/InputFields/inputtype1";
import SubmitButton from "@/components/common/submitbutton";
import axios from "axios";
import ShowToast from "@/components/common/Toast/toast";

interface WithdrawFormData {
  walletId: string;
  availableBalance: string;
  withdrawAmount: string;
  otp: string;
}

export default function MakeNewWithdrawalForm() {
  const router = useRouter();

  const [formData, setFormData] = useState<WithdrawFormData>({
    walletId: "", // Default or fetched value
    availableBalance: "1000.00", // Default or fetched value
    withdrawAmount: "",
    otp: "",
  });

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleVerifyOtp = () => {
    // TODO: Implement real OTP verification
    ShowToast.success("OTP verified successfully!");
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Example validation
    if (parseFloat(formData.withdrawAmount) < 500) {
      ShowToast.error("Minimum ₹ 500.00 can be withdrawn");
      return;
    }

    try {
      const payload = {
        wallet_id: formData.walletId,
        available_balance: parseFloat(formData.availableBalance),
        withdraw_amount: parseFloat(formData.withdrawAmount),
        otp: formData.otp,
        created_by: "admin", // Or current logged-in user
        // Dummy required values (replace with actual)
        user_id: "DUMMY_USER_ID_12345",
        user_name: "Hello",
        withdraw_id: "DUMMY_WITHDRAW_ID_54321",
        date: new Date(),
        withdraw_status: "Pending",
      };

      const res = await axios.post("/api/withdraw-operations", payload);

      if (res.data.success) {
        ShowToast.success("Withdrawal request submitted!");
        router.push("/wallet/withdraw");
      } else {
        ShowToast.error(res.data.message || "Failed to submit withdrawal");
      }
    } catch (error) {
      console.error(error);
      ShowToast.error("Something went wrong while making withdrawal");
    }
  };

  return (
    <Layout>
      <div className="p-4 max-md:p-2">
        {/* Header */}
        <div className="flex items-center mb-6 max-md:mb-2">
          <IoIosArrowBack
            size={25}
            className="mr-2 cursor-pointer"
            onClick={() => router.push("/wallet/withdraw")}
          />
          <p className="text-xl max-md:text-[1rem] font-semibold">
            Make New Withdrawal
          </p>
        </div>

        {/* Form */}
        <div className="rounded-xl px-6 max-md:p-4 bg-white">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <InputField
                label="Wallet ID"
                name="walletId"
                value={formData.walletId}
                onChange={handleInputChange}
              />
              <InputField
                label="Available Balance"
                name="availableBalance"
                value={formData.availableBalance}
                onChange={handleInputChange}
                readOnly
                prefix="₹"
              />
              <InputField
                label="Withdraw Amount"
                name="withdrawAmount"
                value={formData.withdrawAmount}
                onChange={handleInputChange}
                prefix="₹"
              />

              {/* OTP Field */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="otp"
                  className="text-[0.9rem] max-md:text-[0.8rem] font-semibold text-gray-700"
                >
                  Enter OTP
                </label>
                <div className="flex items-center gap-2 border border-gray-500 rounded-lg bg-white px-3 py-2">
                  <input
                    id="otp"
                    name="otp"
                    type="text"
                    placeholder="X X X X X X"
                    value={formData.otp}
                    onChange={handleInputChange}
                    className="flex-1 text-sm text-gray-800 placeholder-gray-400 outline-none bg-transparent"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    className="text-green-600 font-semibold text-sm hover:underline"
                  >
                    Verify
                  </button>
                </div>
              </div>
            </div>

            {/* Summary */}
            {formData.withdrawAmount && (
              <div className="flex justify-end mt-2 text-sm font-medium">
                Make New Withdrawal:{" "}
                <span className="font-bold ml-1 text-black">
                  ₹ {formData.withdrawAmount}
                </span>
              </div>
            )}

            {/* Submit */}
            <div className="flex justify-end mt-4">
              <SubmitButton type="submit">Withdraw</SubmitButton>
            </div>

            {/* Note */}
            <p className="text-xs text-gray-600 mt-2">
              <span className="font-semibold">Note:</span> Minimum ₹ 500.00 can
              be withdrawn
            </p>
          </form>
        </div>
      </div>
    </Layout>
  );
}
5
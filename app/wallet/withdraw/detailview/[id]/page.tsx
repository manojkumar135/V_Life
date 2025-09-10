"use client";

import React, { useState, ChangeEvent, useEffect, FormEvent } from "react";
import Layout from "@/layout/Layout";
import { IoIosArrowBack } from "react-icons/io";
import { useRouter, useParams } from "next/navigation";
import InputField from "@/components/InputFields/inputtype1";
import SubmitButton from "@/components/common/submitbutton";
import axios from "axios";
import ShowToast from "@/components/common/Toast/toast";

interface WithdrawFormData {
  withdrawId: string;
  walletId: string;
  availableBalance: string;
  withdrawAddress: string;
  date: string;
  withdrawAmount: string;
  status: string;
  otp: string;
}

export default function EditWithdrawPage() {
  const router = useRouter();
  const params = useParams();
  const withdrawId = params?.id as string;

  const [formData, setFormData] = useState<WithdrawFormData>({
    withdrawId: "",
    walletId: "",
    availableBalance: "",
    withdrawAddress: "",
    date: "",
    withdrawAmount: "",
    status: "",
    otp: "",
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!withdrawId) return;

    const fetchWithdraw = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(
          `/api/withdraw-operations?withdraw_id=${withdrawId}`
        );

        if (data?.data) {
          const w = data.data;
          setFormData({
            withdrawId: w.withdraw_id || "",
            walletId: w.wallet_id || "",
            availableBalance: w.available_balance || "", // Add this if backend sends it
            withdrawAddress: w.user_id || "",
            date: w.date || "",
            withdrawAmount: w.withdraw_amount || "",
            status: w.withdraw_status || "",
            otp: "",
          });
        } else {
          ShowToast.error("Withdrawal not found.");
        }
      } catch (error) {
        console.error("Error fetching withdrawal:", error);
        ShowToast.error("Failed to fetch withdrawal details.");
      } finally {
        setLoading(false);
      }
    };

    fetchWithdraw();
  }, [withdrawId]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleVerifyOtp = () => {
    // Your OTP verification logic
    ShowToast.success("OTP verified successfully!");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload = {
        withdraw_id: formData.withdrawId,
        wallet_id: formData.walletId,
        available_balance: formData.availableBalance,
        user_id: formData.withdrawAddress,
        date: formData.date,
        withdraw_amount: formData.withdrawAmount,
        otp: formData.otp,
        last_modified_by: "admin",
      };

      const res = await axios.patch(
        `/api/withdraw-operations?withdraw_id=${withdrawId}`,
        payload
      );

      if (res.data.success) {
        ShowToast.success("Withdrawal updated successfully!");
        router.push("/wallet/withdraw");
      } else {
        ShowToast.error(res.data.message || "Failed to update withdrawal.");
      }
    } catch (error) {
      console.error("Error updating withdrawal:", error);
      ShowToast.error("Failed to update withdrawal.");
    } finally {
      setLoading(false);
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
            Withdrawal DetailView
          </p>
        </div>

        {/* Form */}
        <div className="rounded-xl px-6 max-md:p-4 bg-white">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <InputField
                label="Transaction ID"
                name="withdrawId"
                value={formData.withdrawId}
                // onChange={handleInputChange}
                readOnly
                disabled
              />
              <InputField
                label="Wallet ID"
                name="walletId"
                value={formData.walletId}
                // onChange={handleInputChange}
                readOnly
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
                label="Withdraw Address"
                name="withdrawAddress"
                value={formData.withdrawAddress}
                onChange={handleInputChange}
              />
              <InputField
                label="Date"
                name="date"
                type="date"
                value={formData.date}
                onChange={handleInputChange}
              />
              <InputField
                label="Withdraw Amount"
                name="withdrawAmount"
                prefix="₹"
                value={formData.withdrawAmount}
                onChange={handleInputChange}
              />
              <InputField
                label="Status"
                name="status"
                value={formData.status}
                onChange={handleInputChange}
              />

              {/* OTP Field */}
              {/* <div className="flex flex-col gap-1">
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
              </div> */}
            </div>

            {/* Summary */}
            {/* {formData.withdrawAmount && (
              <div className="flex justify-end mt-2 text-sm font-medium">
                Make Withdrawal:{" "}
                <span className="font-bold ml-1 text-black">
                  ₹ {formData.withdrawAmount}
                </span>
              </div>
            )} */}

            {/* Submit */}
            {/* <div className="flex justify-end mt-4">
              <SubmitButton type="submit">
                {loading ? "Updating..." : "UPDATE"}
              </SubmitButton>
            </div> */}

            {/* Note */}
            {/* <p className="text-xs text-gray-600 mt-2">
              <span className="font-semibold">Note:</span> Minimum ₹ 500.00 can
              be withdrawn
            </p> */}
          </form>
        </div>
      </div>
    </Layout>
  );
}

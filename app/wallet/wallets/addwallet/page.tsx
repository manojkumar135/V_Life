"use client";

import React, { useState, ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { IoArrowBackOutline } from "react-icons/io5";
import Layout from "@/layout/Layout";
import InputField from "@/components/common/inputtype1";
import SubmitButton from "@/components/common/submitbutton";
import axios from "axios";
import ShowToast from "@/components/common/Toast/toast";

interface WalletFormData {
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  confirmAccountNumber: string;
  ifscCode: string;
  otp: string;
}

export default function AddWalletForm() {
  const router = useRouter();

  const [formData, setFormData] = useState<WalletFormData>({
    accountHolderName: "",
    bankName: "",
    accountNumber: "",
    confirmAccountNumber: "",
    ifscCode: "",
    otp: "",
  });

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleVerifyOtp = () => {
    // TODO: implement OTP verification API call
    ShowToast.success("OTP verified successfully!");
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault();

  if (formData.accountNumber !== formData.confirmAccountNumber) {
    ShowToast.error("Account numbers do not match!");
    return;
  }

  try {
    const payload = {
      account_holder_name: formData.accountHolderName,
      bank_name: formData.bankName,
      account_number: formData.accountNumber,
      ifsc_code: formData.ifscCode,
      otp: formData.otp,
      created_by: "admin",
      // Adding the required dummy values
      user_id: "DUMMY_USER_ID_12345",
      user_name:"Hello",
      wallet_id: "DUMMY_WALLET_ID_67890",
      withdraw_id: "DUMMY_WITHDRAW_ID_54321"
    };

    const res = await axios.post("/api/wallets-operations", payload);

    if (res.data.success) {
      ShowToast.success("Wallet added successfully!");
      router.push("/wallet/wallets");
    } else {
      ShowToast.error(res.data.message || "Failed to add wallet.");
    }
  } catch (error) {
    console.error(error);
    ShowToast.error("Something went wrong while adding wallet.");
  }
};

  return (
    <Layout>
      <div className="p-4 max-md:p-2">
        {/* Header */}
        <div className="flex items-center mb-6 max-md:mb-2">
          <IoArrowBackOutline
            size={25}
            color="black"
            className="mr-2 cursor-pointer"
            onClick={() => router.push("/wallet/wallets")}
          />
          <p className="text-xl max-md:text-[1rem] font-semibold">
            Add New Wallet
          </p>
        </div>

        {/* Form */}
        <div className="rounded-xl px-6 max-md:p-4 bg-white">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <InputField
                label="Account Holder Name"
                name="accountHolderName"
                placeholder="User Name"
                value={formData.accountHolderName}
                onChange={handleInputChange}
              />
              <InputField
                label="Bank Name"
                name="bankName"
                placeholder="State Bank ……"
                value={formData.bankName}
                onChange={handleInputChange}
              />
              <InputField
                label="Account Number"
                name="accountNumber"
                placeholder="1234XXXXXX"
                value={formData.accountNumber}
                onChange={handleInputChange}
              />
              <InputField
                label="Confirm Account Number"
                name="confirmAccountNumber"
                type="password"
                placeholder="........................"
                value={formData.confirmAccountNumber}
                onChange={handleInputChange}
              />
              <InputField
                label="IFSC Code"
                name="ifscCode"
                placeholder="SBH0000123"
                value={formData.ifscCode}
                onChange={handleInputChange}
              />

              {/* OTP field */}
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

            {/* Submit */}
            <div className="flex justify-end mt-4">
              <SubmitButton type="submit">Submit</SubmitButton>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}

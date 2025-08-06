"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { IoArrowBackOutline } from "react-icons/io5";
import Layout from "@/layout/Layout";
import InputField from "@/components/common/inputtype1";
import SubmitButton from "@/components/common/submitbutton";

export default function AddWalletForm() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    accountHolderName: "",
    bankName: "",
    accountNumber: "",
    confirmAccountNumber: "",
    ifscCode: "",
    otp: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleVerifyOtp = () => {
    // handle OTP verification logic here
  };

  const handleSubmit = () => {
    console.log("Clicked!");
  };

  return (
    <Layout>
      <div className="p-4 max-md:p-2">
        {/* Header with Back Arrow */}
        <div className="flex items-center flex-wrap mb-6 max-md:mb-2">
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

        {/* Form Container */}
        <div className="rounded-xl px-6 max-md:p-4 bg-white">
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

            {/* OTP with Verify button - custom field */}
            <div className={`flex flex-col gap-1 `}>
              <label
                htmlFor="otp"
                className="text-[0.9rem] max-md:text-[0.8rem] font-semibold text-gray-700"
              >
                Enter OTP
              </label>
              <div className="flex items-center gap-2 border border-gray-500 rounded-lg bg-white px-3 py-2 ">
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

          {/* OTP with Verify button - custom field */}
          {/* <div className="mt-6">
    <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
      Enter OTP
      <div className="flex items-center gap-2 border border-gray-500 rounded px-3 py-2 lg:w-[32%]">
        <input
          type="text"
          name="otp"
          placeholder="X X X X X X"
          value={formData.otp}
          onChange={handleInputChange}
          className="flex-1 text-base outline-none"
        />
        <button type="button" onClick={handleVerifyOtp} className="text-green-600 font-medium">
          Verify
        </button>
      </div>
    </label>
  </div> */}

          {/* Submit Button */}
          <div className="flex justify-end mt-8 max-md:mb-8">
            <SubmitButton type="submit" onClick={handleSubmit}>
              Submit
            </SubmitButton>
          </div>
        </div>
      </div>
    </Layout>
  );
}

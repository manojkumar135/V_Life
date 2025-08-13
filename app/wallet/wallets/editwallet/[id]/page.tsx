"use client";

import React, { useState, ChangeEvent, useEffect, FormEvent } from "react";
import Layout from "@/layout/Layout";
import { IoArrowBackOutline } from "react-icons/io5";
import { useRouter, useParams } from "next/navigation";
import InputField from "@/components/common/inputtype1";
import SubmitButton from "@/components/common/submitbutton";
import axios from "axios";
import ShowToast from "@/components/common/Toast/toast";

interface WalletFormData {
  walletId: string;
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  otp: string;
}

export default function EditWalletPage() {
  const router = useRouter();
  const params = useParams();
  const walletId = params?.id as string;

  const [formData, setFormData] = useState<WalletFormData>({
    walletId: "",
    accountHolderName: "",
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    otp: "",
  });

  const [loading, setLoading] = useState(false);

  // Fetch wallet data on mount
  useEffect(() => {
  if (!walletId) return;

  const fetchWallet = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(
        `/api/wallets-operations?wallet_id=${walletId}`
      );

      console.log("Fetched wallet data:", data);

      if (data?.data) {
        const wallet = data.data; // Directly use the object
        setFormData({
          walletId: wallet.wallet_id || "",
          accountHolderName: wallet.account_holder_name || "",
          bankName: wallet.bank_name || "",
          accountNumber: wallet.account_number || "",
          ifscCode: wallet.ifsc_code || "",
          otp: "",
        });
      } else {
        ShowToast.error("Wallet not found.");
      }
    } catch (error) {
      console.error("Error fetching wallet:", error);
      ShowToast.error("Failed to fetch wallet details.");
    } finally {
      setLoading(false);
    }
  };

  fetchWallet();
}, [walletId]);


  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload = {
        wallet_id: formData.walletId,
        account_holder_name: formData.accountHolderName,
        bank_name: formData.bankName,
        account_number: formData.accountNumber,
        ifsc_code: formData.ifscCode,
        otp: formData.otp,
        last_modified_by: "admin", // replace with actual user
      };

      const res = await axios.patch(`/api/wallets-operations?wallet_id=${walletId}`, payload
      );
        // console.log("Wallet updated successfully:", res);

      if (res.data.success) {
        ShowToast.success("Wallet updated successfully!");
        router.push("/wallet/wallets");
      } else {
        ShowToast.error(res.data.message || "Failed to update wallet.");
      }
    } catch (error) {
      console.error("Error updating wallet:", error);
      ShowToast.error("Failed to update wallet.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center mb-4">
          <IoArrowBackOutline
            size={25}
            className="mr-3 cursor-pointer"
            onClick={() => router.push("/wallet/wallets")}
          />
          <h2 className="text-xl max-sm:text-[1rem] font-semibold">
            Edit Wallet
          </h2>
        </div>

        {/* Form Card */}
        <div className="rounded-xl p-6 bg-white">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <InputField
                label="Wallet ID"
                name="walletId"
                type="text"
                value={formData.walletId}
                onChange={handleInputChange}
                disabled
              />
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
                label="IFSC Code"
                name="ifscCode"
                placeholder="SBH0000123"
                value={formData.ifscCode}
                onChange={handleInputChange}
              />
              <InputField
                label="OTP (if required)"
                name="otp"
                placeholder="X X X X X X"
                value={formData.otp}
                onChange={handleInputChange}
              />
            </div>

            <div className="flex justify-end">
              <SubmitButton type="submit">
                {loading ? "Updating..." : "UPDATE"}
              </SubmitButton>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}

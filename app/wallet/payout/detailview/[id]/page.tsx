"use client";

import React, { useState, useEffect } from "react";
import Layout from "@/layout/Layout";
import { IoIosArrowBack } from "react-icons/io";
import { useRouter, useParams } from "next/navigation";
import InputField from "@/components/InputFields/inputtype1";
import axios from "axios";
import ShowToast from "@/components/common/Toast/toast";

interface PayoutFormData {
  transactionId: string;
  payoutId: string;
  walletId: string | null;
  userId: string;
  userName: string;
  name: string;
  title: string;
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  date: string;
  time: string;
  availableBalance: string;
  amount: string;
  transactionType: string;
  details: string;
  status: string;
}

export default function PayoutDetailView() {
  const router = useRouter();
  const params = useParams();
  const payoutId = params?.id as string;

  const [formData, setFormData] = useState<PayoutFormData>({
    transactionId: "",
    payoutId: "",
    walletId: "",
    userId: "",
    userName: "",
    name: "",
    title: "",
    accountHolderName: "",
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    date: "",
    time: "",
    availableBalance: "",
    amount: "",
    transactionType: "",
    details: "",
    status: "",
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!payoutId) return;

    const fetchPayout = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(
          `/api/payout-operations?id=${payoutId}`
        );

        if (data?.data) {
          const p = data.data;
          setFormData({
            transactionId: p.transaction_id || "",
            payoutId: p.payout_id || "",
            walletId: p.wallet_id || "",
            userId: p.user_id || "",
            userName: p.user_name || "",
            name: p.name || "",
            title: p.title || "",
            accountHolderName: p.account_holder_name || "",
            bankName: p.bank_name || "",
            accountNumber: p.account_number || "",
            ifscCode: p.ifsc_code || "",
            date: p.date || "",
            time: p.time || "",
            availableBalance: p.available_balance?.toString() || "",
            amount: p.amount?.toString() || "",
            transactionType: p.transaction_type || "",
            details: p.details || "",
            status: p.status || "",
          });
        } else {
          ShowToast.error("Payout not found.");
        }
      } catch (error) {
        console.error("Error fetching payout:", error);
        ShowToast.error("Failed to fetch payout details.");
      } finally {
        setLoading(false);
      }
    };

    fetchPayout();
  }, [payoutId]);

  return (
    <Layout>
      <div className="p-4 max-md:p-2">
        {/* Header */}
        <div className="flex items-center mb-6 max-md:mb-2">
          <IoIosArrowBack
            size={25}
            className="mr-2 cursor-pointer"
            onClick={() => router.back()}
          />
          <p className="text-xl max-md:text-[1rem] font-semibold">
            Payout Detail View
          </p>
        </div>

        {/* Detail Form */}
        <div className="rounded-xl px-6 max-md:p-4 bg-white">
          <form className="grid grid-cols-1 gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <InputField label="Transaction ID" value={formData.transactionId} readOnly disabled />
              <InputField label="Payout ID" value={formData.payoutId} readOnly disabled />
              <InputField label="Wallet ID" value={formData.walletId || "-"} readOnly disabled />
              <InputField label="User ID" value={formData.userId} readOnly disabled />
              <InputField label="User Name" value={formData.userName} readOnly disabled />
              {/* <InputField label="Name" value={formData.name} readOnly disabled /> */}
              <InputField label="Bonus Title" value={formData.title} readOnly disabled />
              {/* <InputField label="Account Holder Name" value={formData.accountHolderName} readOnly disabled /> */}
              <InputField label="Bank Name" value={formData.bankName} readOnly disabled />
              <InputField label="Account Number" value={formData.accountNumber} readOnly disabled />
              <InputField label="IFSC Code" value={formData.ifscCode} readOnly disabled />
              <InputField label="Date" value={formData.date} readOnly disabled />
              <InputField label="Time" value={formData.time} readOnly disabled />
              {/* <InputField label="Available Balance" prefix="₹" value={formData.availableBalance} readOnly disabled /> */}
              <InputField label="Amount" prefix="₹" value={formData.amount} readOnly disabled />
              {/* <InputField label="Transaction Type" value={formData.transactionType} readOnly disabled /> */}
              <InputField label="Details" value={formData.details} readOnly disabled />
              <InputField label="Status" value={formData.status} readOnly disabled />
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import Layout from "@/layout/Layout";
import { IoIosArrowBack } from "react-icons/io";
import { useRouter, useParams } from "next/navigation";
import InputField from "@/components/InputFields/inputtype1";
import SelectField from "@/components/InputFields/selectinput";
import SubmitButton from "@/components/common/submitbutton";
import axios from "axios";
import ShowToast from "@/components/common/Toast/toast";
import { useVLife } from "@/store/context";

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
  withdraw: string;
  reward: string;
  tds: string;
  admin: string;
  transactionType: string;
  details: string;
  status: string;
}

export default function PayoutDetailView() {
  const { user } = useVLife();
  const router = useRouter();
  const params = useParams();
  const payoutId = params?.id as string;

  const [formData, setFormData] = useState<PayoutFormData>({
    transactionId: "",
    payoutId: "",
    walletId: null,
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
    withdraw: "",
    reward: "",
    tds: "",
    admin: "",
    transactionType: "",
    details: "",
    status: "",
  });

  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [status, setStatus] = useState<string>("");

  // status select helpers
  const statusOptions = [
    { label: "Pending", value: "pending" },
    { label: "On Hold", value: "OnHold" },
    { label: "Completed", value: "completed" },
  ];

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
            walletId: p.wallet_id || null,
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
            withdraw: p.withdraw_amount || "0.00",
            reward: p.reward_amount || "0.00",
            tds: p.tds_amount || "0.00",
            admin: p.admin_charge || "0.00",
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

  // keep local status in sync with loaded formData
  useEffect(() => {
    setStatus(formData.status || "");
  }, [formData.status]);

  const handleStatusChange = (val: string) => {
    setStatus(val);
  };

  const handleUpdate = async () => {
    if (user?.role !== "admin") {
      ShowToast.error("Not authorized to update status");
      return;
    }

    try {
      setUpdating(true);
      const payload: any = {
        id: payoutId,
        status: status,
      };

      // Optionally send other editable fields here if required

      const res = await axios.patch("/api/payout-operations", payload);

      if (res.data?.success) {
        ShowToast.success("Payout updated successfully");
        // refresh data
        const { data } = await axios.get(
          `/api/payout-operations?id=${payoutId}`
        );
        if (data?.data) {
          const p = data.data;
          setFormData((prev) => ({ ...prev, status: p.status || "" }));
          setStatus(p.status || "");
        }
      } else {
        ShowToast.error(res.data?.message || "Failed to update payout");
      }
    } catch (err) {
      console.error("Update error:", err);
      ShowToast.error("Failed to update payout");
    } finally {
      setUpdating(false);
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
              <InputField
                label="Payout ID"
                value={formData.payoutId}
                readOnly
                disabled
              />
              <InputField
                label="Transaction ID"
                value={formData.transactionId}
                readOnly={user?.role !== "admin"}
                disabled={user?.role !== "admin"}
              />
              <InputField
                label="Wallet ID"
                value={formData.walletId || "-"}
                readOnly
                disabled
              />
              <InputField
                label="User ID"
                value={formData.userId}
                readOnly
                disabled
              />
              <InputField
                label="User Name"
                value={formData.userName}
                readOnly
                disabled
              />
              <InputField
                label="Bonus Title"
                value={formData.title}
                readOnly
                disabled
              />
              <InputField
                label="Bank Name"
                value={formData.bankName}
                readOnly
                disabled
              />
              <InputField
                label="Account Number"
                value={formData.accountNumber}
                readOnly
                disabled
              />
              <InputField
                label="IFSC Code"
                value={formData.ifscCode}
                readOnly
                disabled
              />
              <InputField
                label="Date"
                value={formData.date}
                readOnly
                disabled
              />
              <InputField
                label="Time"
                value={formData.time}
                readOnly
                disabled
              />
              <InputField
                prefix="₹"
                label="Amount"
                value={formData.amount}
                readOnly
                disabled
              />
              <InputField
                prefix="₹"
                label="Withdraw Amount"
                value={formData.withdraw}
                readOnly
                disabled
              />
              <InputField
                prefix="₹"
                label="Reward Amount"
                value={formData.reward}
                readOnly
                disabled
              />
              <InputField
                prefix="₹"
                label="TDS Charge"
                value={formData.tds}
                readOnly
                disabled
              />
              <InputField
                prefix="₹"
                label="Admin Charge"
                value={formData.admin}
                readOnly
                disabled
              />

              <InputField
                label="Details"
                value={formData.details}
                readOnly={user?.role !== "admin"}
                disabled={user?.role !== "admin"}
              />

              {/* Status field: Select for admin, plain text for others */}

              {user?.role === "admin" ? (
                <div className="flex flex-col gap-1 -mb-3">
                  <span className="text-[0.9rem] max-md:text-[0.8rem] font-semibold text-gray-700">
                    Status
                  </span>
                  <SelectField
                    name="status"
                    value={status}
                    onChange={(e: any) => {
                      const v = e?.target?.value ?? e?.value ?? e;
                      handleStatusChange(String(v));
                    }}
                    options={statusOptions}
                    placeholder="-- Select --"
                    controlPaddingLeft="0px"
                    // className="w-full px-4 py-2 border border-gray-400 rounded-lg bg-white text-sm"
                  />
                </div>
              ) : (
                <InputField
                  label="Status"
                  value={formData.status}
                  readOnly
                  disabled
                />
              )}
            </div>

            {/* Update button */}
            {user?.role === "admin" && (
              <div className="flex justify-end mt-6">
                <SubmitButton
                  type="button"
                  onClick={handleUpdate}
                  disabled={updating || loading}
                >
                  {updating ? "Updating..." : "UPDATE"}
                </SubmitButton>
              </div>
            )}
          </form>
        </div>
      </div>
    </Layout>
  );
}

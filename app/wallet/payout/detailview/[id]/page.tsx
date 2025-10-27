"use client";

import React, { ChangeEvent, useState, useEffect } from "react";
import Layout from "@/layout/Layout";
import { IoIosArrowBack } from "react-icons/io";
import { useRouter, useParams } from "next/navigation";
import InputField from "@/components/InputFields/inputtype1";
import SelectField from "@/components/InputFields/selectinput";
import SubmitButton from "@/components/common/submitbutton";
import axios from "axios";
import ShowToast from "@/components/common/Toast/toast";
import { useVLife } from "@/store/context";
import Loader from "@/components/common/loader";

interface PayoutFormData {
  transaction_id: string;
  payout_id: string;
  wallet_id: string | null;
  user_id: string;
  user_name: string;
  name: string;
  title: string;
  account_holder_name: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  date: string;
  time: string;
  available_balance: string;
  amount: string;
  withdraw_amount: string;
  reward_amount: string;
  tds_amount: string;
  admin_charge: string;
  transaction_type: string;
  details: string;
  status: string;
}

export default function PayoutDetailView() {
  const { user } = useVLife();
  const router = useRouter();
  const params = useParams();
  const payoutId = params?.id as string;

  const [formData, setFormData] = useState<PayoutFormData>({
    transaction_id: "",
    payout_id: "",
    wallet_id: null,
    user_id: "",
    user_name: "",
    name: "",
    title: "",
    account_holder_name: "",
    bank_name: "",
    account_number: "",
    ifsc_code: "",
    date: "",
    time: "",
    available_balance: "",
    amount: "",
    withdraw_amount: "",
    reward_amount: "",
    tds_amount: "",
    admin_charge: "",
    transaction_type: "",
    details: "",
    status: "",
  });

  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [status, setStatus] = useState<string>("");

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
            transaction_id: p.transaction_id || "",
            payout_id: p.payout_id || "",
            wallet_id: p.wallet_id || null,
            user_id: p.user_id || "",
            user_name: p.user_name || "",
            name: p.name || "",
            title: p.title || "",
            account_holder_name: p.account_holder_name || "",
            bank_name: p.bank_name || "",
            account_number: p.account_number || "",
            ifsc_code: p.ifsc_code || "",
            date: p.date || "",
            time: p.time || "",
            available_balance: p.available_balance?.toString() || "",
            amount: p.amount?.toString() || "",
            withdraw_amount: p.withdraw_amount?.toString() || "0.00",
            reward_amount: p.reward_amount?.toString() || "0.00",
            tds_amount: p.tds_amount?.toString() || "0.00",
            admin_charge: p.admin_charge?.toString() || "0.00",
            transaction_type: p.transaction_type || "",
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

  useEffect(() => {
    setStatus(formData.status || "");
  }, [formData.status]);

  const handleStatusChange = (val: string) => setStatus(val);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdate = async () => {
    if (user?.role !== "admin") {
      ShowToast.error("Not authorized to update status");
      return;
    }

    try {
      setUpdating(true);
      const payload = { id: payoutId, ...formData, status };
      const res = await axios.patch("/api/payout-operations", payload);

      if (res.data?.success) {
        const updatedRecord = res.data?.data;

        ShowToast.success("Payout updated successfully");

        setFormData({
          transaction_id: updatedRecord?.transaction_id || "",
          payout_id: updatedRecord?.payout_id || "",
          wallet_id: updatedRecord?.wallet_id || null,
          user_id: updatedRecord?.user_id || "",
          user_name: updatedRecord?.user_name || "",
          name: updatedRecord?.name || "",
          title: updatedRecord?.title || "",
          account_holder_name: updatedRecord?.account_holder_name || "",
          bank_name: updatedRecord?.bank_name || "",
          account_number: updatedRecord?.account_number || "",
          ifsc_code: updatedRecord?.ifsc_code || "",
          date: updatedRecord?.date || "",
          time: updatedRecord?.time || "",
          available_balance: updatedRecord?.available_balance?.toString() || "",
          amount: updatedRecord?.amount?.toString() || "",
          withdraw_amount: updatedRecord?.withdraw_amount?.toString() || "0.00",
          reward_amount: updatedRecord?.reward_amount?.toString() || "0.00",
          tds_amount: updatedRecord?.tds_amount?.toString() || "0.00",
          admin_charge: updatedRecord?.admin_charge?.toString() || "0.00",
          transaction_type: updatedRecord?.transaction_type || "",
          details: updatedRecord?.details || "",
          status: updatedRecord?.status || "",
        });

        setStatus(updatedRecord?.status || "");

        if (updatedRecord?.title === "Matching Bonus") {
          router.push("/wallet/payout/daily");
        } else if (updatedRecord?.title === "Infinity Bonus") {
          router.push("/wallet/payout/weekly");
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
        {loading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <Loader />
          </div>
        )}

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
                value={formData.payout_id}
                readOnly
                disabled
              />
              <InputField
                label="Transaction ID"
                name="transaction_id"
                value={formData.transaction_id}
                onChange={handleInputChange}
                readOnly={user?.role !== "admin"}
                disabled={user?.role !== "admin"}
              />
              <InputField
                label="Wallet ID"
                value={formData.wallet_id || "-"}
                readOnly
                disabled
              />
              <InputField
                label="User ID"
                value={formData.user_id}
                readOnly
                disabled
              />
              <InputField
                label="User Name"
                value={formData.user_name}
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
                value={formData.bank_name}
                readOnly
                disabled
              />
              <InputField
                label="Account Number"
                value={formData.account_number}
                readOnly
                disabled
              />
              <InputField
                label="IFSC Code"
                value={formData.ifsc_code}
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
                value={formData.withdraw_amount}
                readOnly
                disabled
              />
              <InputField
                prefix="₹"
                label="Reward Amount"
                value={formData.reward_amount}
                readOnly
                disabled
              />
              <InputField
                prefix="₹"
                label="TDS Charge"
                value={formData.tds_amount}
                readOnly
                disabled
              />
              <InputField
                prefix="₹"
                label="Admin Charge"
                value={formData.admin_charge}
                readOnly
                disabled
              />
              <InputField
                label="Details"
                name="details"
                value={formData.details}
                onChange={handleInputChange}
                readOnly={user?.role !== "admin"}
                disabled={user?.role !== "admin"}
              />

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

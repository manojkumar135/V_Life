// addpayout.tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { IoIosArrowBack } from "react-icons/io";
import Layout from "@/layout/Layout";
import InputField from "@/components/InputFields/inputtype1";
import SubmitButton from "@/components/common/submitbutton";
import { useVLife } from "@/store/context";

import { Formik, Form, FormikHelpers } from "formik";
import * as Yup from "yup";
import axios from "axios";
import ShowToast from "@/components/common/Toast/toast";
import Loader from "@/components/common/loader";

interface PayoutFormData {
  walletId: string;
  userId: string;
  userName: string;
  contact: string;
  transactionId: string;
  date: string;
  amount: string;
}

export default function AddPayoutForm() {
  const router = useRouter();
  const { user } = useVLife();
  const [loading, setLoading] = useState(false);

  const initialValues: PayoutFormData = {
    walletId: "",
    userId: "",
    userName: "",
    contact: "",
    transactionId: "",
    date: "",
    amount: "",
  };

  const PayoutSchema = Yup.object().shape({
    walletId: Yup.string()
      .length(10, "* Wallet ID must be 10 characters")
      .required("* Wallet ID is required"),
    userId: Yup.string().required("* User ID is required"),
    userName: Yup.string().required("* User Name is required"),
    contact: Yup.string().required("* Contact is required"),
    transactionId: Yup.string().required("* Transaction ID is required"),
    date: Yup.string().required("* Date is required"),
    amount: Yup.number()
      .typeError("Amount must be a number")
      .positive("Amount must be positive")
      .required("* Amount is required"),
  });

  // Fetch user details by walletId
  // Fetch user details by walletId
  const fetchUserByWalletId = async (
    walletId: string,
    setFieldValue: (field: string, value: any) => void
  ) => {
    try {
      const res = await axios.get(
        `/api/wallets-operations?wallet_id=${walletId}`
      );
      if (res.data.success && res.data.data) {
        const wallet = res.data.data; // ✅ directly use object
        setFieldValue("userId", wallet.user_id);
        setFieldValue("userName", wallet.user_name);
        setFieldValue("contact", wallet.contact || "");
      } else {
        ShowToast.error("Wallet not found");
        setFieldValue("userId", "");
        setFieldValue("userName", "");
        setFieldValue("contact", "");
      }
    } catch (err: any) {
      console.error(err);
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Failed to fetch wallet details";
      ShowToast.error(errorMessage);

      // ✅ Clear fields when error occurs
      setFieldValue("userId", "");
      setFieldValue("userName", "");
      setFieldValue("contact", "");
    }
  };

  const handleSubmit = async (
    values: PayoutFormData,
    actions: FormikHelpers<PayoutFormData>
  ) => {
    try {
      setLoading(true);

      const payload = {
        wallet_id: values.walletId,
        user_id: values.userId,
        user_name: values.userName,
        contact: values.contact,
        transaction_id: values.transactionId,
        date: values.date,
        amount: values.amount,
        created_by: user.user_id,
      };

      const res = await axios.post("/api/payouts-operations", payload);

      if (res.data.success) {
        ShowToast.success("Payout added successfully!");
        router.push("/wallet/payouts");
      } else {
        ShowToast.error(res.data.message || "Failed to add payout.");
      }
    } catch (error: any) {
      console.error("Add payout error:", error);
      ShowToast.error(
        error.response?.data?.message ||
          "Something went wrong while adding payout."
      );
    } finally {
      setLoading(false);
      actions.setSubmitting(false);
    }
  };

  return (
    <Layout>
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <Loader />
        </div>
      )}
      <div className="p-4 max-md:p-2">
        {/* Header */}
        <div className="flex items-center mb-6 max-md:mb-2">
          <IoIosArrowBack
            size={25}
            color="black"
            className="mr-2 cursor-pointer"
            onClick={() => router.push("/wallet/payout")}
          />
          <p className="text-xl max-md:text-[1rem] font-semibold">
            Add New Payout
          </p>
        </div>

        {/* Formik Form */}
        <div className="rounded-xl px-6 max-md:p-4 bg-white">
          <Formik
            initialValues={initialValues}
            validationSchema={PayoutSchema}
            onSubmit={handleSubmit}
          >
            {({ values, setFieldValue, errors, touched, handleBlur }) => (
              <Form className="grid grid-cols-1 gap-6">
                {/* User Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Wallet ID */}
                  <InputField
                    label="Wallet ID"
                    name="walletId"
                    placeholder="Enter Wallet ID"
                    value={values.walletId}
                    onChange={async (e) => {
                      const value = e.target.value;
                      setFieldValue("walletId", value);

                      if (value.length === 10) {
                        await fetchUserByWalletId(value, setFieldValue);
                      }
                    }}
                    onBlur={handleBlur}
                    error={touched.walletId ? errors.walletId : ""}
                  />

                  <InputField
                    label="User ID"
                    name="userId"
                    value={values.userId}
                    readOnly={true}
                  />
                  <InputField
                    label="User Name"
                    name="userName"
                    value={values.userName}
                    readOnly={true}
                  />
                  <InputField
                    label="Contact"
                    name="contact"
                    value={values.contact}
                    readOnly={true}
                  />
                  <InputField
                    label="Transaction ID"
                    name="transactionId"
                    placeholder="Enter Transaction ID"
                    value={values.transactionId}
                    onChange={(e) =>
                      setFieldValue("transactionId", e.target.value)
                    }
                    onBlur={handleBlur}
                    error={touched.transactionId ? errors.transactionId : ""}
                  />
                  <InputField
                    label="Date"
                    name="date"
                    type="date"
                    value={values.date}
                    onChange={(e) => setFieldValue("date", e.target.value)}
                    onBlur={handleBlur}
                    error={touched.date ? errors.date : ""}
                    className="uppercase"
                  />
                  <InputField
                    label="Amount"
                    name="amount"
                    placeholder="Enter Amount"
                    value={values.amount}
                    onChange={(e) => setFieldValue("amount", e.target.value)}
                    onBlur={handleBlur}
                    error={touched.amount ? errors.amount : ""}
                  />
                </div>

                {/* Submit */}
                <div className="flex justify-end mt-4">
                  <SubmitButton type="submit">
                    {loading ? "Submitting..." : "Submit"}
                  </SubmitButton>
                </div>
              </Form>
            )}
          </Formik>
        </div>
      </div>
    </Layout>
  );
}

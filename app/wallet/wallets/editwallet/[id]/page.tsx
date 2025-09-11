"use client";

import React, { useState, useEffect } from "react";
import Layout from "@/layout/Layout";
import { IoIosArrowBack } from "react-icons/io";
import { useRouter, useParams } from "next/navigation";
import InputField from "@/components/InputFields/inputtype1";
import FileInput from "@/components/InputFields/fileinput";
import SubmitButton from "@/components/common/submitbutton";
import { Formik, Form, FormikHelpers } from "formik";
import * as Yup from "yup";
import axios from "axios";
import ShowToast from "@/components/common/Toast/toast";

interface WalletFormData {
  walletId: string;
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  aadharNumber: string;
  panNumber: string;
  aadharFile: File | string | null;
  panFile: File | string | null;
}

const WalletSchema = Yup.object().shape({
  accountHolderName: Yup.string().required("Account Holder Name is required"),
  bankName: Yup.string().required("Bank Name is required"),
  accountNumber: Yup.string()
    .matches(/^\d{9}$|^\d{11}$/, "Account number must be 9 or 11 digits")
    .required("Account Number is required"),
  ifscCode: Yup.string()
    .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code format")
    .required("IFSC Code is required"),
  aadharNumber: Yup.string()
    .matches(/^\d{12}$/, "Aadhaar must be 12 digits")
    .required("Aadhaar Number is required"),
  panNumber: Yup.string()
    .matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "PAN must be 10 characters")
    .required("PAN Number is required"),
  aadharFile: Yup.mixed<File | string>()
    .required("Aadhaar file is required")
    .test(
      "fileType",
      "Aadhaar must be an image or PDF",
      (value) =>
        !value ||
        (typeof value === "string" || ["image/", "application/pdf"].some((type) => (value as File).type.startsWith(type)))
    ),
  panFile: Yup.mixed<File | string>()
    .required("PAN file is required")
    .test(
      "fileType",
      "PAN must be an image or PDF",
      (value) =>
        !value ||
        (typeof value === "string" || ["image/", "application/pdf"].some((type) => (value as File).type.startsWith(type)))
    ),
});

export default function EditWalletPage() {
  const router = useRouter();
  const params = useParams();
  const walletId = params?.id as string;

  const [loading, setLoading] = useState(false);
  const [initialValues, setInitialValues] = useState<WalletFormData>({
    walletId: "",
    accountHolderName: "",
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    aadharNumber: "",
    panNumber: "",
    aadharFile: null,
    panFile: null,
  });

  // Fetch wallet data
  useEffect(() => {
    if (!walletId) return;

    const fetchWallet = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(`/api/wallets-operations?wallet_id=${walletId}`);
        if (data?.data) {
          const wallet = data.data;
          setInitialValues({
            walletId: wallet.wallet_id || "",
            accountHolderName: wallet.account_holder_name || "",
            bankName: wallet.bank_name || "",
            accountNumber: wallet.account_number || "",
            ifscCode: wallet.ifsc_code || "",
            aadharNumber: wallet.aadhar_number || "",
            panNumber: wallet.pan_number || "",
            aadharFile: wallet.aadhar_file || null,
            panFile: wallet.pan_file || null,
          });
        } else {
          ShowToast.error("Wallet not found");
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

  const uploadFile = async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await axios.post("/api/getFileUrl", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data.success) return res.data.fileUrl;
      ShowToast.error(res.data.message || "File upload failed");
      return null;
    } catch (err) {
      console.error("File upload error:", err);
      ShowToast.error("Failed to upload file");
      return null;
    }
  };

  const handleSubmit = async (
    values: WalletFormData,
    actions: FormikHelpers<WalletFormData>
  ) => {
    try {
      setLoading(true);

      // Handle files
      let aadharFileUrl: string | null = typeof values.aadharFile === "string" ? values.aadharFile : null;
      let panFileUrl: string | null = typeof values.panFile === "string" ? values.panFile : null;

      if (values.aadharFile instanceof File) aadharFileUrl = await uploadFile(values.aadharFile);
      if (values.panFile instanceof File) panFileUrl = await uploadFile(values.panFile);

      if (!aadharFileUrl || !panFileUrl) return;

      const payload = {
        wallet_id: values.walletId,
        account_holder_name: values.accountHolderName,
        bank_name: values.bankName,
        account_number: values.accountNumber,
        ifsc_code: values.ifscCode,
        aadhar_number: values.aadharNumber,
        pan_number: values.panNumber,
        aadhar_file: aadharFileUrl,
        pan_file: panFileUrl,
        last_modified_by: "admin",
      };

      const res = await axios.patch(`/api/wallets-operations?wallet_id=${walletId}`, payload);

      if (res.data.success) {
        ShowToast.success("Wallet updated successfully!");
        router.push("/wallet/wallets");
      } else {
        ShowToast.error(res.data.message || "Failed to update wallet.");
      }
    } catch (error) {
      console.error(error);
      ShowToast.error("Something went wrong while updating wallet.");
    } finally {
      setLoading(false);
      actions.setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="p-4">
        <div className="flex items-center mb-4">
          <IoIosArrowBack
            size={25}
            className="mr-3 cursor-pointer"
            onClick={() => router.push("/wallet/wallets")}
          />
          <h2 className="text-xl max-sm:text-[1rem] font-semibold">Edit Wallet</h2>
        </div>

        <div className="rounded-xl p-6 bg-white">
          <Formik
            enableReinitialize
            initialValues={initialValues}
            validationSchema={WalletSchema}
            onSubmit={handleSubmit}
          >
            {({ values, setFieldValue, errors, touched, handleBlur }) => (
              <Form className="grid grid-cols-1 gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  <InputField
                    label="Wallet ID"
                    name="walletId"
                    value={values.walletId}
                    disabled
                  />
                  <InputField
                    label="Account Holder Name"
                    name="accountHolderName"
                    value={values.accountHolderName}
                    onChange={(e) => setFieldValue("accountHolderName", e.target.value)}
                    onBlur={handleBlur}
                    error={touched.accountHolderName ? errors.accountHolderName : ""}
                  />
                  <InputField
                    label="Bank Name"
                    name="bankName"
                    value={values.bankName}
                    onChange={(e) => setFieldValue("bankName", e.target.value)}
                    onBlur={handleBlur}
                    error={touched.bankName ? errors.bankName : ""}
                  />
                  <InputField
                    label="Account Number"
                    name="accountNumber"
                    value={values.accountNumber}
                    onChange={(e) => setFieldValue("accountNumber", e.target.value)}
                    onBlur={handleBlur}
                    error={touched.accountNumber ? errors.accountNumber : ""}
                  />
                  <InputField
                    label="IFSC Code"
                    name="ifscCode"
                    value={values.ifscCode}
                    onChange={(e) => setFieldValue("ifscCode", e.target.value)}
                    onBlur={handleBlur}
                    error={touched.ifscCode ? errors.ifscCode : ""}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-0">
                  <InputField
                    label="Aadhar Number"
                    name="aadharNumber"
                    value={values.aadharNumber}
                    onChange={(e) => setFieldValue("aadharNumber", e.target.value)}
                    onBlur={handleBlur}
                    error={touched.aadharNumber ? errors.aadharNumber : ""}
                  />
                  <FileInput
                    label="Upload Aadhar"
                    name="aadharFile"
                    value={values.aadharFile}
                    onChange={(e) => setFieldValue("aadharFile", e.currentTarget.files?.[0] || null)}
                    onBlur={handleBlur}
                    error={touched.aadharFile ? errors.aadharFile : ""}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-0 lg:-mt-3">
                  <InputField
                    label="PAN Number"
                    name="panNumber"
                    value={values.panNumber}
                    onChange={(e) => setFieldValue("panNumber", e.target.value)}
                    onBlur={handleBlur}
                    error={touched.panNumber ? errors.panNumber : ""}
                  />
                  <FileInput
                    label="Upload PAN"
                    name="panFile"
                    value={values.panFile}
                    onChange={(e) => setFieldValue("panFile", e.currentTarget.files?.[0] || null)}
                    onBlur={handleBlur}
                    error={touched.panFile ? errors.panFile : ""}
                  />
                </div>

                <div className="flex justify-end">
                  <SubmitButton type="submit">{loading ? "Updating..." : "Update"}</SubmitButton>
                </div>
              </Form>
            )}
          </Formik>
        </div>
      </div>
    </Layout>
  );
}

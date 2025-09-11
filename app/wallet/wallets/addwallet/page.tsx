"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { IoIosArrowBack } from "react-icons/io";
import Layout from "@/layout/Layout";
import InputField from "@/components/InputFields/inputtype1";
import FileInput from "@/components/InputFields/fileinput";
import SubmitButton from "@/components/common/submitbutton";
import PasswordInput from "@/components/InputFields/passwordinput";
import { useVLife } from "@/store/context";

import { Formik, Form, FormikHelpers } from "formik";
import * as Yup from "yup";
import axios from "axios";
import ShowToast from "@/components/common/Toast/toast";

interface WalletFormData {
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  confirmAccountNumber: string;
  ifscCode: string;
  aadharNumber: string;
  panNumber: string;
  aadharFile: File | null;
  panFile: File | null;
}

const WalletSchema = Yup.object().shape({
  accountHolderName: Yup.string().required("Account Holder Name is required"),
  bankName: Yup.string().required("Bank Name is required"),
  accountNumber: Yup.string()
    .matches(/^\d{9}$|^\d{11}$/, "Account number must be 9 or 11 digits")
    .required("Account Number is required"),
  confirmAccountNumber: Yup.string()
    .oneOf([Yup.ref("accountNumber")], "Account numbers do not match")
    .required("Confirm Account Number is required"),
  ifscCode: Yup.string()
    .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code format")
    .required("IFSC Code is required"),
  aadharNumber: Yup.string()
    .matches(/^\d{12}$/, "Aadhaar must be 12 digits")
    .required("Aadhaar Number is required"),
  panNumber: Yup.string()
    .matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "PAN must be 10 characters")
    .required("PAN Number is required"),
  aadharFile: Yup.mixed<File>()
    .required("Aadhaar file is required")
    .test(
      "fileType",
      "Aadhaar must be an image or PDF",
      (value) =>
        !value ||
        (value && ["image/", "application/pdf"].some((type) => value.type.startsWith(type)))
    ),
  panFile: Yup.mixed<File>()
    .required("PAN file is required")
    .test(
      "fileType",
      "PAN must be an image or PDF",
      (value) =>
        !value ||
        (value && ["image/", "application/pdf"].some((type) => value.type.startsWith(type)))
    ),
});

export default function AddWalletForm() {
  const router = useRouter();
  const { user } = useVLife();
  const [loading, setLoading] = useState(false);

  const uploadFile = async (file: File): Promise<string | null> => {
    try {
      const fileForm = new FormData();
      fileForm.append("file", file);

      const res = await axios.post("/api/getFileUrl", fileForm, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.success) {
        return res.data.fileUrl;
      } else {
        ShowToast.error(res.data.message || "File upload failed");
        return null;
      }
    } catch (error) {
      console.error("File upload error:", error);
      ShowToast.error("Failed to upload file");
      return null;
    }
  };

  const initialValues: WalletFormData = {
    accountHolderName: "",
    bankName: "",
    accountNumber: "",
    confirmAccountNumber: "",
    ifscCode: "",
    aadharNumber: "",
    panNumber: "",
    aadharFile: null,
    panFile: null,
  };

  const handleSubmit = async (
    values: WalletFormData,
    actions: FormikHelpers<WalletFormData>
  ) => {
    try {
      setLoading(true);

      const aadharFileUrl =
        values.aadharFile instanceof File ? await uploadFile(values.aadharFile) : values.aadharFile;
      const panFileUrl =
        values.panFile instanceof File ? await uploadFile(values.panFile) : values.panFile;

      if (!aadharFileUrl || !panFileUrl) return;

      const payload = {
        account_holder_name: values.accountHolderName,
        bank_name: values.bankName,
        account_number: values.accountNumber,
        ifsc_code: values.ifscCode,
        aadhar_number: values.aadharNumber,
        pan_number: values.panNumber,
        aadhar_file: aadharFileUrl,
        pan_file: panFileUrl,
        created_by: user.user_id,
        user_id: user.user_id,
        user_name: user.user_name,
        wallet_status: "active",
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
    } finally {
      setLoading(false);
      actions.setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="p-4 max-md:p-2">
        {/* Header */}
        <div className="flex items-center mb-6 max-md:mb-2">
          <IoIosArrowBack
            size={25}
            color="black"
            className="mr-2 cursor-pointer"
            onClick={() => router.push("/wallet/wallets")}
          />
          <p className="text-xl max-md:text-[1rem] font-semibold">
            Add New Wallet
          </p>
        </div>

        {/* Formik Form */}
        <div className="rounded-xl px-6 max-md:p-4 bg-white">
          <Formik
            initialValues={initialValues}
            validationSchema={WalletSchema}
            onSubmit={handleSubmit}
          >
            {({ values, setFieldValue, errors, touched, handleBlur }) => (
              <Form className="grid grid-cols-1 gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  <InputField
                    label="Account Holder Name"
                    name="accountHolderName"
                    placeholder="User Name"
                    value={values.accountHolderName}
                    onChange={(e) => setFieldValue("accountHolderName", e.target.value)}
                    onBlur={handleBlur}
                    error={touched.accountHolderName ? errors.accountHolderName : ""}
                  />
                  <InputField
                    label="Bank Name"
                    name="bankName"
                    placeholder="State Bank ……"
                    value={values.bankName}
                    onChange={(e) => setFieldValue("bankName", e.target.value)}
                    onBlur={handleBlur}
                    error={touched.bankName ? errors.bankName : ""}
                  />
                  <InputField
                    label="Account Number"
                    name="accountNumber"
                    placeholder="1234XXXXXX"
                    value={values.accountNumber}
                    onChange={(e) => setFieldValue("accountNumber", e.target.value)}
                    onBlur={handleBlur}
                    error={touched.accountNumber ? errors.accountNumber : ""}
                  />
                  <PasswordInput
                    label="Confirm Account Number"
                    name="confirmAccountNumber"
                    value={values.confirmAccountNumber}
                    onChange={(e) => setFieldValue("confirmAccountNumber", e.target.value)}
                    onBlur={handleBlur}
                    error={touched.confirmAccountNumber ? errors.confirmAccountNumber : ""}
                  />
                  <InputField
                    label="IFSC Code"
                    name="ifscCode"
                    placeholder="SBH0000123"
                    value={values.ifscCode}
                    onChange={(e) => setFieldValue("ifscCode", e.target.value)}
                    onBlur={handleBlur}
                    error={touched.ifscCode ? errors.ifscCode : ""}
                  />
                </div>

                {/* Aadhaar & PAN */}
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

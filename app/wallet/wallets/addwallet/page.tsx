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
import Loader from "@/components/common/loader";
import { RiVerifiedBadgeFill } from "react-icons/ri";

interface WalletFormData {
  userId: string;
  userName: string;
  contact: string;

  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  confirmAccountNumber: string;
  ifscCode: string;
  gstNumber?: string;

  // cheque / bank book
  chequeFile: File | null;
  bankBookFile: File | null;

  // Aadhaar
  aadharNumber: string;
  aadharFront: File | null;
  aadharBack: File | null;

  // legacy single aadhar file (optional)
  aadharFile: File | null;

  // PAN
  panNumber: string;
  panName: string;
  panDob: string;
  panVerify: boolean;
  panCategory?: string;
  aadharSeeding?: boolean;
  panFile: File | null;
}

export default function AddWalletForm() {
  const router = useRouter();
  const { user } = useVLife();
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [panVerified, setPanVerified] = useState(false);

  const initialValues: WalletFormData = {
    userId: user.role === "user" ? user.user_id : "",
    userName: user.role === "user" ? user.user_name : "",
    contact: user.role === "user" ? user.contact || "" : "",

    accountHolderName: "",
    bankName: "",
    accountNumber: "",
    confirmAccountNumber: "",
    ifscCode: "",
    gstNumber: "",

    chequeFile: null,
    bankBookFile: null,

    aadharNumber: "",
    aadharFront: null,
    aadharBack: null,
    aadharFile: null,

    panNumber: "",
    panName: "",
    panDob: "",
    panVerify: false,
    panCategory: "",
    aadharSeeding: false,
    panFile: null,
  };

  const WalletSchema = Yup.object().shape({
    userId: Yup.string().required("* User ID is required"),
    userName: Yup.string().required("* User Name is required"),
    contact: Yup.string().required("* Contact is required"),
    accountHolderName: Yup.string().required(
      "* Account Holder Name is required"
    ),
    bankName: Yup.string().required("* Bank Name is required"),
    accountNumber: Yup.string()
      .matches(/^\d{9,18}$/, "Account number must be 9 to 18 digits")
      .required("Account Number is required"),
    confirmAccountNumber: Yup.string()
      .oneOf([Yup.ref("accountNumber")], "Account numbers do not match")
      .required("* Confirm Account Number is required"),
    ifscCode: Yup.string()
      .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code format")
      .required("IFSC Code is required"),
    // GSTIN basic pattern (optional)
    gstNumber: Yup.string()
      .matches(/^[0-9A-Z]{15}$/, "Invalid GSTIN")
      .notRequired()
      .nullable()
      .transform((v) => (v === "" ? null : v)),

    aadharNumber: Yup.string()
      .matches(/^\d{12}$/, "Aadhaar must be 12 digits")
      .required("* Aadhaar Number is required"),

    // aadharFront / aadharBack required
    aadharFront: Yup.mixed<File>()
      .required("* Aadhaar front image/pdf is required")
      .test(
        "fileType-aadharFront",
        "* Aadhaar front must be an image or PDF",
        (value) =>
          !value ||
          ["image/", "application/pdf"].some((t) => value.type.startsWith(t))
      ),
    aadharBack: Yup.mixed<File>()
      .required("* Aadhaar back image/pdf is required")
      .test(
        "fileType-aadharBack",
        "* Aadhaar back must be an image or PDF",
        (value) =>
          !value ||
          ["image/", "application/pdf"].some((t) => value.type.startsWith(t))
      ),

    // legacy aadharFile optional
    aadharFile: Yup.mixed<File>().notRequired(),

    // PAN
    panNumber: Yup.string()
      .matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "* PAN must be 10 characters")
      .required("* PAN Number is required"),
    panName: Yup.string().required("* Name as in PAN is required"),
    panDob: Yup.date().required("* Date of Birth as in PAN is required"),
    panFile: Yup.mixed<File>()
      .required("* PAN file is required")
      .test(
        "fileType-pan",
        "* PAN must be an image or PDF",
        (value) =>
          !value ||
          ["image/", "application/pdf"].some((t) => value.type.startsWith(t))
      ),

    // optional cheque & bank book
    chequeFile: Yup.mixed<File>()
      .notRequired()
      .test(
        "fileType-cheque",
        "* Cheque must be an image or PDF",
        (value) =>
          !value ||
          ["image/", "application/pdf"].some((t) => value.type.startsWith(t))
      ),
    bankBookFile: Yup.mixed<File>()
      .notRequired()
      .test(
        "fileType-bankbook",
        "* Bank book must be an image or PDF",
        (value) =>
          !value ||
          ["image/", "application/pdf"].some((t) => value.type.startsWith(t))
      ),
  });

  const uploadFile = async (file: File): Promise<string | null> => {
    try {
      const fileForm = new FormData();
      fileForm.append("file", file);
      const res = await axios.post("/api/getFileUrl", fileForm, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data.success) return res.data.fileUrl;
      ShowToast.error(res.data.message || "File upload failed");
      return null;
    } catch (error) {
      console.error("File upload error:", error);
      ShowToast.error("Failed to upload file");
      return null;
    }
  };

  const fetchUserById = async (
    userId: string,
    setFieldValue: (field: string, value: any) => void
  ) => {
    try {
      const res = await axios.get(`/api/users-operations?id=${userId}`);
      if (res.data.success && res.data.data) {
        const userData = res.data.data;
        setFieldValue("userName", userData.user_name);
        setFieldValue("contact", userData.contact || "");
      } else {
        ShowToast.error("User not found");
        setFieldValue("userName", "");
        setFieldValue("contact", "");
      }
    } catch (error) {
      console.error(error);
      ShowToast.error("Failed to fetch user");
    }
  };

  const verifyPanDetails = async (
    panNumber: string,
    panName: string,
    panDob: string,
    setFieldValue: (field: string, value: any) => void
  ) => {
    try {
      setVerifying(true);
      setLoading(true);

      if (!panNumber || !panName || !panDob) {
        ShowToast.error("Please fill all PAN details before verifying");
        return;
      }

      const res = await axios.post("/api/pancheck-operations", {
        pan_number: panNumber,
        pan_name: panName,
        pan_dob: panDob,
      });

      const panData = res.data?.data?.data;

      if (res.data.success && panData) {
        if (panData.status === "valid") {
          setPanVerified(true);
          ShowToast.success("PAN verified successfully!");

          setFieldValue("panVerify", true);
          setFieldValue("panCategory", panData.category || "");
          setFieldValue(
            "aadharSeeding",
            panData.aadhaar_seeding_status === "y"
          );
        } else {
          setPanVerified(false);
          ShowToast.error("Invalid PAN details. Please check and try again.");
          setFieldValue("panVerify", false);
          setFieldValue("panCategory", "");
          setFieldValue("aadharSeeding", false);
        }
      } else {
        setPanVerified(false);
        ShowToast.error(res.data.message || "PAN verification failed");
        setFieldValue("panVerify", false);
        setFieldValue("panCategory", "");
        setFieldValue("aadharSeeding", false);
      }
    } catch (err) {
      console.error("PAN verification error:", err);
      setPanVerified(false);
      ShowToast.error("Failed to verify PAN details. Please try again later.");
      setFieldValue("panVerify", false);
      setFieldValue("panCategory", "");
      setFieldValue("aadharSeeding", false);
    } finally {
      setVerifying(false);
      setLoading(false);
    }
  };

  const handleSubmit = async (
    values: WalletFormData,
    actions: FormikHelpers<WalletFormData>
  ) => {
    try {
      setLoading(true);

      if (!values.panVerify) {
        ShowToast.error("Please verify your PAN before submitting the form.");
        setLoading(false);
        return;
      }

      if (user.role === "admin") {
        const walletCheck = await axios.get(
          `/api/wallets-operations?user_id=${values.userId}`
        );
        // adjust based on your API response shape
        if (!walletCheck.data.success || walletCheck.data.exists) {
          ShowToast.error(
            "Wallet already exists for this user or user not found"
          );
          setLoading(false);
          return;
        }
      }

      // Upload files: front/back aadhar required; pan required; cheque/bankbook optional; legacy aadhar optional.
      const uploadPairs: Array<[File | null, string]> = [
        [values.aadharFront, "aadhar_front_file"],
        [values.aadharBack, "aadhar_back_file"],
        [values.aadharFile, "aadhar_file"], // legacy optional
        [values.panFile, "pan_file"],
        [values.chequeFile, "cheque_file"],
        [values.bankBookFile, "bank_book_file"],
      ];

      const uploadedUrls: Record<string, string | null> = {
        aadhar_front_file: null,
        aadhar_back_file: null,
        aadhar_file: null,
        pan_file: null,
        cheque_file: null,
        bank_book_file: null,
      };

      for (const [file, key] of uploadPairs) {
        if (file instanceof File) {
          const url = await uploadFile(file);
          if (!url) {
            // upload failed, abort submission
            setLoading(false);
            actions.setSubmitting(false);
            return;
          }
          uploadedUrls[key] = url;
        }
      }

      const payload = {
        user_id: values.userId,
        user_name: values.userName,
        rank: user?.rank || "none",
        contact: values.contact,
        account_holder_name: values.accountHolderName,
        bank_name: values.bankName,
        account_number: values.accountNumber,
        ifsc_code: values.ifscCode,
        gst_number: values.gstNumber || null,

        aadhar_number: values.aadharNumber,
        // files
        aadhar_front: uploadedUrls.aadhar_front_file,
        aadhar_back: uploadedUrls.aadhar_back_file,
        aadhar_file: uploadedUrls.aadhar_file, // legacy if present
        pan_file: uploadedUrls.pan_file,
        cheque: uploadedUrls.cheque_file,
        bank_book: uploadedUrls.bank_book_file,

        pan_number: values.panNumber,
        pan_name: values.panName,
        pan_dob: values.panDob,
        pan_verified: values.panVerify,
        pan_category: values.panCategory || null,
        aadhar_seeding: values.aadharSeeding || null,

        created_by: user.user_id,
        wallet_status: "active",
      };

      const res = await axios.post("/api/wallets-operations", payload);
      if (res.data.success) {
        ShowToast.success("Wallet added successfully!");
        router.push("/wallet/wallets");
      } else {
        ShowToast.error(res.data.message || "Failed to add wallet.");
      }
    } catch (error: any) {
      console.error("Add wallet error:", error);
      ShowToast.error(
        error.response?.data?.message ||
          "Something went wrong while adding wallet."
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
            {({ values, setFieldValue, errors, touched, handleBlur }) => {
              return (
                <Form className="grid grid-cols-1 gap-6">
                  {/* User Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                    <InputField
                      label="User ID"
                      name="userId"
                      placeholder="Enter User ID"
                      required
                      value={values.userId}
                      readOnly={user.role === "user"}
                      onChange={async (e) => {
                        const value = e.target.value;
                        setFieldValue("userId", value);
                        if (user.role === "admin" && value.length >= 4) {
                          // only fetch/check when admin and at least some length (you used 10 earlier)
                          try {
                            const res = await axios.get(
                              `/api/wallets-operations?user_id=${value}`
                            );
                            if (
                              res.data?.success &&
                              Array.isArray(res.data.data) &&
                              res.data.data.length > 0
                            ) {
                              ShowToast.error(
                                "This User ID already has a wallet"
                              );
                              setFieldValue("userId", "");
                              setFieldValue("userName", "");
                              setFieldValue("contact", "");
                              return;
                            }
                            await fetchUserById(value, setFieldValue);
                          } catch (err) {
                            console.error(err);
                            ShowToast.error("Error while checking wallet/user");
                          }
                        }
                      }}
                      onBlur={handleBlur}
                      error={touched.userId ? (errors as any).userId : ""}
                    />
                    <InputField
                      label="User Name"
                      name="userName"
                      placeholder="User Name"
                      value={values.userName}
                      readOnly
                      required
                    />
                    <InputField
                      label="Contact"
                      name="contact"
                      placeholder="Contact"
                      value={values.contact}
                      readOnly
                      required
                    />
                  </div>

                  {/* Account Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-0">
                    <InputField
                      label="Account Holder Name"
                      name="accountHolderName"
                      required
                      value={values.accountHolderName}
                      onChange={(e) =>
                        setFieldValue("accountHolderName", e.target.value)
                      }
                      onBlur={handleBlur}
                      error={
                        touched.accountHolderName
                          ? (errors as any).accountHolderName
                          : ""
                      }
                    />
                    <InputField
                      label="Bank Name"
                      name="bankName"
                      value={values.bankName}
                      required
                      onChange={(e) =>
                        setFieldValue("bankName", e.target.value)
                      }
                      onBlur={handleBlur}
                      error={touched.bankName ? (errors as any).bankName : ""}
                    />
                    <InputField
                      label="Account Number"
                      name="accountNumber"
                      value={values.accountNumber}
                      required
                      onChange={(e) =>
                        setFieldValue("accountNumber", e.target.value)
                      }
                      onBlur={handleBlur}
                      error={
                        touched.accountNumber
                          ? (errors as any).accountNumber
                          : ""
                      }
                    />
                    <PasswordInput
                      label="Confirm Account Number"
                      name="confirmAccountNumber"
                      value={values.confirmAccountNumber}
                      onChange={(e) =>
                        setFieldValue("confirmAccountNumber", e.target.value)
                      }
                      required
                      onBlur={handleBlur}
                      error={
                        touched.confirmAccountNumber
                          ? (errors as any).confirmAccountNumber
                          : ""
                      }
                    />
                    <InputField
                      label="IFSC Code"
                      name="ifscCode"
                      value={values.ifscCode}
                      required
                      onChange={(e) =>
                        setFieldValue("ifscCode", e.target.value)
                      }
                      onBlur={handleBlur}
                      error={touched.ifscCode ? (errors as any).ifscCode : ""}
                    />

                    <FileInput
                      label="Cancelled Cheque (optional)"
                      name="chequeFile"
                      required
                      value={values.chequeFile}
                      onChange={(e) =>
                        setFieldValue(
                          "chequeFile",
                          e.currentTarget.files?.[0] || null
                        )
                      }
                      onBlur={handleBlur}
                      error={
                        touched.chequeFile ? (errors as any).chequeFile : ""
                      }
                    />
                    <FileInput
                      label="Bank Book (optional)"
                      className="p-0"
                      name="bankBookFile"
                      value={values.bankBookFile}
                      onChange={(e) =>
                        setFieldValue(
                          "bankBookFile",
                          e.currentTarget.files?.[0] || null
                        )
                      }
                      onBlur={handleBlur}
                      error={
                        touched.bankBookFile ? (errors as any).bankBookFile : ""
                      }
                    />
                    <InputField
                      label="GST Number (optional)"
                      className="p-0"
                      name="gstNumber"
                      value={values.gstNumber}
                      onChange={(e) =>
                        setFieldValue("gstNumber", e.target.value)
                      }
                      onBlur={handleBlur}
                      error={touched.gstNumber ? (errors as any).gstNumber : ""}
                    />
                  </div>

                  {/* PAN Details Heading */}
                  <div className="flex items-center gap-2">
                    <p className="text-xl max-md:text-[1rem] font-semibold">
                      PAN Details
                    </p>
                    {panVerified && (
                      <RiVerifiedBadgeFill className="text-green-600 text-2xl" />
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 mt-2 lg:-mt-3">
                    <InputField
                      label="PAN Number"
                      name="panNumber"
                      required
                      value={values.panNumber}
                      onChange={(e) =>
                        setFieldValue("panNumber", e.target.value)
                      }
                      onBlur={handleBlur}
                      error={touched.panNumber ? (errors as any).panNumber : ""}
                    />
                    <InputField
                      label="Name as in PAN"
                      name="panName"
                      required
                      value={values.panName}
                      onChange={(e) => setFieldValue("panName", e.target.value)}
                      onBlur={handleBlur}
                      error={touched.panName ? (errors as any).panName : ""}
                    />
                    <InputField
                      label="Date of Birth as in PAN"
                      type="date"
                      name="panDob"
                      className="uppercase"
                      required
                      value={values.panDob}
                      onChange={(e) => setFieldValue("panDob", e.target.value)}
                      onBlur={handleBlur}
                      error={touched.panDob ? (errors as any).panDob : ""}
                    />
                    <FileInput
                      label="Upload PAN"
                      name="panFile"
                      required
                      value={values.panFile}
                      onChange={(e) =>
                        setFieldValue(
                          "panFile",
                          e.currentTarget.files?.[0] || null
                        )
                      }
                      onBlur={handleBlur}
                      error={touched.panFile ? (errors as any).panFile : ""}
                    />
                    <div className="max-md:hidden "></div>

                    {/* Verify PAN Button */}
                    <div className="flex items-center gap-2 mt-0 ml-auto">
                      <button
                        type="button"
                        disabled={verifying}
                        className={`px-4 py-2 rounded-lg font-semibold text-sm  transition-colors cursor-pointer ${
                          verifying
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-[#106187] text-white font-semibold"
                        }`}
                        onClick={async () => {
                          if (
                            !values.panNumber ||
                            !values.panName ||
                            !values.panDob ||
                            !values.panFile
                          ) {
                            ShowToast.error(
                              "Please fill all PAN details and upload PAN file before verifying"
                            );
                            return;
                          }
                          await verifyPanDetails(
                            values.panNumber,
                            values.panName,
                            values.panDob,
                            setFieldValue
                          );
                        }}
                      >
                        {verifying ? "Verifying..." : "Verify PAN"}
                      </button>
                    </div>
                  </div>

                  {/* Aadhaar front/back */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-2">
                    <InputField
                      label="Aadhar Number"
                      name="aadharNumber"
                      required
                      value={values.aadharNumber}
                      onChange={(e) =>
                        setFieldValue("aadharNumber", e.target.value)
                      }
                      onBlur={handleBlur}
                      error={
                        touched.aadharNumber ? (errors as any).aadharNumber : ""
                      }
                    />
                    <FileInput
                      label="Aadhar Front"
                      name="aadharFront"
                      required
                      value={values.aadharFront}
                      onChange={(e) =>
                        setFieldValue(
                          "aadharFront",
                          e.currentTarget.files?.[0] || null
                        )
                      }
                      onBlur={handleBlur}
                      error={
                        touched.aadharFront ? (errors as any).aadharFront : ""
                      }
                    />
                    <FileInput
                      label="Aadhar Back"
                      name="aadharBack"
                      required
                      value={values.aadharBack}
                      onChange={(e) =>
                        setFieldValue(
                          "aadharBack",
                          e.currentTarget.files?.[0] || null
                        )
                      }
                      onBlur={handleBlur}
                      error={
                        touched.aadharBack ? (errors as any).aadharBack : ""
                      }
                    />
                  </div>

                  {/* Submit */}
                  <div className="flex justify-end mt-6">
                    <SubmitButton type="submit">
                      {loading ? "Submitting..." : "Submit"}
                    </SubmitButton>
                  </div>
                </Form>
              );
            }}
          </Formik>
        </div>
      </div>
    </Layout>
  );
}

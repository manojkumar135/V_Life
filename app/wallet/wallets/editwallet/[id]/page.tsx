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
import Loader from "@/components/common/loader";
import { RiVerifiedBadgeFill } from "react-icons/ri";
import { useVLife } from "@/store/context";

interface WalletFormData {
  walletId: string;
  userId: string;
  userName: string;
  contact: string;
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;

  // new optional fields (may be string URL from server or File or null)
  gstNumber?: string | null;
  cheque?: string | File | null;
  bankBook?: string | File | null;
  aadharFront?: string | File | null;
  aadharBack?: string | File | null;

  // existing aadhar/pan (legacy)
  aadharFile: string | File | null;
  panFile: string | File | null;

  aadharNumber: string;
  panNumber: string;
  panName: string;
  panDob: string;
  panVerify: boolean;
  panCategory: string;
  aadharSeeding: boolean;
}

const WalletSchema = Yup.object().shape({
  accountHolderName: Yup.string().required("Account Holder Name is required"),
  bankName: Yup.string().required("Bank Name is required"),
  accountNumber: Yup.string()
    .matches(/^\d{9,18}$/, "Account number must be 9 to 18 digits")
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
  panName: Yup.string().required("Name as in PAN is required"),
  panDob: Yup.date().required("Date of Birth as in PAN is required"),

  // aadharFile and panFile can be existing URL string OR File (for edit page)
  aadharFile: Yup.mixed<string | File>()
    .required("Aadhaar file is required")
    .test(
      "fileType-aadhar",
      "Aadhaar must be an image or PDF",
      (value) =>
        !value ||
        typeof value === "string" ||
        (value instanceof File &&
          ["image/", "application/pdf"].some((type) =>
            value.type.startsWith(type)
          ))
    ),
  panFile: Yup.mixed<string | File>()
    .required("PAN file is required")
    .test(
      "fileType-pan",
      "PAN must be an image or PDF",
      (value) =>
        !value ||
        typeof value === "string" ||
        (value instanceof File &&
          ["image/", "application/pdf"].some((type) =>
            value.type.startsWith(type)
          ))
    ),

  // new optional fields validations: allow string (existing URL) or File
  gstNumber: Yup.string()
    .matches(/^[0-9A-Z]{15}$/, "Invalid GSTIN")
    .notRequired()
    .nullable()
    .transform((v) => (v === "" ? null : v)),
  cheque: Yup.mixed<string | File>()
    .notRequired()
    .test(
      "fileType-cheque",
      "Cheque must be an image or PDF",
      (value) =>
        !value ||
        typeof value === "string" ||
        (value instanceof File &&
          ["image/", "application/pdf"].some((type) =>
            value.type.startsWith(type)
          ))
    ),
  bankBook: Yup.mixed<string | File>()
    .notRequired()
    .test(
      "fileType-bankbook",
      "Bank book must be an image or PDF",
      (value) =>
        !value ||
        typeof value === "string" ||
        (value instanceof File &&
          ["image/", "application/pdf"].some((type) =>
            value.type.startsWith(type)
          ))
    ),
  aadharFront: Yup.mixed<string | File>()
    .required("Aadhaar front is required")
    .test(
      "fileType-aadharFront",
      "Aadhaar front must be an image or PDF",
      (value) =>
        !value ||
        typeof value === "string" ||
        (value instanceof File &&
          ["image/", "application/pdf"].some((type) =>
            value.type.startsWith(type)
          ))
    ),
  aadharBack: Yup.mixed<string | File>()
    .required("Aadhaar back is required")
    .test(
      "fileType-aadharBack",
      "Aadhaar back must be an image or PDF",
      (value) =>
        !value ||
        typeof value === "string" ||
        (value instanceof File &&
          ["image/", "application/pdf"].some((type) =>
            value.type.startsWith(type)
          ))
    ),
});

export default function EditWalletPage() {
  const router = useRouter();
  const params = useParams();
  const walletId = params?.id as string;
  const { user } = useVLife();
  const isAdmin = user?.role === "admin";

  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [panVerified, setPanVerified] = useState(false);
  const [initialValues, setInitialValues] = useState<WalletFormData>({
    walletId: "",
    userId: "",
    userName: "",
    contact: "",
    accountHolderName: "",
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    gstNumber: null,
    cheque: null,
    bankBook: null,
    aadharFront: null,
    aadharBack: null,
    aadharNumber: "",
    panNumber: "",
    panName: "",
    panDob: "",
    panVerify: false,
    panCategory: "",
    aadharSeeding: false,
    aadharFile: null,
    panFile: null,
  });

  // Fetch wallet data
  useEffect(() => {
    if (!walletId) return;

    const fetchWallet = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(
          `/api/wallets-operations?wallet_id=${walletId}`
        );
        if (data?.data) {
          const wallet = data.data;
          setInitialValues({
            walletId: wallet.wallet_id || "",
            userId: wallet.user_id || "",
            userName: wallet.user_name || "",
            contact: wallet.contact || "",
            accountHolderName: wallet.account_holder_name || "",
            bankName: wallet.bank_name || "",
            accountNumber: wallet.account_number || "",
            ifscCode: wallet.ifsc_code || "",
            gstNumber: wallet.gst_number || null,
            cheque: wallet.cheque || null,
            bankBook: wallet.bank_book || null,
            aadharFront: wallet.aadhar_front || null,
            aadharBack: wallet.aadhar_back || null,
            aadharNumber: wallet.aadhar_number || "",
            panNumber: wallet.pan_number || "",
            panName: wallet.pan_name || "",
            panDob: wallet.pan_dob || "",
            panVerify: wallet.pan_verified || false,
            panCategory: wallet.pan_category || "",
            aadharSeeding: wallet.aadhar_seeding || false,
            aadharFile: wallet.aadhar_file || null,
            panFile: wallet.pan_file || null,
          });
          setPanVerified(wallet.pan_verified || false);
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
          // ✅ PAN Verified successfully
          setPanVerified(true);
          ShowToast.success("PAN verified successfully!");

          // Update Formik fields
          setFieldValue("panVerify", true);
          setFieldValue("panCategory", panData.category || "");
          setFieldValue(
            "aadharSeeding",
            panData.aadhaar_seeding_status === "y" ? true : false
          );
        } else {
          // ❌ Invalid PAN
          setPanVerified(false);
          ShowToast.error("Invalid PAN details. Please check and try again.");

          setFieldValue("panVerify", false);
          setFieldValue("panCategory", "");
          setFieldValue("aadharSeeding", false);
        }
      } else {
        // ❌ API returned unexpected result
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

      // Prepare upload URLs (if field is a File upload, upload it; if string, keep it)
      let aadharFileUrl: string | null =
        typeof values.aadharFile === "string" ? values.aadharFile : null;
      let panFileUrl: string | null =
        typeof values.panFile === "string" ? values.panFile : null;

      // New fields (may be string URLs already or File)
      let aadharFrontUrl: string | null =
        typeof values.aadharFront === "string" ? values.aadharFront : null;
      let aadharBackUrl: string | null =
        typeof values.aadharBack === "string" ? values.aadharBack : null;
      let chequeUrl: string | null =
        typeof values.cheque === "string" ? values.cheque : null;
      let bankBookUrl: string | null =
        typeof values.bankBook === "string" ? values.bankBook : null;

      // Upload legacy files if File
      if (values.aadharFile instanceof File) {
        aadharFileUrl = await uploadFile(values.aadharFile);
      }
      if (values.panFile instanceof File) {
        panFileUrl = await uploadFile(values.panFile);
      }

      // Upload new fields if they are File instances
      if (values.aadharFront instanceof File) {
        aadharFrontUrl = await uploadFile(values.aadharFront);
      }
      if (values.aadharBack instanceof File) {
        aadharBackUrl = await uploadFile(values.aadharBack);
      }
      if (values.cheque instanceof File) {
        chequeUrl = await uploadFile(values.cheque);
      }
      if (values.bankBook instanceof File) {
        bankBookUrl = await uploadFile(values.bankBook);
      }

      // If required files are missing after upload, abort
      // aadharFront and aadharBack are required per AddWallet behavior — preserve that here
      if (!aadharFrontUrl || !aadharBackUrl) {
        ShowToast.error("Aadhaar front and back are required.");
        setLoading(false);
        actions.setSubmitting(false);
        return;
      }
      if (!panFileUrl) {
        ShowToast.error("PAN file is required.");
        setLoading(false);
        actions.setSubmitting(false);
        return;
      }
      if (!aadharFileUrl) {
        // legacy was required in original; keep same requirement if you want, otherwise comment out this check
        // But in add-wallet we treat front/back as required and legacy single aadhar optional.
        // To avoid breaking original behavior, do NOT force legacy aadhar here.
        // aadharFileUrl may be null and that's acceptable because aadharFront/Back are present.
        // So we won't abort for missing aadharFileUrl.
      }

      const payload = {
        account_holder_name: values.accountHolderName,
        bank_name: values.bankName,
        account_number: values.accountNumber,
        ifsc_code: values.ifscCode,

        gst_number: values.gstNumber || null,
        cheque: chequeUrl || null,
        bank_book: bankBookUrl || null,

        aadhar_number: values.aadharNumber,
        aadhar_front: aadharFrontUrl,
        aadhar_back: aadharBackUrl,
        aadhar_file: aadharFileUrl || null,

        pan_number: values.panNumber,
        pan_name: values.panName,
        pan_dob: values.panDob,
        pan_verified: values.panVerify,
        pan_category: values.panCategory,
        aadhar_seeding: values.aadharSeeding,
        pan_file: panFileUrl,
        last_modified_by: user?.user_id || "admin",
      };

      const res = await axios.patch(
        `/api/wallets-operations?wallet_id=${walletId}`,
        payload
      );

      if (res.data.success) {
        ShowToast.success("Wallet updated successfully!");
        router.push("/wallet/wallets");
      } else {
        ShowToast.error(res.data.message || "Failed to update wallet.");
      }
    } catch (error: any) {
      console.error("Update wallet error:", error);
      ShowToast.error(
        error.response?.data?.message ||
          "Something went wrong while updating wallet."
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
        <div className="flex items-center mb-4">
          <IoIosArrowBack
            size={25}
            className="mr-3 cursor-pointer"
            onClick={() => router.push("/wallet/wallets")}
          />
          <h2 className="text-xl max-sm:text-[1rem] font-semibold">
            Edit Wallet
          </h2>
        </div>

        <div className="rounded-xl p-6 bg-white">
          <Formik
            enableReinitialize
            initialValues={initialValues}
            validationSchema={WalletSchema}
            onSubmit={handleSubmit}
          >
            {({ values, setFieldValue, errors, touched, handleBlur }) => (
              <Form className="grid grid-cols-1 gap-4">
                {/* Readonly fields */}
                <div className="grid grid-cols-1  md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 -mt-3">
                  <InputField
                    label="Wallet ID"
                    name="walletId"
                    value={values.walletId}
                    disabled
                  />
                  <InputField
                    label="User ID"
                    name="userId"
                    value={values.userId}
                    disabled
                  />
                  <InputField
                    label="User Name"
                    name="userName"
                    value={values.userName}
                    disabled
                  />
                  <InputField
                    label="Contact"
                    name="contact"
                    value={values.contact}
                    disabled
                  />
                  <InputField
                    label="Account Holder Name"
                    name="accountHolderName"
                    value={values.accountHolderName}
                    onChange={(e) =>
                      setFieldValue("accountHolderName", e.target.value)
                    }
                    onBlur={handleBlur}
                    error={
                      touched.accountHolderName ? errors.accountHolderName : ""
                    }
                    disabled={!isAdmin}
                  />
                  <InputField
                    label="Bank Name"
                    name="bankName"
                    value={values.bankName}
                    onChange={(e) => setFieldValue("bankName", e.target.value)}
                    onBlur={handleBlur}
                    error={touched.bankName ? errors.bankName : ""}
                    disabled={!isAdmin}
                  />
                  <InputField
                    label="Account Number"
                    name="accountNumber"
                    value={values.accountNumber}
                    onChange={(e) =>
                      setFieldValue("accountNumber", e.target.value)
                    }
                    onBlur={handleBlur}
                    error={touched.accountNumber ? errors.accountNumber : ""}
                    disabled={!isAdmin}
                  />
                  <InputField
                    label="IFSC Code"
                    name="ifscCode"
                    value={values.ifscCode}
                    onChange={(e) => setFieldValue("ifscCode", e.target.value)}
                    onBlur={handleBlur}
                    error={touched.ifscCode ? errors.ifscCode : ""}
                    disabled={!isAdmin}
                  />
                  <FileInput
                    label="Cancelled Cheque"
                    name="cheque"
                    required
                    value={values.cheque || null}
                    onChange={(e) =>
                      setFieldValue(
                        "cheque",
                        e.currentTarget.files?.[0] || values.cheque
                      )
                    }
                    onBlur={handleBlur}
                    error={touched.cheque ? (errors as any).cheque : ""}
                    // disabled={!isAdmin}
                  />
                  <FileInput
                    label="Bank Book Front"
                    name="bankBook"
                    value={values.bankBook || null}
                    onChange={(e) =>
                      setFieldValue(
                        "bankBook",
                        e.currentTarget.files?.[0] || values.bankBook
                      )
                    }
                    onBlur={handleBlur}
                    error={touched.bankBook ? (errors as any).bankBook : ""}
                    // disabled={!isAdmin}
                  />
                  <InputField
                    label="GST Number (optional)"
                    name="gstNumber"
                    value={values.gstNumber || ""}
                    onChange={(e) => setFieldValue("gstNumber", e.target.value)}
                    onBlur={handleBlur}
                    error={touched.gstNumber ? (errors as any).gstNumber : ""}
                    disabled={!isAdmin}
                  />
                </div>

                {/* New: GST / Cheque / Bank Book */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4"></div>

                {/* PAN Section */}
                <div className="mt-2">
                  <div className="flex items-center gap-2">
                    <p className="text-xl max-md:text-[1rem] font-semibold">
                      PAN Details
                    </p>
                    {panVerified && (
                      <RiVerifiedBadgeFill className="text-green-600 text-2xl" />
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 mt-2">
                    <InputField
                      label="PAN Number"
                      name="panNumber"
                      value={values.panNumber}
                      onChange={(e) =>
                        setFieldValue("panNumber", e.target.value)
                      }
                      onBlur={handleBlur}
                      error={touched.panNumber ? errors.panNumber : ""}
                      disabled={!isAdmin}
                    />
                    <InputField
                      label="Name as in PAN"
                      name="panName"
                      value={values.panName}
                      onChange={(e) => setFieldValue("panName", e.target.value)}
                      onBlur={handleBlur}
                      error={touched.panName ? errors.panName : ""}
                      disabled={!isAdmin}
                    />
                    <InputField
                      label="Date of Birth as in PAN"
                      type="date"
                      name="panDob"
                      value={values.panDob}
                      className="uppercase"
                      onChange={(e) => setFieldValue("panDob", e.target.value)}
                      onBlur={handleBlur}
                      error={touched.panDob ? errors.panDob : ""}
                      disabled={!isAdmin}
                    />
                    <FileInput
                      label="Upload PAN"
                      name="panFile"
                      value={values.panFile || null}
                      onChange={(e) =>
                        setFieldValue(
                          "panFile",
                          e.currentTarget.files?.[0] || values.panFile
                        )
                      }
                      onBlur={handleBlur}
                      error={touched.panFile ? (errors as any).panFile : ""}
                      // keep upload enabled for admin only
                      // disabled={!isAdmin}
                    />
                    <div className="max-md:hidden "></div>

                    {isAdmin && (
                      <div className="flex items-center gap-2 mt-2 ml-auto">
                        <button
                          type="button"
                          disabled={verifying}
                          className={`px-4 py-2 rounded-lg font-semibold text-sm cursor-pointer ${
                            verifying
                              ? "bg-gray-400 cursor-not-allowed"
                              : "bg-[#106187] text-white font-semibold "
                          }`}
                          onClick={() =>
                            verifyPanDetails(
                              values.panNumber,
                              values.panName,
                              values.panDob,
                              setFieldValue
                            )
                          }
                        >
                          {verifying ? "Verifying..." : "Verify PAN"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Aadhaar front/back & legacy aadhar */}
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
                    disabled={!isAdmin}
                  />
                  <FileInput
                    label="Aadhar Front"
                    name="aadharFront"
                    required
                    value={values.aadharFront || null}
                    onChange={(e) =>
                      setFieldValue(
                        "aadharFront",
                        e.currentTarget.files?.[0] || values.aadharFront
                      )
                    }
                    onBlur={handleBlur}
                    error={
                      touched.aadharFront ? (errors as any).aadharFront : ""
                    }
                    // disabled={!isAdmin}
                  />
                  <FileInput
                    label="Aadhar Back"
                    name="aadharBack"
                    required
                    value={values.aadharBack || null}
                    onChange={(e) =>
                      setFieldValue(
                        "aadharBack",
                        e.currentTarget.files?.[0] || values.aadharBack
                      )
                    }
                    onBlur={handleBlur}
                    error={touched.aadharBack ? (errors as any).aadharBack : ""}
                    // disabled={!isAdmin}
                  />
                </div>

                {/* Submit */}
                {isAdmin && (
                  <div className="flex justify-end mt-6">
                    <SubmitButton type="submit">UPDATE</SubmitButton>
                  </div>
                )}
              </Form>
            )}
          </Formik>
        </div>
      </div>
    </Layout>
  );
}

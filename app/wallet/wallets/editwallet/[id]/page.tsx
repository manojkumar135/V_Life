"use client";

// app/wallet/wallets/editwallet/[id]/page.tsx
import React, { useState, useEffect, Suspense } from "react";
import Layout from "@/layout/Layout";
import { IoIosArrowBack } from "react-icons/io";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import InputField from "@/components/InputFields/inputtype1";
import FileInput from "@/components/InputFields/fileinput";
import SubmitButton from "@/components/common/submitbutton";
import { Formik, Form, FormikHelpers } from "formik";
import * as Yup from "yup";
import axios from "axios";
import ShowToast from "@/components/common/Toast/toast";
import Loader from "@/components/common/loader";
import { RiVerifiedBadgeFill } from "react-icons/ri";
import { GrStatusGood } from "react-icons/gr";
import { MdCancel, MdOutlinePending } from "react-icons/md";
import {
  MdOutlineCreditCard,
  MdAccountBalance,
  MdOutlineCompareArrows,
} from "react-icons/md";
import { FaIdCard } from "react-icons/fa";
import { IoChevronDownOutline, IoChevronUpOutline } from "react-icons/io5";
import { useVLife } from "@/store/context";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface WalletFormData {
  walletId: string;
  userId: string;
  userName: string;
  contact: string;
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  gstNumber?: string | null;
  cheque?: string | File | null;
  bankBook?: string | File | null;
  aadharFront?: string | File | null;
  aadharBack?: string | File | null;
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

/* ------------------------------------------------------------------ */
/* Validation Schema                                                   */
/* ------------------------------------------------------------------ */

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
  panFile: Yup.mixed<string | File>()
    .required("PAN file is required")
    .test(
      "fileType-pan",
      "PAN must be an image or PDF",
      (value) =>
        !value ||
        typeof value === "string" ||
        (value instanceof File &&
          ["image/", "application/pdf"].some((t) => value.type.startsWith(t))),
    ),
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
          ["image/", "application/pdf"].some((t) => value.type.startsWith(t))),
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
          ["image/", "application/pdf"].some((t) => value.type.startsWith(t))),
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
          ["image/", "application/pdf"].some((t) => value.type.startsWith(t))),
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
          ["image/", "application/pdf"].some((t) => value.type.startsWith(t))),
    ),
});

/* ------------------------------------------------------------------ */
/* Comparison table field definitions                                  */
/* ------------------------------------------------------------------ */

const TEXT_COMPARE_FIELDS: Array<[string, string]> = [
  ["Account Holder Name", "account_holder_name"],
  ["Bank Name", "bank_name"],
  ["Account Number", "account_number"],
  ["IFSC Code", "ifsc_code"],
  ["Aadhaar Number", "aadhar_number"],
  ["PAN Number", "pan_number"],
  ["Name as in PAN", "pan_name"],
  ["Date of Birth (PAN)", "pan_dob"],
  ["GST Number", "gst_number"],
];

const FILE_COMPARE_FIELDS: Array<[string, string]> = [
  ["Cancelled Cheque", "cheque"],
  ["Bank Book Front", "bank_book"],
  ["Aadhaar Front", "aadhar_front"],
  ["Aadhaar Back", "aadhar_back"],
  ["PAN File", "pan_file"],
  ["Aadhaar File", "aadhar_file"],
];

/* ------------------------------------------------------------------ */
/* File cell helpers                                                   */
/* ------------------------------------------------------------------ */

const fileLabel = (url: string | null | undefined): string => {
  if (!url) return "—";
  try {
    const parts = new URL(url).pathname.split("/");
    const name = parts[parts.length - 1];
    return name.length > 32 ? name.slice(0, 14) + "…" + name.slice(-10) : name;
  } catch {
    return "File";
  }
};

const FileCell = ({
  url,
  label,
}: {
  url: string | null | undefined;
  label: string;
}) => {
  if (!url) return <span className="text-gray-400">—</span>;
  const isImage = /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url);
  const isPdf = /\.pdf(\?|$)/i.test(url);
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 hover:underline"
      title={url}
    >
      {isImage ? (
        <img
          src={url}
          alt={label}
          className="w-10 h-10 object-cover rounded border border-gray-200 shrink-0"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      ) : isPdf ? (
        <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-semibold shrink-0">
          PDF
        </span>
      ) : (
        <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded shrink-0">
          FILE
        </span>
      )}
      <span className="text-blue-600 text-xs break-all">{fileLabel(url)}</span>
    </a>
  );
};

/* ------------------------------------------------------------------ */
/* Status badge                                                        */
/* ------------------------------------------------------------------ */

const StatusBadge = ({ status }: { status: string }) => {
  const s = status?.toLowerCase();
  if (s === "approved")
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-700 border border-green-300">
        <GrStatusGood size={15} /> Approved
      </span>
    );
  if (s === "rejected")
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-600 border border-red-300">
        <MdCancel size={16} /> Rejected
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-700 border border-yellow-300">
      <MdOutlinePending size={16} /> Pending
    </span>
  );
};

/* ------------------------------------------------------------------ */
/* Section Card wrapper                                                */
/* ------------------------------------------------------------------ */

const SectionCard = ({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
    <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50">
      <div className="w-9 h-9 rounded-lg bg-[#106187]/10 flex items-center justify-center text-[#106187] flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className="font-semibold text-gray-800 text-sm">{title}</p>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    <div className="px-6 py-5">{children}</div>
  </div>
);

/* ================================================================== */
/* Inner Page (uses useSearchParams — must be inside Suspense)        */
/* ================================================================== */

function EditWalletInner() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const walletId = params?.id as string;
  const { user } = useVLife();
  const isAdmin = user?.role === "admin";

  const modeParam = searchParams?.get("mode") ?? null;
  const reqIdParam = searchParams?.get("request_id") ?? null;
  const isRequestMode = modeParam === "request" && !!reqIdParam;

  /* ── Back navigation ─────────────────────────────────────────────── */
  const handleBack = () => {
    if (isRequestMode) {
      router.push("/wallet/change-requests");
    } else {
      router.push("/wallet/wallets");
    }
  };

  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [panVerified, setPanVerified] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<any>(null);
  const [savedWalletValues, setSavedWalletValues] = useState<any>(null);
  const [compareOpen, setCompareOpen] = useState(false);

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

  /* ── Populate form on mount ────────────────────────────────────────── */
  useEffect(() => {
    if (!user) return;
    if (isRequestMode && reqIdParam) {
      loadFromRequest(reqIdParam);
    } else if (walletId && walletId !== "new") {
      loadFromWallet(walletId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletId, isRequestMode, reqIdParam, user]);

  /* ── Map source → form values ──────────────────────────────────────── */
  const applySource = (walletMeta: any | null, source: any) => {
    setInitialValues({
      walletId: walletMeta?.wallet_id || source?.wallet_id || "",
      userId: walletMeta?.user_id || source?.user_id || "",
      userName: walletMeta?.user_name || source?.user_name || "",
      contact: walletMeta?.contact || source?.contact || "",
      accountHolderName: source?.account_holder_name || "",
      bankName: source?.bank_name || "",
      accountNumber: source?.account_number || "",
      ifscCode: source?.ifsc_code || "",
      gstNumber: source?.gst_number || null,
      cheque: source?.cheque || null,
      bankBook: source?.bank_book || null,
      aadharFront: source?.aadhar_front || null,
      aadharBack: source?.aadhar_back || null,
      aadharNumber: source?.aadhar_number || "",
      panNumber: source?.pan_number || "",
      panName: source?.pan_name || "",
      panDob: source?.pan_dob || "",
      panVerify:
        source?.pan_verified === true || source?.pan_verified === "Yes",
      panCategory: source?.pan_category || "",
      aadharSeeding: source?.aadhar_seeding || false,
      aadharFile: source?.aadhar_file || null,
      panFile: source?.pan_file || null,
    });
  };

  /* ── MODE 1: load wallet for direct edit ──────────────────────────── */
  const loadFromWallet = async (wid: string) => {
    try {
      setLoading(true);
      const { data } = await axios.get(
        `/api/wallets-operations?wallet_id=${wid}`,
      );
      if (!data?.data) {
        ShowToast.error("Wallet not found");
        return;
      }

      const wallet = data.data;
      const pending = await fetchPendingRequest(wallet.user_id);
      const source = isAdmin ? wallet : pending?.new_values || wallet;
      applySource(wallet, source);
      setPanVerified(
        source?.pan_verified === true || source?.pan_verified === "Yes",
      );
    } catch (err) {
      console.error(err);
      ShowToast.error("Failed to fetch wallet");
    } finally {
      setLoading(false);
    }
  };

  /* ── MODE 2: load a specific change request ───────────────────────── */
  const loadFromRequest = async (requestId: string) => {
    try {
      setLoading(true);

      const { data: reqData } = await axios.get(
        `/api/wallet-change-requests?search=${requestId}`,
      );
      const requests: any[] = reqData?.data || [];
      const req = requests.find((r: any) => r.request_id === requestId);

      if (!req) {
        ShowToast.error("Change request not found");
        return;
      }

      setPendingRequest(req);
      const newVals = req.new_values || {};

      if (req.request_type === "new_wallet") {
        setSavedWalletValues(null);
        applySource(null, newVals);
       setPanVerified(
  newVals?.pan_verified === true ||
  newVals?.pan_verified === "Yes"
);
        return;
      }

      let currentWallet: any = null;
      if (req.wallet_id) {
        try {
          const { data: wData } = await axios.get(
            `/api/wallets-operations?wallet_id=${req.wallet_id}`,
          );
          currentWallet = wData?.data || null;
        } catch {
          /* wallet may not exist yet */
        }
      }

      setSavedWalletValues(currentWallet);
      const mergedSource = {
        ...newVals,
        pan_verified:
          newVals?.pan_verified === true || newVals?.pan_verified === "Yes"
            ? newVals.pan_verified
            : currentWallet?.pan_verified,
      };
      applySource(currentWallet, mergedSource);
      setPanVerified(
        mergedSource?.pan_verified === true ||
          mergedSource?.pan_verified === "Yes",
      );
    } catch (err) {
      console.error(err);
      ShowToast.error("Failed to fetch change request");
    } finally {
      setLoading(false);
    }
  };

  /* ── Fetch pending request by userId ─────────────────────────────── */
  const fetchPendingRequest = async (userId: string) => {
    try {
      const res = await axios.get(
        `/api/wallet-change-requests?user_id=${userId}&status=pending`,
      );
      if (res.data.success && res.data.data.length > 0) {
        const req = res.data.data[0];
        setPendingRequest(req);
        return req;
      }
      return null;
    } catch {
      return null;
    }
  };

  /* ── File upload helper ─────────────────────────────────────────────── */
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

  /* ── PAN verification ─────────────────────────────────────────────── */
  const verifyPanDetails = async (
    panNumber: string,
    panName: string,
    panDob: string,
    setFieldValue: (field: string, value: any) => void,
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

      console.log(res, "pan");
      const panData = res.data?.data?.data;
      if (res.data.success && panData) {
        if (panData.status === "valid") {
          setPanVerified(true);
          ShowToast.success("PAN verified successfully!");
          setFieldValue("panVerify", true);
          setFieldValue("panCategory", panData.category || "");
          setFieldValue(
            "aadharSeeding",
            panData.aadhaar_seeding_status === "y",
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

  const resetPanVerification = (setFieldValue: any) => {
    setPanVerified(false);
    setFieldValue("panVerify", false);
    setFieldValue("panCategory", "");
    setFieldValue("aadharSeeding", false);
  };

  /* ── Reject handler ─────────────────────────────────────────────── */
  const handleReject = async () => {
    if (!pendingRequest) return;
    try {
      setLoading(true);
      const res = await axios.patch(
        `/api/wallet-change-requests/${pendingRequest.request_id}`,
        { action: "rejected", admin_id: user?.user_id },
      );
      if (res.data.success) {
        ShowToast.success("Request rejected successfully.");
        handleBack();
      } else {
        ShowToast.error(res.data.message || "Failed to reject request.");
      }
    } catch (error: any) {
      ShowToast.error(
        error.response?.data?.message ||
          "Something went wrong while rejecting.",
      );
    } finally {
      setLoading(false);
    }
  };

  /* ── Form submit ─────────────────────────────────────────────────── */
  const handleSubmit = async (
    values: WalletFormData,
    actions: FormikHelpers<WalletFormData>,
  ) => {
    try {
      setLoading(true);

      let aadharFileUrl: string | null =
        typeof values.aadharFile === "string" ? values.aadharFile : null;
      let panFileUrl: string | null =
        typeof values.panFile === "string" ? values.panFile : null;
      let aadharFrontUrl: string | null =
        typeof values.aadharFront === "string" ? values.aadharFront : null;
      let aadharBackUrl: string | null =
        typeof values.aadharBack === "string" ? values.aadharBack : null;
      let chequeUrl: string | null =
        typeof values.cheque === "string" ? values.cheque : null;
      let bankBookUrl: string | null =
        typeof values.bankBook === "string" ? values.bankBook : null;

      if (values.aadharFile instanceof File)
        aadharFileUrl = await uploadFile(values.aadharFile);
      if (values.panFile instanceof File)
        panFileUrl = await uploadFile(values.panFile);
      if (values.aadharFront instanceof File)
        aadharFrontUrl = await uploadFile(values.aadharFront);
      if (values.aadharBack instanceof File)
        aadharBackUrl = await uploadFile(values.aadharBack);
      if (values.cheque instanceof File)
        chequeUrl = await uploadFile(values.cheque);
      if (values.bankBook instanceof File)
        bankBookUrl = await uploadFile(values.bankBook);

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
        requested_role: user.role,
      };

      /* Request-mode + admin + pending → approve */
      if (isRequestMode && isAdmin && pendingRequest?.status === "pending") {
        const res = await axios.patch(
          `/api/wallet-change-requests/${pendingRequest.request_id}`,
          { action: "approved", admin_id: user?.user_id },
        );
        if (res.data.success) {
          ShowToast.success(
            "Request approved and wallet updated successfully!",
          );
          handleBack();
        } else {
          ShowToast.error(res.data.message || "Failed to approve request.");
        }
        return;
      }

      const res = await axios.patch(
        `/api/wallets-operations?wallet_id=${walletId}`,
        payload,
      );
      if (res.data.success) {
        ShowToast.success(
          isAdmin
            ? "Wallet updated successfully!"
            : pendingRequest
              ? "Your request has been updated. Awaiting admin approval."
              : "Your changes have been submitted for admin approval.",
        );
        handleBack();
      } else {
        ShowToast.error(res.data.message || "Failed to update wallet.");
      }
    } catch (error: any) {
      ShowToast.error(
        error.response?.data?.message ||
          "Something went wrong while updating wallet.",
      );
    } finally {
      setLoading(false);
      actions.setSubmitting(false);
    }
  };

  /* ================================================================ */
  /* Collapsible Comparison Table                                      */
  /* ================================================================ */
  const renderComparisonTable = () => {
    if (!pendingRequest) return null;

    const requestType = pendingRequest.request_type;
    const requestStatus = pendingRequest.status || "pending";

    /* ── new_wallet: single-column submitted values ── */
    if (requestType === "new_wallet" && isRequestMode) {
      const newVals = pendingRequest.new_values || {};
      const textRows = TEXT_COMPARE_FIELDS.filter(([, key]) => newVals[key]);
      const fileRows = FILE_COMPARE_FIELDS.filter(([, key]) => newVals[key]);
      if (textRows.length === 0 && fileRows.length === 0) return null;

      return (
        <div className="border border-blue-300 rounded-xl overflow-hidden mb-4">
          <button
            type="button"
            onClick={() => setCompareOpen((p) => !p)}
            className="w-full flex items-center justify-between px-4 py-3 bg-blue-50 hover:bg-blue-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <MdOutlineCompareArrows size={20} className="text-blue-700" />
              <span className="font-semibold text-blue-800 text-sm">
                📋 New Wallet Creation Request
              </span>
              <StatusBadge status={requestStatus} />
              <span className="text-xs text-blue-500 font-mono">
                {pendingRequest.request_id}
              </span>
            </div>
            {compareOpen ? (
              <IoChevronUpOutline
                size={18}
                className="text-blue-700 flex-shrink-0"
              />
            ) : (
              <IoChevronDownOutline
                size={18}
                className="text-blue-700 flex-shrink-0"
              />
            )}
          </button>

          {compareOpen && (
            <div className="bg-white px-4 py-3">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-blue-50">
                      <th className="text-left px-3 py-2 border border-blue-200 font-semibold w-[30%]">
                        Field
                      </th>
                      <th className="text-left px-3 py-2 border border-blue-200 font-semibold text-green-700 w-[70%]">
                        Submitted Value
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {textRows.map(([label, key]) => (
                      <tr key={key} className="even:bg-blue-50/40">
                        <td className="px-3 py-2 border border-blue-100 font-medium text-gray-700">
                          {label}
                        </td>
                        <td className="px-3 py-2 border border-blue-100 text-green-700 font-semibold">
                          {newVals[key]}
                        </td>
                      </tr>
                    ))}
                    {fileRows.map(([label, key]) => (
                      <tr key={key} className="even:bg-blue-50/40">
                        <td className="px-3 py-2 border border-blue-100 font-medium text-gray-700">
                          {label}
                        </td>
                        <td className="px-3 py-2 border border-blue-100">
                          <FileCell url={newVals[key]} label={label} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {isAdmin && requestStatus === "pending" && (
                <p className="text-xs text-blue-600 mt-2">
                  Click &apos;Approve Request&apos; to create this wallet, or
                  &apos;Reject Request&apos; to decline.
                </p>
              )}
            </div>
          )}
        </div>
      );
    }

    /* ── update_wallet: old vs new, only changed rows ── */
    if (requestType === "update_wallet") {
      const oldVals = savedWalletValues || pendingRequest.old_values || {};
      const newVals = pendingRequest.new_values || {};

      const changedTextRows = TEXT_COMPARE_FIELDS.filter(([, key]) => {
        return (
          String(newVals[key] ?? "") &&
          String(oldVals[key] ?? "") !== String(newVals[key] ?? "")
        );
      });
      const changedFileRows = FILE_COMPARE_FIELDS.filter(([, key]) => {
        return (
          String(newVals[key] ?? "") &&
          String(oldVals[key] ?? "") !== String(newVals[key] ?? "")
        );
      });

      const totalChanges = changedTextRows.length + changedFileRows.length;
      if (totalChanges === 0) return null;

      return (
        <div className="border border-yellow-400 rounded-xl overflow-hidden mb-4">
          <button
            type="button"
            onClick={() => setCompareOpen((p) => !p)}
            className="w-full flex items-center justify-between px-4 py-3 bg-yellow-50 hover:bg-yellow-100 transition-colors"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <MdOutlineCompareArrows size={20} className="text-yellow-700" />
              <span className="font-semibold text-yellow-800 text-sm">
                {isAdmin
                  ? "Pending Change Request — View changes"
                  : "Your Pending Request — View changes"}
              </span>
              <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-200 text-yellow-800 font-semibold">
                {totalChanges} field{totalChanges > 1 ? "s" : ""} changed
              </span>
              {isRequestMode && (
                <>
                  <StatusBadge status={requestStatus} />
                  <span className="text-xs text-yellow-600 font-mono">
                    {pendingRequest.request_id}
                  </span>
                </>
              )}
            </div>
            {compareOpen ? (
              <IoChevronUpOutline
                size={18}
                className="text-yellow-700 flex-shrink-0"
              />
            ) : (
              <IoChevronDownOutline
                size={18}
                className="text-yellow-700 flex-shrink-0"
              />
            )}
          </button>

          {compareOpen && (
            <div className="bg-white px-4 py-3">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-yellow-50">
                      <th className="text-left px-3 py-2 border border-yellow-300 font-semibold w-[22%]">
                        Field
                      </th>
                      <th className="text-left px-3 py-2 border border-yellow-300 font-semibold text-red-600 w-[39%]">
                        Old Value
                      </th>
                      <th className="text-left px-3 py-2 border border-yellow-300 font-semibold text-green-700 w-[39%]">
                        New Value
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {changedTextRows.map(([label, key]) => (
                      <tr key={key} className="even:bg-yellow-50/40">
                        <td className="px-3 py-2 border border-yellow-200 font-medium text-gray-700">
                          {label}
                        </td>
                        <td className="px-3 py-2 border border-yellow-200 text-red-600 line-through">
                          {oldVals[key] || "—"}
                        </td>
                        <td className="px-3 py-2 border border-yellow-200 text-green-700 font-semibold">
                          {newVals[key] || "—"}
                        </td>
                      </tr>
                    ))}
                    {changedFileRows.map(([label, key]) => (
                      <tr key={key} className="even:bg-yellow-50/40">
                        <td className="px-3 py-2 border border-yellow-200 font-medium text-gray-700">
                          {label}
                        </td>
                        <td className="px-3 py-2 border border-yellow-200">
                          <FileCell url={oldVals[key]} label={label} />
                        </td>
                        <td className="px-3 py-2 border border-yellow-200">
                          <FileCell url={newVals[key]} label={label} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-yellow-700 mt-2">
                {isAdmin
                  ? "Click 'Approve Request' to apply these changes, or 'Reject Request' to decline."
                  : "You can update your request below — admin will see your latest submitted values."}
              </p>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  /* ── Derived flags ─────────────────────────────────────────────── */
  const requestStatus = pendingRequest?.status || "pending";
  const isResolved =
    requestStatus === "approved" || requestStatus === "rejected";
  const formReadOnly = isRequestMode && isResolved;

  const pageTitle = isRequestMode
    ? `Change Request — ${pendingRequest?.request_id || reqIdParam || ""}`
    : "Edit Wallet";

  const submitLabel = loading
    ? "Submitting..."
    : isRequestMode && isAdmin && requestStatus === "pending"
      ? "Approve Request"
      : isAdmin
        ? "Update Wallet"
        : pendingRequest
          ? "Update Request"
          : "Submit for Approval";

  /* ================================================================ */
  /* Render                                                            */
  /* ================================================================ */
  return (
    <Layout>
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <Loader />
        </div>
      )}
      <div className="p-4 max-md:p-2">
        {/* ── Page header ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <IoIosArrowBack
            size={25}
            className="cursor-pointer flex-shrink-0"
            onClick={handleBack}
          />
          <h2 className="text-xl max-sm:text-[1rem] font-semibold">
            {pageTitle}
          </h2>
          {isRequestMode && pendingRequest && (
            <StatusBadge status={requestStatus} />
          )}
        </div>

        {/* ── Collapsible comparison table ─────────────────────────────── */}
        {renderComparisonTable()}

        {/* ── Non-edit mode: user pending note ────────────────────────── */}
        {!isAdmin && pendingRequest && !isResolved && !isRequestMode && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-2 rounded-lg mb-4 text-sm">
            <span className="font-semibold">NOTE: </span>
            {pendingRequest.request_type === "new_wallet"
              ? "Your wallet creation request is under admin review."
              : "Your changes are under admin review. You can still update your request — admin will see your latest values."}
          </div>
        )}

        {/* ── Resolved notice ────────────────────────────────────────────── */}
        {isRequestMode && isResolved && (
          <div
            className={`border rounded-lg px-4 py-3 mb-4 text-sm font-medium ${
              requestStatus === "approved"
                ? "bg-green-50 border-green-300 text-green-800"
                : "bg-red-50 border-red-300 text-red-700"
            }`}
          >
            {requestStatus === "approved"
              ? "✅ This request has been approved and the wallet has been updated."
              : "❌ This request has been rejected. No changes were applied to the wallet."}
          </div>
        )}

        {/* ── Form ─────────────────────────────────────────────────────── */}
        <Formik
          enableReinitialize
          initialValues={initialValues}
          validationSchema={formReadOnly ? undefined : WalletSchema}
          onSubmit={handleSubmit}
        >
          {({ values, setFieldValue, errors, touched, handleBlur }) => (
            <Form className="flex flex-col gap-4">
              {/* ══════════════════════════════════════════════════════════
                  SECTION 1 — Account Overview
                  FIXED: grid-cols-3 max (was xl:grid-cols-4)
                  4 fields → row 1: Wallet ID, User ID, User Name
                             row 2: Contact
                 ══════════════════════════════════════════════════════════ */}
              <SectionCard
                icon={<MdOutlineCreditCard size={20} />}
                title="Account Overview"
                subtitle="Wallet and user identity details"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                </div>
              </SectionCard>

              {/* ══════════════════════════════════════════════════════════
                  SECTION 2 — Banking Details
                  grid-cols-3 max (unchanged — was already correct)
                 ══════════════════════════════════════════════════════════ */}
              <SectionCard
                icon={<MdAccountBalance size={20} />}
                title="Banking Details"
                subtitle="Bank account information"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <InputField
                    label="Account Holder Name"
                    name="accountHolderName"
                    value={values.accountHolderName}
                    disabled={formReadOnly}
                    onChange={(e) =>
                      setFieldValue("accountHolderName", e.target.value)
                    }
                    onBlur={handleBlur}
                    error={
                      touched.accountHolderName ? errors.accountHolderName : ""
                    }
                  />

                  <InputField
                    label="Bank Name"
                    name="bankName"
                    value={values.bankName}
                    disabled={formReadOnly}
                    onChange={(e) => setFieldValue("bankName", e.target.value)}
                    onBlur={handleBlur}
                    error={touched.bankName ? errors.bankName : ""}
                  />

                  <InputField
                    label="Account Number"
                    name="accountNumber"
                    value={values.accountNumber}
                    disabled={formReadOnly}
                    onChange={(e) =>
                      setFieldValue("accountNumber", e.target.value)
                    }
                    onBlur={handleBlur}
                    error={touched.accountNumber ? errors.accountNumber : ""}
                  />

                  <InputField
                    label="IFSC Code"
                    name="ifscCode"
                    value={values.ifscCode}
                    disabled={formReadOnly}
                    onChange={(e) => setFieldValue("ifscCode", e.target.value)}
                    onBlur={handleBlur}
                    error={touched.ifscCode ? errors.ifscCode : ""}
                  />

                  <FileInput
                    label="Bank Book Front"
                    name="bankBook"
                    required
                    value={values.bankBook || null}
                    disabled={formReadOnly}
                    onChange={(e) =>
                      setFieldValue(
                        "bankBook",
                        e.currentTarget.files?.[0] || values.bankBook,
                      )
                    }
                    onBlur={handleBlur}
                    error={touched.bankBook ? (errors as any).bankBook : ""}
                  />

                  <FileInput
                    label="Cancelled Cheque"
                    name="cheque"
                    value={values.cheque || null}
                    disabled={formReadOnly}
                    onChange={(e) =>
                      setFieldValue(
                        "cheque",
                        e.currentTarget.files?.[0] || values.cheque,
                      )
                    }
                    onBlur={handleBlur}
                    error={touched.cheque ? (errors as any).cheque : ""}
                  />

                  <InputField
                    label="GST Number (optional)"
                    name="gstNumber"
                    value={values.gstNumber || ""}
                    disabled={formReadOnly}
                    onChange={(e) => setFieldValue("gstNumber", e.target.value)}
                    onBlur={handleBlur}
                    error={touched.gstNumber ? (errors as any).gstNumber : ""}
                  />
                </div>
              </SectionCard>

              {/* ══════════════════════════════════════════════════════════
                  SECTION 3 — Identity Documents
                  Aadhaar: 3 per row (correct)
                  PAN: FIXED grid-cols-3 max (was xl:grid-cols-4)
                  4 PAN fields → row 1: PAN No, Name, DOB
                                 row 2: Upload PAN
                 ══════════════════════════════════════════════════════════ */}
              <SectionCard
                icon={<FaIdCard size={18} />}
                title="Identity Documents"
                subtitle="Upload your Aadhaar and PAN documents"
              >
                {/* PAN — FIXED: 3 per row max */}
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    PAN Details
                  </p>
                  {panVerified && (
                    <RiVerifiedBadgeFill className="text-green-600 text-base" />
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <InputField
                    label="PAN Number"
                    name="panNumber"
                    value={values.panNumber}
                    disabled={formReadOnly}
                    onChange={(e) => {
                      setFieldValue("panNumber", e.target.value.toUpperCase());
                      resetPanVerification(setFieldValue);
                    }}
                    onBlur={handleBlur}
                    error={touched.panNumber ? errors.panNumber : ""}
                  />

                  <InputField
                    label="Name as in PAN"
                    name="panName"
                    value={values.panName}
                    disabled={formReadOnly}
                    onChange={(e) => {
                      setFieldValue("panName", e.target.value);
                      resetPanVerification(setFieldValue);
                    }}
                    onBlur={handleBlur}
                    error={touched.panName ? errors.panName : ""}
                  />

                  <InputField
                    label="Date of Birth as in PAN"
                    type="date"
                    name="panDob"
                    value={values.panDob}
                    className="uppercase"
                    disabled={formReadOnly}
                    onChange={(e) => {
                      setFieldValue("panDob", e.target.value);
                      resetPanVerification(setFieldValue);
                    }}
                    onBlur={handleBlur}
                    error={touched.panDob ? errors.panDob : ""}
                  />

                  <FileInput
                    label="Upload PAN"
                    name="panFile"
                    value={values.panFile || null}
                    disabled={formReadOnly}
                    onChange={(e) =>
                      setFieldValue(
                        "panFile",
                        e.currentTarget.files?.[0] || values.panFile,
                      )
                    }
                    onBlur={handleBlur}
                    error={touched.panFile ? (errors as any).panFile : ""}
                  />
                </div>

                {/* Verify PAN — admin only, not when resolved */}
                {isAdmin && !formReadOnly && (
                  <div className="flex justify-end mt-4">
                    <button
                      type="button"
                      disabled={verifying}
                      className={`px-4 py-2 rounded-lg font-semibold text-sm cursor-pointer transition-colors ${
                        verifying
                          ? "bg-gray-400 cursor-not-allowed text-white"
                          : "bg-[#106187] hover:bg-[#0d4f6b] text-white"
                      }`}
                      onClick={() =>
                        verifyPanDetails(
                          values.panNumber,
                          values.panName,
                          values.panDob,
                          setFieldValue,
                        )
                      }
                    >
                      {verifying ? "Verifying..." : "Verify PAN"}
                    </button>
                  </div>
                )}

                {/* Aadhaar — 3 per row */}
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Aadhaar Details
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  <InputField
                    label="Aadhar Number"
                    name="aadharNumber"
                    required
                    value={values.aadharNumber}
                    disabled={formReadOnly}
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
                    value={values.aadharFront || null}
                    disabled={formReadOnly}
                    onChange={(e) =>
                      setFieldValue(
                        "aadharFront",
                        e.currentTarget.files?.[0] || values.aadharFront,
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
                    value={values.aadharBack || null}
                    disabled={formReadOnly}
                    onChange={(e) =>
                      setFieldValue(
                        "aadharBack",
                        e.currentTarget.files?.[0] || values.aadharBack,
                      )
                    }
                    onBlur={handleBlur}
                    error={touched.aadharBack ? (errors as any).aadharBack : ""}
                  />
                </div>

                {/* <div className="border-t border-gray-100 mb-5" /> */}
              </SectionCard>

              {/* ── Action buttons — hidden when resolved ────────────────── */}
              {!formReadOnly && (
                <div className="flex justify-end gap-3 mt-2">
                  {isAdmin && pendingRequest && requestStatus === "pending" && (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleReject}
                      className="px-5 py-2 rounded-lg font-semibold text-sm bg-red-500 hover:bg-red-600 text-white cursor-pointer disabled:opacity-50 transition-colors"
                    >
                      {loading ? "..." : "Reject Request"}
                    </button>
                  )}
                  <SubmitButton type="submit">{submitLabel}</SubmitButton>
                </div>
              )}
            </Form>
          )}
        </Formik>
      </div>
    </Layout>
  );
}

/* ================================================================== */
/* Default export — wraps inner component in Suspense                 */
/* ================================================================== */

export default function EditWalletPage() {
  return (
    <Suspense
      fallback={
        <Layout>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <Loader />
          </div>
        </Layout>
      }
    >
      <EditWalletInner />
    </Suspense>
  );
}

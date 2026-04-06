"use client";

// app/wallet/wallet-change-requests/[request_id]/page.tsx

import React, { useState, useEffect } from "react";
import Layout from "@/layout/Layout";
import { IoIosArrowBack, IoIosArrowDown } from "react-icons/io";
import { useRouter, useParams } from "next/navigation";
import axios from "axios";
import ShowToast from "@/components/common/Toast/toast";
import Loader from "@/components/common/loader";
import { useVLife } from "@/store/context";
import { GrStatusGood } from "react-icons/gr";
import { MdCancel, MdOutlinePending } from "react-icons/md";
import { TbArrowsExchange } from "react-icons/tb";

// Fields for old vs new comparison
const COMPARE_FIELDS: Array<[string, string]> = [
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

// File fields to show as links
const FILE_FIELDS: Array<[string, string]> = [
  ["Cancelled Cheque", "cheque"],
  ["Bank Book", "bank_book"],
  ["Aadhaar Front", "aadhar_front"],
  ["Aadhaar Back", "aadhar_back"],
  ["PAN File", "pan_file"],
];

const ReadField = ({
  label,
  value,
  isFile = false,
}: {
  label: string;
  value?: string | null;
  isFile?: boolean;
}) => {
  const displayValue = value || "—";
  const fileName = value ? value.split("/").pop() : null;

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-500">{label}</label>
      {isFile && value ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-blue-600 hover:text-blue-800 underline truncate bg-gray-50"
          title={value}
        >
          {fileName}
        </a>
      ) : (
        <div className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 bg-gray-50 min-h-[38px]">
          {displayValue}
        </div>
      )}
    </div>
  );
};

const SectionHeader = ({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) => (
  <div className="flex items-center gap-3 mb-5">
    <div className="w-10 h-10 rounded-xl bg-[#e8f4f8] flex items-center justify-center text-[#106187]">
      {icon}
    </div>
    <div>
      <p className="font-semibold text-gray-800">{title}</p>
      <p className="text-xs text-gray-400">{subtitle}</p>
    </div>
  </div>
);

export default function ChangeRequestDetailPage() {
  const router = useRouter();
  const params = useParams();
  const requestId = params?.request_id as string;
  const { user } = useVLife();
  const isAdmin = user?.role === "admin";

  const [loading, setLoading] = useState(false);
  const [request, setRequest] = useState<any>(null);
  const [showComparison, setShowComparison] = useState(false);

  // ── Fetch change request ──────────────────────────────────────────────
  useEffect(() => {
    if (!requestId) return;
    const fetchRequest = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`/api/wallet-change-requests/${requestId}`);
        if (res.data.success && res.data.data) {
          setRequest(res.data.data);
        } else {
          ShowToast.error("Change request not found");
        }
      } catch (error) {
        console.error(error);
        ShowToast.error("Failed to fetch change request");
      } finally {
        setLoading(false);
      }
    };
    fetchRequest();
  }, [requestId]);

  // ── Reject handler (admin only) ───────────────────────────────────────
  const handleReject = async () => {
    if (!request) return;
    try {
      setLoading(true);
      const res = await axios.patch(
        `/api/wallet-change-requests/${request.request_id}`,
        { action: "rejected", admin_id: user?.user_id },
      );
      if (res.data.success) {
        ShowToast.success("Request rejected.");
        setRequest((prev: any) => ({ ...prev, status: "rejected" }));
      } else {
        ShowToast.error(res.data.message || "Failed to reject.");
      }
    } catch (error: any) {
      ShowToast.error(error.response?.data?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  // ── Status badge ──────────────────────────────────────────────────────
  const renderStatusBadge = (status: string) => {
    if (status === "approved") {
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-700 font-semibold text-sm border border-green-200">
          <GrStatusGood size={15} /> Approved
        </span>
      );
    }
    if (status === "rejected") {
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-600 font-semibold text-sm border border-red-200">
          <MdCancel size={16} /> Rejected
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 font-semibold text-sm border border-yellow-200">
        <MdOutlinePending size={16} /> Pending
      </span>
    );
  };

  // ── Status banner ─────────────────────────────────────────────────────
  const renderBanner = () => {
    if (!request) return null;
    if (request.status === "approved") {
      return (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-5">
          <GrStatusGood size={18} />
          <span className="text-sm font-medium">
            This request has been approved and the wallet has been updated.
          </span>
        </div>
      );
    }
    if (request.status === "rejected") {
      return (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-5">
          <MdCancel size={18} />
          <span className="text-sm font-medium">
            This request has been rejected. The wallet was not changed.
          </span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-300 text-yellow-700 px-4 py-3 rounded-xl mb-5">
        <MdOutlinePending size={18} />
        <span className="text-sm font-medium">
          This request is pending admin review.
        </span>
      </div>
    );
  };

  // ── Comparison table ──────────────────────────────────────────────────
  const renderComparisonTable = () => {
    if (!request) return null;

    const oldVals = request.old_values || {};
    const newVals = request.new_values || {};

    const changedRows = COMPARE_FIELDS.filter(
      ([, key]) =>
        String(oldVals[key] ?? "") !== String(newVals[key] ?? "") ||
        oldVals[key] ||
        newVals[key],
    );

    const fileChangedRows = FILE_FIELDS.filter(
      ([, key]) => oldVals[key] || newVals[key],
    );

    const hasChanges = changedRows.length > 0 || fileChangedRows.length > 0;

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="text-left px-4 py-2.5 border border-gray-200 font-semibold text-gray-600 w-1/4">
                Field
              </th>
              <th className="text-left px-4 py-2.5 border border-gray-200 font-semibold text-red-500">
                Old Value
              </th>
              <th className="text-left px-4 py-2.5 border border-gray-200 font-semibold text-green-600">
                New Value
              </th>
            </tr>
          </thead>
          <tbody>
            {!hasChanges ? (
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-4 text-center text-gray-400 border border-gray-200"
                >
                  No changes detected.
                </td>
              </tr>
            ) : (
              <>
                {changedRows.map(([label, key]) => {
                  const oldVal = oldVals[key];
                  const newVal = newVals[key];
                  const isChanged =
                    String(oldVal ?? "") !== String(newVal ?? "");
                  return (
                    <tr key={key} className="even:bg-gray-50">
                      <td className="px-4 py-2.5 border border-gray-200 font-medium text-gray-700">
                        {label}
                      </td>
                      <td className="px-4 py-2.5 border border-gray-200 text-red-500">
                        <span className={isChanged ? "line-through" : ""}>
                          {oldVal || "—"}
                        </span>
                      </td>
                      <td
                        className={`px-4 py-2.5 border border-gray-200 font-semibold ${isChanged ? "text-green-600" : "text-gray-700"}`}
                      >
                        {newVal || "—"}
                      </td>
                    </tr>
                  );
                })}
                {fileChangedRows.map(([label, key]) => {
                  const oldFile = oldVals[key];
                  const newFile = newVals[key];
                  return (
                    <tr key={key} className="even:bg-gray-50">
                      <td className="px-4 py-2.5 border border-gray-200 font-medium text-gray-700">
                        {label}
                      </td>
                      <td className="px-4 py-2.5 border border-gray-200">
                        {oldFile ? (
                          <a
                            href={oldFile}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-red-400 underline line-through text-xs break-all"
                          >
                            {oldFile.split("/").pop()}
                          </a>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 border border-gray-200">
                        {newFile ? (
                          <a
                            href={newFile}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-600 underline font-semibold text-xs break-all"
                          >
                            {newFile.split("/").pop()}
                          </a>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const display = {
    ...(request?.new_values || {}),
    pan_verified:
      request?.new_values?.pan_verified === true ||
      request?.new_values?.pan_verified === "Yes"
        ? request.new_values.pan_verified
        : request?.old_values?.pan_verified,
  };
  const walletId = request?.wallet_id || "—";
  const userId = request?.user_id || "—";
  const userName = request?.old_values?.user_name || "—";
  const contact = request?.old_values?.contact || "—";

  return (
    <Layout>
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <Loader />
        </div>
      )}

      <div className="p-4 max-md:p-2">
        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <IoIosArrowBack
              size={25}
              className="cursor-pointer"
              onClick={() => router.push("/wallet/change-requests")}
            />
            <h2 className="text-xl max-sm:text-base font-semibold">
              Change Request —{" "}
              <span className="text-[#106187]">{requestId}</span>
            </h2>
            {request && renderStatusBadge(request.status)}
          </div>

          {isAdmin && request?.status === "pending" && (
            <div className="flex items-center gap-2 max-md:mx-auto">
              <button
                onClick={() =>
                  router.push(
                    `/wallet/wallets/editwallet/${request.wallet_id}?mode=request&request_id=${request.request_id}`,
                  )
                }
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#106187] hover:bg-[#0d4f6e] text-white cursor-pointer transition-colors"
              >
                Approve Wallet
              </button>
              <button
                onClick={handleReject}
                disabled={loading}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-500 hover:bg-red-600 text-white cursor-pointer disabled:opacity-50 transition-colors"
              >
                Reject Request
              </button>
            </div>
          )}
        </div>

        {/* ── Status banner ── */}
        {renderBanner()}

        {/* ── Toggle button + collapsible comparison table ── */}
        {request && (
          <div className="mb-5">
            <button
              type="button"
              onClick={() => setShowComparison((prev) => !prev)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#106187] text-[#106187] font-semibold text-sm hover:bg-[#e8f4f8] transition-colors cursor-pointer"
            >
              <TbArrowsExchange size={18} />
              {showComparison ? "Hide" : "Show"} Old vs New Changes
              <IoIosArrowDown
                size={16}
                style={{
                  transition: "transform 0.2s",
                  transform: showComparison ? "rotate(180deg)" : "rotate(0deg)",
                }}
              />
            </button>

            {showComparison && (
              <div className="mt-3 rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="bg-[#e8f4f8] px-4 py-3 border-b border-gray-200 flex items-center gap-2">
                  <TbArrowsExchange size={18} color="#106187" />
                  <p className="font-semibold text-[#106187] text-sm">
                    What's Changing — Old Value vs Requested New Value
                  </p>
                </div>
                <div className="p-4 bg-white">{renderComparisonTable()}</div>
              </div>
            )}
          </div>
        )}

        {/* ── Wallet Detail Sections ── */}
        <div className="space-y-5">
          {/* Account Overview */}
          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
            <SectionHeader
              icon={
                <svg
                  width="20"
                  height="20"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <path d="M2 10h20" />
                </svg>
              }
              title="Account Overview"
              subtitle="Wallet and user identity details"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <ReadField label="Wallet ID" value={walletId} />
              <ReadField label="User ID" value={userId} />
              <ReadField label="User Name" value={userName} />
              <ReadField label="Contact" value={contact} />
            </div>
          </div>

          {/* Banking Details */}
          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
            <SectionHeader
              icon={
                <svg
                  width="20"
                  height="20"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3" />
                </svg>
              }
              title="Banking Details"
              subtitle="Bank account information"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <ReadField
                label="Account Holder Name"
                value={display.account_holder_name}
              />
              <ReadField label="Bank Name" value={display.bank_name} />
              <ReadField
                label="Account Number"
                value={display.account_number}
              />
              <ReadField label="IFSC Code" value={display.ifsc_code} />
              <ReadField
                label="Cancelled Cheque *"
                value={display.cheque}
                isFile
              />
              <ReadField
                label="Bank Book Front"
                value={display.bank_book}
                isFile
              />
              <ReadField
                label="GST Number (optional)"
                value={display.gst_number}
              />
            </div>
          </div>

          {/* Identity Documents */}
          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
            <SectionHeader
              icon={
                <svg
                  width="20"
                  height="20"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <path d="M7 8h5M7 12h8M7 16h4" />
                </svg>
              }
              title="Identity Documents"
              subtitle="Upload your Aadhaar and PAN documents"
            />

            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              PAN Details
              {(display?.pan_verified === true ||
                display?.pan_verified === "Yes") && (
                <span className="text-green-600">
                  <GrStatusGood size={15} />
                </span>
              )}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <ReadField label="PAN Number" value={display.pan_number} />
              <ReadField label="Name as in PAN" value={display.pan_name} />
              <ReadField
                label="Date of Birth as in PAN"
                value={display.pan_dob}
              />
              <ReadField label="Upload PAN" value={display.pan_file} isFile />
            </div>

            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 mt-10">
              Aadhaar Details
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <ReadField
                label="Aadhar Number *"
                value={display.aadhar_number}
              />
              <ReadField
                label="Aadhar Front *"
                value={display.aadhar_front}
                isFile
              />
              <ReadField
                label="Aadhar Back *"
                value={display.aadhar_back}
                isFile
              />
            </div>
          </div>

          {/* Request Meta */}
          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
            <SectionHeader
              icon={
                <svg
                  width="20"
                  height="20"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
              }
              title="Request Info"
              subtitle="Audit trail for this change request"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <ReadField label="Request ID" value={request?.request_id} />
              <ReadField label="Requested By" value={request?.requested_by} />
              <ReadField
                label="Requested At"
                value={
                  request?.created_at
                    ? new Date(request.created_at).toLocaleString()
                    : "—"
                }
              />
              <ReadField label="Reviewed By" value={request?.reviewed_by} />
              <ReadField
                label="Reviewed At"
                value={
                  request?.reviewed_at
                    ? new Date(request.reviewed_at).toLocaleString()
                    : "—"
                }
              />
              <ReadField label="Request Type" value={request?.request_type} />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

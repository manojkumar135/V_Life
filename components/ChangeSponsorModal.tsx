"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { IoClose } from "react-icons/io5";
import { FiUser, FiSearch } from "react-icons/fi";
import { HiOutlineSwitchHorizontal } from "react-icons/hi";
import { RiShieldUserLine } from "react-icons/ri";
import { MdOutlineVerified } from "react-icons/md";

/* ─── Types ─────────────────────────────────────────────────────── */

interface UserInfo {
  user_id: string;
  user_name: string;
  user_status: string;
  status_notes: string;
  current_referBy: string;
  current_referBy_name: string; // ← NEW: sponsor name from API
}

interface SponsorInfo {
  sponsor_id: string;
  sponsor_name: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  prefillUserId?: string;
  adminUserId: string;
  onSuccess?: () => void;
}

/* ─── Status Badge ───────────────────────────────────────────────── */

function StatusBadge({ status, notes }: { status: string; notes: string }) {
  const isActive = status === "active";
  const isDeactivatedByAdmin =
    notes?.trim().toLowerCase() === "deactivated by admin";

  let label = isActive ? "Active" : "Inactive";
  let cls = "bg-green-50 text-green-700 border border-green-200";

  if (!isActive && isDeactivatedByAdmin) {
    label = "Deactivated";
    cls = "bg-gray-100 text-gray-600 border border-gray-300";
  } else if (!isActive) {
    cls = "bg-orange-50 text-orange-600 border border-orange-200";
  }

  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${cls}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

/* ─── Info Row ───────────────────────────────────────────────────── */

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-gray-400 text-[11px] whitespace-nowrap">{label}</span>
      <span className="font-mono text-[11px] text-gray-700 font-medium truncate text-right">
        {value || "—"}
      </span>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────── */

export default function ChangeSponsorModal({
  isOpen,
  onClose,
  prefillUserId = "",
  adminUserId,
  onSuccess,
}: Props) {
  const [userId, setUserId] = useState(prefillUserId);
  const [sponsorId, setSponsorId] = useState("");

  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [sponsorInfo, setSponsorInfo] = useState<SponsorInfo | null>(null);

  const [userLoading, setUserLoading] = useState(false);
  const [sponsorLoading, setSponsorLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [userError, setUserError] = useState("");
  const [sponsorError, setSponsorError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const userDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sponsorDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Reset on open ── */
  useEffect(() => {
    if (isOpen) {
      setUserId(prefillUserId);
      setSponsorId("");
      setUserInfo(null);
      setSponsorInfo(null);
      setUserError("");
      setSponsorError("");
      setSubmitError("");
      setSuccessMsg("");
      if (prefillUserId) fetchUserInfo(prefillUserId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, prefillUserId]);

  /* ── Fetch user info ── */
  const fetchUserInfo = useCallback(async (id: string) => {
    const trimmed = id.trim();
    if (!trimmed) { setUserInfo(null); setUserError(""); return; }

    setUserLoading(true);
    setUserError("");
    setUserInfo(null);

    try {
      const { data } = await axios.get(`/api/change-sponsor?user_id=${trimmed}`);
      if (data.success) setUserInfo(data.data);
      else setUserError(data.message || "User not found");
    } catch (err: any) {
      setUserError(err?.response?.data?.message || "User not found");
    } finally {
      setUserLoading(false);
    }
  }, []);

  /* ── Fetch sponsor info ── */
  const fetchSponsorInfo = useCallback(async (id: string) => {
    const trimmed = id.trim();
    if (!trimmed) { setSponsorInfo(null); setSponsorError(""); return; }

    setSponsorLoading(true);
    setSponsorError("");
    setSponsorInfo(null);

    try {
      const { data } = await axios.get(`/api/change-sponsor?sponsor_id=${trimmed}`);
      if (data.success) setSponsorInfo(data.data);
      else setSponsorError(data.message || "Sponsor not found");
    } catch (err: any) {
      setSponsorError(err?.response?.data?.message || "Sponsor not found");
    } finally {
      setSponsorLoading(false);
    }
  }, []);

  /* ── Debounced input handlers ── */
  const handleUserIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setUserId(val);
    setUserInfo(null);
    setUserError("");
    setSubmitError("");
    setSuccessMsg("");
    if (userDebounce.current) clearTimeout(userDebounce.current);
    if (val.trim().length >= 5)
      userDebounce.current = setTimeout(() => fetchUserInfo(val), 500);
  };

  const handleSponsorIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setSponsorId(val);
    setSponsorInfo(null);
    setSponsorError("");
    setSubmitError("");
    setSuccessMsg("");
    if (sponsorDebounce.current) clearTimeout(sponsorDebounce.current);
    if (val.trim().length >= 5)
      sponsorDebounce.current = setTimeout(() => fetchSponsorInfo(val), 500);
  };

  /* ── Derived ── */
  const userIsEligible =
    userInfo &&
    userInfo.user_status === "inactive" &&
    userInfo.status_notes?.trim().toLowerCase() !== "deactivated by admin";

  const canSubmit =
    userIsEligible && sponsorInfo && !userLoading && !sponsorLoading && !submitting;

  /* ── Submit ── */
  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError("");
    setSuccessMsg("");
    try {
      const { data } = await axios.post("/api/change-sponsor", {
        admin_user_id: adminUserId,
        target_user_id: userId.trim(),
        new_sponsor_id: sponsorId.trim(),
      });
      if (data.success) {
        setSuccessMsg(data.message);
        onSuccess?.();
        // setTimeout(onClose, 2000);
      } else {
        setSubmitError(data.message || "Failed to change sponsor");
      }
    } catch (err: any) {
      setSubmitError(err?.response?.data?.message || "Failed to change sponsor");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Keyboard close ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (isOpen) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  /* ─── Render ─────────────────────────────────────────────────── */
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-[#0C3978] to-[#106187]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <HiOutlineSwitchHorizontal size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-[14px] leading-tight">Change Sponsor</h2>
              <p className="text-white/60 text-[10px]">Admin only · Inactive users only</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/25 transition flex items-center justify-center text-white"
          >
            <IoClose size={16} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="px-5 pt-4 pb-2 space-y-4">

         {/* Rules — numbered list */}
<div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
  <p className="text-[12px] font-bold text-gray-800 mb-2">Important points to remember</p>
  <ol className="space-y-1.5 list-decimal list-outside pl-4">
    {[
      "User must be Inactive (not deactivated by admin)",
      "New sponsor must be a direct ancestor of the user in the binary tree",
      "The entire path from new sponsor down to the user must follow all-left or all-right only",
      "Binary tree structure will not be modified — only the referBy field changes",
      "Once changed, referred_users lists of old and new sponsor are updated automatically",
    ].map((point, i) => (
      <li key={i} className="text-[11.5px] text-gray-600 leading-snug">
        {point}
      </li>
    ))}
  </ol>
</div>

          {/* ── Two-column layout: User | New Sponsor ── */}
          <div className="grid grid-cols-2 gap-3">

            {/* LEFT — User */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-semibold text-gray-700 flex items-center gap-1">
                <FiUser size={11} className="text-[#106187]" />
                User ID
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. IND1234567"
                  value={userId}
                  onChange={handleUserIdChange}
                  onKeyDown={(e) => e.key === "Enter" && fetchUserInfo(userId)}
                  className="w-full h-9 pl-3 pr-8 border border-gray-300 rounded-lg text-[12px] focus:outline-none focus:ring-2 focus:ring-[#106187]/30 focus:border-[#106187] transition"
                />
                {userLoading ? (
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
                    <span className="w-3.5 h-3.5 border-2 border-[#106187] border-t-transparent rounded-full animate-spin inline-block" />
                  </span>
                ) : (
                  <FiSearch
                    size={12}
                    onClick={() => fetchUserInfo(userId)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer hover:text-[#106187]"
                  />
                )}
              </div>

              {/* User info card */}
              {userInfo ? (
                <div
                  className={`rounded-lg border px-3 py-2 space-y-1.5 ${
                    userIsEligible
                      ? "bg-blue-50 border-blue-200"
                      : "bg-red-50 border-red-200"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold text-gray-800 text-[12px] truncate">
                      {userInfo.user_name}
                    </span>
                    <StatusBadge status={userInfo.user_status} notes={userInfo.status_notes} />
                  </div>
                  <InfoRow label="ID" value={userInfo.user_id} />

                  {/* Current Sponsor — name prominent, ID secondary */}
                  <div className={`pt-1.5 mt-0.5 border-t ${userIsEligible ? "border-blue-200" : "border-red-200"}`}>
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                      Current Sponsor
                    </p>
                    <p className="text-[12px] font-bold text-gray-800 leading-tight">
                      {userInfo.current_referBy_name || "—"}
                    </p>
                    <p className="text-[10px] font-mono text-gray-400 mt-0.5">
                      {userInfo.current_referBy || ""}
                    </p>
                  </div>

                  {!userIsEligible && (
                    <p className="text-[10px] text-red-600 font-medium mt-1">
                      ✖ Not eligible for sponsor change
                    </p>
                  )}
                </div>
              ) : userError ? (
                <p className="text-[11px] text-red-600">{userError}</p>
              ) : null}
            </div>

            {/* RIGHT — New Sponsor */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-semibold text-gray-700 flex items-center gap-1">
                <RiShieldUserLine size={12} className="text-[#106187]" />
                New Sponsor ID
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. IND0000001"
                  value={sponsorId}
                  onChange={handleSponsorIdChange}
                  onKeyDown={(e) => e.key === "Enter" && fetchSponsorInfo(sponsorId)}
                  disabled={!userIsEligible}
                  className="w-full h-9 pl-3 pr-8 border border-gray-300 rounded-lg text-[12px] focus:outline-none focus:ring-2 focus:ring-[#106187]/30 focus:border-[#106187] transition disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                />
                {sponsorLoading ? (
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
                    <span className="w-3.5 h-3.5 border-2 border-[#106187] border-t-transparent rounded-full animate-spin inline-block" />
                  </span>
                ) : (
                  <FiSearch
                    size={12}
                    onClick={() => userIsEligible && fetchSponsorInfo(sponsorId)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer hover:text-[#106187]"
                  />
                )}
              </div>

              {/* Sponsor info card */}
              {sponsorInfo ? (
                <div className="rounded-lg border bg-green-50 border-green-200 px-3 py-2 space-y-1.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold text-gray-800 text-[12px] truncate">
                      {sponsorInfo.sponsor_name}
                    </span>
                    <span className="flex items-center gap-0.5 text-green-700 text-[10px] font-semibold shrink-0">
                      <MdOutlineVerified size={12} />
                      Found
                    </span>
                  </div>
                  <InfoRow label="ID" value={sponsorInfo.sponsor_id} />
                </div>
              ) : sponsorError ? (
                <p className="text-[11px] text-red-600">{sponsorError}</p>
              ) : !userIsEligible ? (
                <p className="text-[11px] text-gray-400 italic">
                  Search a valid inactive user first
                </p>
              ) : null}
            </div>
          </div>

          {/* ── Result messages ── */}
          {submitError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3.5 py-2.5 text-[11px] text-red-700">
              <span className="font-semibold">Error: </span>{submitError}
            </div>
          )}
          {successMsg && (
            <div className="rounded-lg bg-green-50 border border-green-200 px-3.5 py-2.5 text-[11px] text-green-700 flex items-center gap-2">
              <MdOutlineVerified size={14} className="shrink-0" />
              {successMsg}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-5 py-3.5 flex items-center justify-end gap-2.5 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="h-8.5 px-4 rounded-lg border border-gray-300 text-[13px] text-gray-600 hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="h-8.5 px-5 rounded-lg bg-[#0C3978] text-white text-[13px] font-semibold hover:bg-[#0a2f5e] transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {submitting && (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {submitting ? "Changing…" : "Change Sponsor"}
          </button>
        </div>
      </div>
    </div>
  );
}
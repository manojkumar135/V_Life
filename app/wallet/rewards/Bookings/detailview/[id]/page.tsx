"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { IoIosArrowBack } from "react-icons/io";
import Loader from "@/components/common/loader";
import Layout from "@/layout/Layout";
import SelectField from "@/components/InputFields/selectinput";
import SubmitButton from "@/components/common/submitbutton";
import { useVLife } from "@/store/context";

const statusOptions = [
  { label: "Pending",    value: "pending"    },
  { label: "Booked",     value: "booked"     },
  { label: "Cancelled",  value: "cancelled"  },
  // ── NEW statuses for tracking flow ───────────────────────────────────────
  { label: "Dispatched", value: "dispatched" },
  { label: "Delivered",  value: "delivered"  },
];

interface RewardItem {
  reward_id:        string;
  reward_name:      string;
  type:             "score" | "matching";
  points_required?: number;
  matches_required?: number;
  count:            number;
  score_used?:      number;
  matches_used?:    number;
}

// ── NEW: ShippingData interface (mirrors OrderDetailView) ─────────────────────
interface ShippingData {
  tracking_id?:        string;
  courier_partner?:    string;
  dispatch_date?:      string;
  dispatch_time?:      string;
  estimated_delivery?: string;
  delivered_date?:     string;
  delivered_time?:     string;
  return_reason?:      string;
  remarks?:            string;
  tracking_url?:       string;
  updated_by?:         string;
}
// ─────────────────────────────────────────────────────────────────────────────

interface BookingData {
  booking_id:          string;
  user_id:             string;
  user_name:           string;
  user_email:          string;
  user_contact:        string;
  user_role:           string;
  rank?:               string;
  rewards:             RewardItem[];
  total_score_used?:   number;
  remaining_score?:    number;
  total_matches_used?: number;
  remaining_matches?:  number;
  type:                "score" | "matching";
  status:              string;
  date:                string;
  time:                string;
  booked_at:           string;
  address:             string;
  description:         string;
  // ── NEW ──────────────────────────────────────────────────────────────────
  door_no?:            string;
  landmark?:           string;
  city?:               string;
  state?:              string;
  country?:            string;
  pincode?:            string;
  shipping?:           ShippingData;
  // ─────────────────────────────────────────────────────────────────────────
}

// ── NEW: empty track form shape ───────────────────────────────────────────────
const EMPTY_TRACK_FORM = {
  status:             "",
  tracking_id:        "",
  courier_partner:    "",
  dispatch_date:      "",
  dispatch_time:      "",
  estimated_delivery: "",
  delivered_date:     "",
  delivered_time:     "",
  return_reason:      "",
  remarks:            "",
  tracking_url:       "",
};
// ─────────────────────────────────────────────────────────────────────────────

export default function BookingDetailView() {
  const params    = useParams();
  const router    = useRouter();
  const { user }  = useVLife();
  const bookingId = (params as any)?.id as string;

  const [booking, setBooking]         = useState<BookingData | null>(null);
  const [loading, setLoading]         = useState(true);
  const [status, setStatus]           = useState("");
  const [showUserDetails, setShowUserDetails] = useState(false);

  // ── NEW: edit track state ─────────────────────────────────────────────────
  const [showEditTrack, setShowEditTrack]   = useState(false);
  const [trackForm, setTrackForm]           = useState(EMPTY_TRACK_FORM);
  const [trackSaving, setTrackSaving]       = useState(false);
  const [trackError, setTrackError]         = useState("");
  // ─────────────────────────────────────────────────────────────────────────

  // Fetch booking data — unchanged
  useEffect(() => {
    const fetchBooking = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`/api/booking-operations?id=${bookingId}`);
        if (res?.data?.success && res.data.data) {
          const bookingData = res.data.data;
          setBooking(bookingData);
          setStatus(bookingData.status || "pending");
        } else {
          setBooking(null);
        }
      } catch (err) {
        console.error("Failed to fetch booking:", err);
        setBooking(null);
      } finally {
        setLoading(false);
      }
    };
    if (bookingId) fetchBooking();
  }, [bookingId]);

  // Status change — unchanged
  const handleStatusChange = async (newStatus: string) => {
    if (!booking) return;
    try {
      setStatus(newStatus);
      await axios.put("/api/booking-operations", {
        booking_id: booking.booking_id,
        status:     newStatus,
      });
    } catch (err) { console.error("Failed to update status:", err); }
  };

  // ── NEW: open Edit Track modal ────────────────────────────────────────────
  const openEditTrack = () => {
    if (!booking) return;
    setTrackForm({
      status:             booking.status ?? "pending",
      tracking_id:        booking.shipping?.tracking_id        ?? "",
      courier_partner:    booking.shipping?.courier_partner    ?? "",
      dispatch_date:      booking.shipping?.dispatch_date      ?? "",
      dispatch_time:      booking.shipping?.dispatch_time      ?? "",
      estimated_delivery: booking.shipping?.estimated_delivery ?? "",
      delivered_date:     booking.shipping?.delivered_date     ?? "",
      delivered_time:     booking.shipping?.delivered_time     ?? "",
      return_reason:      booking.shipping?.return_reason      ?? "",
      remarks:            booking.shipping?.remarks            ?? "",
      tracking_url:       booking.shipping?.tracking_url       ?? "",
    });
    setTrackError("");
    setShowEditTrack(true);
  };
  // ─────────────────────────────────────────────────────────────────────────

  // ── NEW: save track details ───────────────────────────────────────────────
  const saveTrackDetails = async () => {
    setTrackSaving(true);
    setTrackError("");
    try {
      await axios.put("/api/booking-operations", {
        booking_id: booking?.booking_id,
        status:     trackForm.status,
        shipping: {
          tracking_id:        trackForm.tracking_id,
          courier_partner:    trackForm.courier_partner,
          dispatch_date:      trackForm.dispatch_date,
          dispatch_time:      trackForm.dispatch_time,
          estimated_delivery: trackForm.estimated_delivery,
          delivered_date:     trackForm.delivered_date,
          delivered_time:     trackForm.delivered_time,
          return_reason:      trackForm.return_reason,
          remarks:            trackForm.remarks,
          tracking_url:       trackForm.tracking_url,
          updated_at:         new Date(),
        },
      });
      // Update local state so UI reflects changes immediately
      setBooking(prev => prev ? {
        ...prev,
        status:   trackForm.status,
        shipping: {
          tracking_id:        trackForm.tracking_id,
          courier_partner:    trackForm.courier_partner,
          dispatch_date:      trackForm.dispatch_date,
          dispatch_time:      trackForm.dispatch_time,
          estimated_delivery: trackForm.estimated_delivery,
          delivered_date:     trackForm.delivered_date,
          delivered_time:     trackForm.delivered_time,
          return_reason:      trackForm.return_reason,
          remarks:            trackForm.remarks,
          tracking_url:       trackForm.tracking_url,
        },
      } : prev);
      setStatus(trackForm.status);
      setShowEditTrack(false);
    } catch {
      setTrackError("Failed to save. Please try again.");
    } finally {
      setTrackSaving(false);
    }
  };
  // ─────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
        <Loader />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="p-6">
        <button onClick={() => router.push("/wallet/rewards/Bookings")}
          className="flex items-center gap-2 text-gray-600 hover:text-black">
          <IoIosArrowBack size={20} />
        </button>
        <p className="mt-6 text-center text-gray-500">Booking not found</p>
      </div>
    );
  }

  const isMatching    = booking.type === "matching";
  const unitLabel     = isMatching ? "Matches" : "pts";
  const hasTracking   = Boolean(booking.shipping?.tracking_id);

  return (
    <Layout>
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <Loader />
        </div>
      )}

      <div className="flex flex-col rounded-2xl p-4 max-lg:p-3 bg-white shadow-lg h-[100%]">

        {/* ── Header ── */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center border-b pb-3 mb-3 gap-4">
          <div className="flex flex-col xl:flex-row xl:items-center gap-3 w-full xl:w-auto">
            <button onClick={() => router.push("/wallet/rewards/Bookings")} className="text-black cursor-pointer">
              <IoIosArrowBack size={25} />
            </button>

            <div className="flex flex-col xl:flex-row xl:items-center gap-x-8 text-sm font-medium text-gray-600 max-lg:ml-5">
              <span>Booking ID: <span className="text-black font-semibold">{booking.booking_id}</span></span>
              <span>Type: <span className="text-black font-semibold capitalize">{booking.type}</span></span>
              <span>Date: <span className="text-black font-semibold">{booking.date}</span></span>
              <span>Time: <span className="text-black font-semibold">{booking.time}</span></span>
              {/* ── NEW: show tracking ID in header if exists ─────────────── */}
              {hasTracking && (
                <span>
                  Tracking:{" "}
                  {booking.shipping?.tracking_url
                    ? <a href={booking.shipping.tracking_url} target="_blank" rel="noopener noreferrer"
                        className="text-blue-600 underline font-semibold">
                        {booking.shipping.tracking_id}
                      </a>
                    : <span className="text-black font-semibold">{booking.shipping?.tracking_id}</span>
                  }
                </span>
              )}
              {/* ─────────────────────────────────────────────────────────── */}
            </div>
          </div>

          <div className="flex justify-between items-start gap-4 h-6 max-lg:ml-5 max-lg:w-[95%]">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Status:</span>
              {user?.role === "admin" ? (
                <SelectField
                  name="status"
                  value={status}
                  onChange={(e: any) => handleStatusChange(e.target?.value || e?.value)}
                  options={statusOptions}
                  className="w-36"
                  controlPaddingLeft="0px"
                  controlHeight="2rem"
                />
              ) : (
                <span className="text-sm font-semibold text-gray-600">{booking.status}</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* ── NEW: Edit Track button (admin only) ───────────────────── */}
              {user?.role === "admin" && (
                <button
                  onClick={openEditTrack}
                  className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 bg-gray-600
                             text-white font-medium cursor-pointer whitespace-nowrap">
                  Edit Track
                </button>
              )}
              {/* ─────────────────────────────────────────────────────────── */}

              <SubmitButton
                onClick={() => setShowUserDetails(true)}
                className="font-semibold text-sm px-3 !py-1.5 rounded-md">
                User Info
              </SubmitButton>
            </div>
          </div>
        </div>

        {/* ── Rewards List — unchanged ── */}
        <div className="flex-1 overflow-y-auto pr-2">
          <div className="lg:px-4">
            <div className="hidden lg:grid grid-cols-12 font-semibold text-gray-700 text-sm border-b px-2 mx-1 pb-2 mb-2">
              <div className="col-span-5 xl:pl-5">Reward</div>
              <div className="col-span-2 text-center">Quantity</div>
              {isMatching ? (
                <>
                  <div className="col-span-2 text-right">Matches Req</div>
                  <div className="col-span-3 text-right">Total Matches</div>
                </>
              ) : (
                <>
                  <div className="col-span-2 text-right">Points Req</div>
                  <div className="col-span-3 text-right">Total Points</div>
                </>
              )}
            </div>

            <div className="space-y-4">
              {booking.rewards.map(item => {
                const required = isMatching ? item.matches_required : item.points_required;
                const total    = isMatching ? item.matches_used     : item.score_used;
                return (
                  <div key={item.reward_id}
                    className="w-full rounded-xl p-4 transition-all shadow-sm hover:shadow-lg border border-gray-200">
                    {/* Desktop */}
                    <div className="hidden lg:grid grid-cols-12 items-center">
                      <div className="col-span-5 font-semibold text-gray-900">{item.reward_name}</div>
                      <div className="col-span-2 text-center text-gray-700">{item.count}</div>
                      <div className="col-span-2 text-right text-gray-700">{required} {unitLabel}</div>
                      <div className="col-span-3 text-right font-bold text-gray-900">{total} {unitLabel}</div>
                    </div>
                    {/* Mobile */}
                    <div className="lg:hidden flex flex-col gap-2 text-sm">
                      <p className="font-semibold text-gray-900">{item.reward_name}</p>
                      <p className="text-gray-600">Required: {required} {unitLabel}</p>
                      <div className="flex justify-between">
                        <p>Qty: {item.count}</p>
                        <p className="font-bold text-gray-900">Total: {total} {unitLabel}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex-none border-t pt-4 px-6 pr-16 bg-white py-3">
  <div className="max-w-sm ml-auto space-y-1.5">
    {isMatching ? (
      <>
        <div className="flex justify-between items-center text-sm text-gray-600">
          <span>Total Matches Used</span>
          <span className="font-bold text-gray-900">{booking.total_matches_used} Matches</span>
        </div>
        <div className="flex justify-between items-center text-sm font-semibold border-t pt-1.5">
          <span>Remaining Matches</span>
          <span className="text-[#106187] font-bold">{booking.remaining_matches} Matches</span>
        </div>
      </>
    ) : (
      <>
        <div className="flex justify-between items-center text-sm text-gray-600">
          <span>Total Points Used</span>
          <span className="font-bold text-gray-900">{booking.total_score_used} pts</span>
        </div>
        <div className="flex justify-between items-center text-sm font-semibold border-t pt-1.5">
          <span>Remaining Points</span>
          <span className="text-[#106187] font-bold">{booking.remaining_score} pts</span>
        </div>
      </>
    )}
  </div>
</div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          User Info Modal — CHANGED: added structured address + tracking section
      ══════════════════════════════════════════════════════════════════════ */}
      {showUserDetails && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 backdrop-blur-sm"
          onClick={() => setShowUserDetails(false)}>
          <div
            className={`bg-white rounded-xl shadow-lg w-[90%] p-6 relative max-h-[90vh] overflow-y-auto
              ${hasTracking ? "max-w-3xl" : "max-w-md"}`}
            onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowUserDetails(false)}
              className="absolute top-3 right-5 text-gray-500 hover:text-red font-bold text-lg">✕</button>

            <p className="text-lg font-semibold mb-4">User Details</p>

            {/* Two-column when tracking exists, single otherwise */}
            <div className={`flex flex-col ${hasTracking ? "lg:flex-row lg:gap-6" : ""}`}>

              {/* Left / full: User + Address Details */}
              <div className={hasTracking ? "lg:flex-1" : "w-full"}>
                <p className="text-sm font-bold text-gray-700 mb-3 pb-1 border-b border-gray-200">
                  📦 Shipping Details
                </p>
                <div className="grid grid-cols-[120px_10px_1fr] gap-y-2 text-sm text-gray-700">
                  <span className="font-semibold text-black">Booking ID</span>
                  <span>:</span>
                  <span className="text-black">{booking.booking_id}</span>

                  <span className="font-semibold text-black">User ID</span>
                  <span>:</span>
                  <span className="text-black">{booking.user_id}</span>

                  <span className="font-semibold text-black">Name</span>
                  <span>:</span>
                  <span className="text-black">{booking.user_name}</span>

                  <span className="font-semibold text-black">Email</span>
                  <span>:</span>
                  <span className="text-black">{booking.user_email}</span>

                  <span className="font-semibold text-black">Contact</span>
                  <span>:</span>
                  <span className="text-black">{booking.user_contact}</span>

                  {/* ── NEW: structured address display ───────────────────── */}
                  {booking.door_no && (
                    <>
                      <span className="font-semibold text-black">D.No &amp; Street</span>
                      <span>:</span>
                      <span className="text-black">{booking.door_no}</span>
                    </>
                  )}
                  {booking.landmark && (
                    <>
                      <span className="font-semibold text-black">Landmark</span>
                      <span>:</span>
                      <span className="text-black">{booking.landmark}</span>
                    </>
                  )}
                  {booking.city && (
                    <>
                      <span className="font-semibold text-black">City</span>
                      <span>:</span>
                      <span className="text-black">{booking.city}</span>
                    </>
                  )}
                  {booking.state && (
                    <>
                      <span className="font-semibold text-black">State</span>
                      <span>:</span>
                      <span className="text-black">{booking.state}</span>
                    </>
                  )}
                  {booking.pincode && (
                    <>
                      <span className="font-semibold text-black">Pincode</span>
                      <span>:</span>
                      <span className="text-black">{booking.pincode}</span>
                    </>
                  )}
                  {booking.country && (
                    <>
                      <span className="font-semibold text-black">Country</span>
                      <span>:</span>
                      <span className="text-black">{booking.country}</span>
                    </>
                  )}
                  {/* ─────────────────────────────────────────────────────── */}

                  <span className="font-semibold text-black">Full Address</span>
                  <span>:</span>
                  <span className="text-black whitespace-pre-line">{booking.address}</span>

                  <span className="font-semibold text-black">Description</span>
                  <span>:</span>
                  <span className="text-black whitespace-pre-line">{booking.description || "N/A"}</span>
                </div>
              </div>

              {/* Divider */}
              {hasTracking && (
                <>
                  <div className="lg:hidden border-t border-dashed border-gray-300 my-4" />
                  <div className="hidden lg:block w-px bg-gray-200 self-stretch mx-1" />
                </>
              )}

              {/* ── NEW: Right — Tracking Info (mirrors OrderDetailView) ──── */}
              {hasTracking && (
                <div className="lg:flex-1">
                  <p className="text-sm font-bold text-gray-700 mb-3 pb-1 border-b border-gray-200">
                    🚚 Tracking Info
                  </p>
                  <div className="grid grid-cols-[max-content_1ch_1fr] gap-y-2 gap-x-2 text-gray-700 text-sm">
                    <span className="font-bold text-black">Courier</span>
                    <span>:</span>
                    <span>{booking.shipping!.courier_partner || "—"}</span>

                    <span className="font-bold text-black">Tracking ID</span>
                    <span>:</span>
                    <span>
                      {booking.shipping!.tracking_url
                        ? <a href={booking.shipping!.tracking_url} target="_blank" rel="noopener noreferrer"
                            className="text-blue-600 underline break-all">{booking.shipping!.tracking_id}</a>
                        : booking.shipping!.tracking_id
                      }
                    </span>

                    <span className="font-bold text-black">Dispatched</span>
                    <span>:</span>
                    <span>
                      {booking.shipping!.dispatch_date || "—"}
                      {booking.shipping!.dispatch_time ? ` at ${booking.shipping!.dispatch_time}` : ""}
                    </span>

                    <span className="font-bold text-black">Est. Delivery</span>
                    <span>:</span>
                    <span>{booking.shipping!.estimated_delivery || "—"}</span>

                    {booking.shipping!.delivered_date && (
                      <>
                        <span className="font-bold text-black">Delivered On</span>
                        <span>:</span>
                        <span className="font-semibold text-green-600">
                          {booking.shipping!.delivered_date}
                          {booking.shipping!.delivered_time ? ` at ${booking.shipping!.delivered_time}` : ""}
                        </span>
                      </>
                    )}

                    {booking.shipping!.return_reason && (
                      <>
                        <span className="font-bold text-black">Return Reason</span>
                        <span>:</span>
                        <span className="text-red-600">{booking.shipping!.return_reason}</span>
                      </>
                    )}

                    {booking.shipping!.remarks && (
                      <>
                        <span className="font-bold text-black">Remarks</span>
                        <span>:</span>
                        <span>{booking.shipping!.remarks}</span>
                      </>
                    )}
                  </div>
                </div>
              )}
              {/* ─────────────────────────────────────────────────────────── */}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          NEW: Edit Track Modal (mirrors OrderDetailView exactly)
          Admin only — triggered by "Edit Track" button in header
      ══════════════════════════════════════════════════════════════════════ */}
      {showEditTrack && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50"
          onClick={() => setShowEditTrack(false)}>
          <div className="bg-white rounded-xl shadow-lg w-[90%] max-w-xl p-6 relative max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowEditTrack(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-black text-lg font-bold">✕</button>

            <p className="text-lg font-semibold mb-5">Edit Tracking Details</p>

            <div className="flex flex-col gap-4">

              {/* Booking Status */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Booking Status</label>
                <select
                  value={trackForm.status}
                  onChange={e => setTrackForm(prev => ({ ...prev, status: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-black">
                  <option value="">— Select Status —</option>
                  <option value="pending">Pending</option>
                  <option value="booked">Booked</option>
                  <option value="dispatched">Dispatched</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Courier + Tracking ID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Courier Partner</label>
                  <input type="text" value={trackForm.courier_partner}
                    onChange={e => setTrackForm(prev => ({ ...prev, courier_partner: e.target.value }))}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-black"
                    placeholder="e.g. Delhivery" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tracking ID / AWB</label>
                  <input type="text" value={trackForm.tracking_id}
                    onChange={e => setTrackForm(prev => ({ ...prev, tracking_id: e.target.value }))}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-black"
                    placeholder="e.g. DL4829301023" />
                </div>
              </div>

              {/* Dispatch Date + Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Dispatch Date</label>
                  <input type="date" value={trackForm.dispatch_date}
                    onChange={e => setTrackForm(prev => ({ ...prev, dispatch_date: e.target.value }))}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-black" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Dispatch Time</label>
                  <input type="time" value={trackForm.dispatch_time}
                    onChange={e => setTrackForm(prev => ({ ...prev, dispatch_time: e.target.value }))}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-black" />
                </div>
              </div>

              {/* Estimated Delivery */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Estimated Delivery Date</label>
                <input type="date" value={trackForm.estimated_delivery}
                  onChange={e => setTrackForm(prev => ({ ...prev, estimated_delivery: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-black" />
              </div>

              {/* Delivered Date + Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Delivered Date</label>
                  <input type="date" value={trackForm.delivered_date}
                    onChange={e => setTrackForm(prev => ({ ...prev, delivered_date: e.target.value }))}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-black" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Delivered Time</label>
                  <input type="time" value={trackForm.delivered_time}
                    onChange={e => setTrackForm(prev => ({ ...prev, delivered_time: e.target.value }))}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-black" />
                </div>
              </div>

              {/* Tracking URL */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tracking URL (optional)</label>
                <input type="url" value={trackForm.tracking_url}
                  onChange={e => setTrackForm(prev => ({ ...prev, tracking_url: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="https://courier.com/track/..." />
              </div>

              {/* Return Reason */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Return Reason (if applicable)</label>
                <input type="text" value={trackForm.return_reason}
                  onChange={e => setTrackForm(prev => ({ ...prev, return_reason: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="e.g. Customer not available" />
              </div>

              {/* Remarks */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Remarks</label>
                <textarea rows={2} value={trackForm.remarks}
                  onChange={e => setTrackForm(prev => ({ ...prev, remarks: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-black resize-none"
                  placeholder="Any additional notes..." />
              </div>

              {trackError && <p className="text-red-500 text-xs">{trackError}</p>}

              <div className="flex justify-end gap-3 pt-1">
                <button onClick={() => setShowEditTrack(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 cursor-pointer">
                  Cancel
                </button>
                <button onClick={saveTrackDetails} disabled={trackSaving}
                  className="px-6 py-2 rounded-md bg-[#106187] text-white font-semibold disabled:bg-gray-400 cursor-pointer">
                  {trackSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ── END Edit Track Modal ──────────────────────────────────────────── */}
    </Layout>
  );
}
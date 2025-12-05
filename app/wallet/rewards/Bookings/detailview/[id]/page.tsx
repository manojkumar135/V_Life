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
  { label: "Pending", value: "pending" },
  { label: "Booked", value: "booked" },
  { label: "Cancelled", value: "cancelled" },
];

interface RewardItem {
  reward_id: string;
  reward_name: string;
  type: "score" | "matching";
  points_required?: number;
  matches_required?: number;
  count: number;
  score_used?: number;
  matches_used?: number;
}

interface BookingData {
  booking_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_contact: string;
  user_role: string;
  rank?: string;
  rewards: RewardItem[];
  total_score_used?: number;
  remaining_score?: number;
  total_matches_used?: number;
  remaining_matches?: number;
  type: "score" | "matching";
  status: string;
  date: string;
  time: string;
  booked_at: string;
  address: string;
  description: string;
}

export default function BookingDetailView() {
  const params = useParams();
  const router = useRouter();
  const { user } = useVLife();
  const bookingId = (params as any)?.id as string;

  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [showUserDetails, setShowUserDetails] = useState(false);

  // Fetch booking data
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

  const handleStatusChange = async (newStatus: string) => {
    if (!booking) return;
    try {
      setStatus(newStatus);
      await axios.put("/api/booking-operations", {
        booking_id: booking.booking_id,
        status: newStatus,
      });
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

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
        <button
          onClick={() => router.push("/wallet/rewards/Bookings")}
          className="flex items-center gap-2 text-gray-600 hover:text-black"
        >
          <IoIosArrowBack size={20} />
        </button>
        <p className="mt-6 text-center text-gray-500">Booking not found</p>
      </div>
    );
  }

  const isMatching = booking.type === "matching";
  const unitLabel = isMatching ? "Matches" : "pts";

  return (
    <Layout>
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <Loader />
        </div>
      )}

      <div className="flex flex-col rounded-2xl p-4 max-lg:p-3 bg-white shadow-lg h-[100%]">
        {/* Header */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center border-b pb-3 mb-3 gap-4">
          <div className="flex flex-col xl:flex-row xl:items-center gap-3 w-full xl:w-auto">
            <button
              onClick={() => router.push("/wallet/rewards/Bookings")}
              className="text-black cursor-pointer"
            >
              <IoIosArrowBack size={25} />
            </button>

            <div className="flex flex-col xl:flex-row xl:items-center gap-x-8 text-sm font-medium text-gray-600 max-lg:ml-5 ">
              <span>
                Booking ID:{" "}
                <span className="text-black font-semibold">
                  {booking.booking_id}
                </span>
              </span>
              <span>
                Type:{" "}
                <span className="text-black font-semibold capitalize">
                  {booking.type}
                </span>
              </span>
              <span>
                Date:{" "}
                <span className="text-black font-semibold">{booking.date}</span>
              </span>
              <span>
                Time:{" "}
                <span className="text-black font-semibold">{booking.time}</span>
              </span>
            </div>
          </div>

          <div className="flex justify-between items-start gap-4 h-6 max-lg:ml-5 max-lg:w-[95%]">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Status:</span>
              {user?.role === "admin" ? (
                <SelectField
                  name="status"
                  value={status}
                  onChange={(e: any) =>
                    handleStatusChange(e.target?.value || e?.value)
                  }
                  options={statusOptions}
                  className="w-36"
                  controlPaddingLeft="0px"
                  controlHeight="2rem"
                />
              ) : (
                <span className="text-sm font-semibold text-gray-600">
                  {booking.status}
                </span>
              )}
            </div>

            <SubmitButton
              onClick={() => setShowUserDetails(true)}
              className=" font-semibold text-sm px-3 !py-1.5 rounded-md"
            >
              User Info
            </SubmitButton>
          </div>
        </div>

        {/* Rewards List */}
        <div className="flex-1 overflow-y-auto pr-2">
          <div className="lg:px-4">
            {/* Header */}
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

            {/* List */}
            <div className="space-y-4">
              {booking.rewards.map((item) => {
                const required = isMatching
                  ? item.matches_required
                  : item.points_required;

                const total = isMatching ? item.matches_used : item.score_used;

                return (
                  <div
                    key={item.reward_id}
                    className="w-full rounded-xl p-4 transition-all shadow-sm hover:shadow-lg border border-gray-200"
                  >
                    {/* Desktop */}
                    <div className="hidden lg:grid grid-cols-12 items-center">
                      <div className="col-span-5 font-semibold text-gray-900">
                        {item.reward_name}
                      </div>
                      <div className="col-span-2 text-center text-gray-700">
                        {item.count}
                      </div>
                      <div className="col-span-2 text-right text-gray-700">
                        {required} {unitLabel}
                      </div>
                      <div className="col-span-3 text-right font-bold text-gray-900">
                        {total} {unitLabel}
                      </div>
                    </div>

                    {/* Mobile */}
                    <div className="lg:hidden flex flex-col gap-2 text-sm">
                      <p className="font-semibold text-gray-900">
                        {item.reward_name}
                      </p>
                      <p className="text-gray-600">
                        Required: {required} {unitLabel}
                      </p>
                      <div className="flex justify-between">
                        <p>Qty: {item.count}</p>
                        <p className="font-bold text-gray-900">
                          Total: {total} {unitLabel}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-none border-t pt-4 px-10 bg-white py-3">
          {isMatching ? (
            <>
              <div className="flex justify-between text-base sm:text-lg font-semibold">
                <span>Total Matches Used:</span>
                <span>{booking.total_matches_used}</span>
              </div>
              <div className="flex justify-between text-base sm:text-lg font-semibold mt-1">
                <span>Remaining Matches:</span>
                <span>{booking.remaining_matches}</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between text-base sm:text-lg font-semibold">
                <span>Total Points Used:</span>
                <span>{booking.total_score_used}</span>
              </div>
              <div className="flex justify-between text-base sm:text-lg font-semibold mt-1">
                <span>Remaining Points:</span>
                <span>{booking.remaining_score}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* User Info Modal */}
      {showUserDetails && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 backdrop-blur-sm"
          onClick={() => setShowUserDetails(false)}
        >
          <div
            className="bg-white rounded-xl shadow-lg w-[90%] max-w-md p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowUserDetails(false)}
              className="absolute top-3 right-5 text-gray-500 hover:text-red font-bold text-lg"
            >
              ✕
            </button>

            <p className="text-lg font-semibold mb-4">User Details</p>

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

              <span className="font-semibold text-black">Address</span>
              <span>:</span>
              <span className="text-black whitespace-pre-line">
                {booking.address}
              </span>

              <span className="font-semibold text-black">Description</span>
              <span>:</span>
              <span className="text-black whitespace-pre-line">
                {booking.description || "N/A"}
              </span>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

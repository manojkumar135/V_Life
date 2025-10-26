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
  points_required: number;
  count: number;
  score_used: number;
}

interface BookingData {
  booking_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_contact: string;
  user_role: string;
  rewards: RewardItem[];
  total_score_used: number;
  remaining_score: number;
  status: string;
  date: string;
  time: string;
  booked_at: string;
}

export default function BookingDetailView() {
  const params = useParams();
  const router = useRouter();
  const { user } = useVLife();
  const bookingId = (params as any)?.id as string;

  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  // Fetch booking data
  useEffect(() => {
    const fetchBooking = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`/api/booking-operations?id=${bookingId}`);
        if (res?.data?.success && res.data.data) {
          const bookingData = res.data.data; // ✅ direct object
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

  return (
    <Layout>
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <Loader />
        </div>
      )}

      <div className="flex flex-col rounded-2xl p-4 max-lg:p-3 bg-white shadow-lg h-[100%]">
        {/* Header */}
        <div className="flex-none border-b  pb-2 mb-2 flex flex-col sm:flex-row xl:justify-between items-start sm:items-center gap-3">
          <div className="flex flex-row max-lg:flex-col lg:flex-row items-start lg:items-center gap-4 w-full">
            <button
              onClick={() => router.push("/wallet/rewards/Bookings")}
              className="flex items-center gap-2 text-black hover:text-black transition-colors cursor-pointer"
            >
              <IoIosArrowBack size={25} />
            </button>

            <div className="flex max-lg:flex-col flex-row justify-between xl:items-center  gap-4 w-full xl:w-[80%] max-lg:pl-3">
              <span className="text-sm font-medium text-gray-600">
                Booking ID:{" "}
                <span className="text-black font-semibold">
                  {booking.booking_id}
                </span>
              </span>
              <span className="text-sm font-medium text-gray-600">
                Date:{" "}
                <span className="text-black font-semibold">{booking.date}</span>
              </span>
              <span className="text-sm font-medium text-gray-600">
                Time:{" "}
                <span className="text-black font-semibold">{booking.time}</span>
              </span>
            </div>
          </div>

          {/* Status Row */}
          <div className="flex items-center gap-2 ml-auto mr-3 max-lg:-mt-4">
            <span className="text-md max-md:text-sm font-semibold">
              Status:
            </span>
            {user?.role === "admin" ? (
              <SelectField
                name="status"
                value={status}
                onChange={(e: any) =>
                  handleStatusChange(e.target?.value || e?.value)
                }
                options={statusOptions}
                controlPaddingLeft="0px"
                className="w-36 h-6 max-lg:h-4"
              />
            ) : (
              <span className="text-sm font-semibold text-gray-600">
                {booking.status}
              </span>
            )}
          </div>
        </div>

        {/* Rewards List */}
        <div className="flex-1 overflow-y-auto pr-2">
          {booking.rewards.length === 0 ? (
            <p className="text-gray-500 text-center py-6">No rewards booked</p>
          ) : (
            <div className="lg:px-4">
              {/* Table Header - Visible on Large Screens */}
              <div className="hidden lg:grid grid-cols-12 font-semibold text-gray-700 text-sm border-b px-2 mx-1 pb-2 mb-2">
                <div className="col-span-5 xl:pl-5">Reward</div>
                <div className="col-span-2 text-center">Quantity</div>
                <div className="col-span-2 text-right">Points Required</div>
                <div className="col-span-3 text-right">Total Points</div>
              </div>

              {/* Rewards List */}
              <div className="space-y-4">
                {booking.rewards.map((item) => (
                  <div
                    key={item.reward_id}
                    className="w-full rounded-xl p-4 transition-all shadow-sm hover:shadow-lg border border-gray-200"
                  >
                    {/* Desktop View */}
                    <div className="hidden lg:grid grid-cols-12 items-center">
                      <div className="col-span-5 flex items-center gap-4">
                        <div>
                          <p className="font-semibold text-gray-900 text-sm lg:text-base">
                            {item.reward_name}
                          </p>
                        </div>
                      </div>
                      <div className="col-span-2 text-center font-medium text-gray-700">
                        {item.count}
                      </div>
                      <div className="col-span-2 text-right text-gray-700">
                        {item.points_required} pts
                      </div>
                      <div className="col-span-3 text-right font-bold text-gray-900">
                        {item.score_used} pts
                      </div>
                    </div>

                    {/* Mobile View */}
                    <div className="lg:hidden flex flex-col gap-3">
                      <div className="flex flex-col gap-1">
                        <p className="font-semibold text-gray-900 text-sm">
                          {item.reward_name}
                        </p>
                        <p className="text-gray-600 text-xs">
                          Points Required: {item.points_required} pts
                        </p>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <p className="text-gray-700">
                          Qty: <span className="font-medium">{item.count}</span>
                        </p>
                        <p className="font-bold text-gray-900">
                          Total: {item.score_used} pts
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-none border-t pt-4 max-md:px-5 px-10 bg-white py-3">
          <div className="flex justify-between items-center text-base sm:text-lg font-semibold">
            <span>Total Points Used:</span>
            <span className="text-black">{booking.total_score_used}</span>
          </div>
          <div className="flex justify-between items-center text-base sm:text-lg font-semibold mt-1">
            <span>Remaining Points:</span>
            <span className="text-black">{booking.remaining_score}</span>
          </div>
        </div>
      </div>
    </Layout>
  );
}

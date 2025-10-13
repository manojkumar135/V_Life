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
        const res = await axios.get(`/api/bookings-operations?id=${bookingId}`);
        if (res?.data?.success) {
          setBooking(res.data.data[0]);
          setStatus(res.data.data[0]?.status || "pending");
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
      await axios.put("/api/bookings-operations", {
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
          onClick={() => router.push("/wallet/rewards/bookings")}
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
      <div className="flex flex-col rounded-2xl p-4 max-lg:p-3 bg-white shadow-lg h-[100%]">
        {/* Header */}
        <div className="flex-none border-b pb-2 mb-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <button
            onClick={() => router.push("/wallet/rewards/bookings")}
            className="flex items-center gap-2 text-black hover:text-black transition-colors cursor-pointer"
          >
            <IoIosArrowBack size={25} />
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <span className="text-sm font-medium text-gray-600">
              Booking ID:{" "}
              <span className="text-black font-semibold">{booking.booking_id}</span>
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

          {/* Status */}
          {user?.role === "admin" ? (
            <SelectField
              label="Status"
              name="status"
              value={status}
              onChange={(e: any) => handleStatusChange(e.target?.value || e?.value)}
              options={statusOptions}
              controlPaddingLeft="0px"
              className="w-36"
            />
          ) : (
            <span className="text-sm font-medium text-gray-600">
              Status: <span className="text-black font-semibold">{booking.status}</span>
            </span>
          )}
        </div>

        {/* Rewards List */}
        <div className="flex-1 overflow-y-auto pr-2">
          {booking.rewards.length === 0 ? (
            <p className="text-gray-500 text-center py-6">No rewards booked</p>
          ) : (
            <div className="space-y-4">
              {booking.rewards.map((item) => (
                <div
                  key={item.reward_id}
                  className="w-full rounded-xl p-4 transition-all shadow-sm hover:shadow-lg border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:flex-1">
                    <p className="font-semibold text-gray-900">{item.reward_name}</p>
                    <p className="text-gray-600 text-sm mt-1 sm:mt-0">
                      Qty: {item.count}
                    </p>
                    <p className="text-gray-700 text-sm">
                      Points: {item.points_required}
                    </p>
                    {/* {item.bv && <p className="text-gray-700 text-sm">BV: {item.bv}</p>} */}
                  </div>
                  <p className="font-bold text-gray-900">
                    Total: {item.score_used} pts
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-none border-t pt-4 lg:px-10 bg-white py-3">
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

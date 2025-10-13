"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import axios from "axios";
import Layout from "@/layout/Layout";
import SubmitButton from "@/components/common/submitbutton";
import { useVLife } from "@/store/context";
import ShowToast from "@/components/common/Toast/toast";
import Loader from "@/components/common/loader";
import { FaEdit } from "react-icons/fa";

export default function RewardsPage() {
  const { user } = useVLife();
  const [rewards, setRewards] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ Fetch rewards from API
  useEffect(() => {
    const fetchRewards = async () => {
      try {
        const res = await axios.get("/api/rewards-operations");
        if (res.data.success) setRewards(res.data.data || []);
        else ShowToast.error(res.data.message || "Failed to load rewards.");
      } catch {
        ShowToast.error("Failed to load rewards.");
      } finally {
        setLoading(false);
      }
    };
    fetchRewards();
  }, []);

  // ✅ Redeem reward logic
  const handleRedeem = (reward: any) => {
    const tickets = Math.floor(user?.score || 1000 / reward.pointsRequired);
    if (tickets > 0) {
      setBookings((prev) => [
        ...prev,
        { userId: user.user_id, reward: reward.title, tickets },
      ]);
      ShowToast.success(
        `You booked ${tickets} ticket(s) for ${reward.title} using ${
          tickets * reward.pointsRequired
        } points!`
      );
    } else {
      ShowToast.error("Not enough points to redeem this reward.");
    }
  };

  // if (loading) {
  //   return (
  //     <Layout>
  //       <div className="flex justify-center items-center min-h-screen">
  //         <Loader />
  //       </div>
  //     </Layout>
  //   );
  // }

  return (
    <Layout>
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <Loader />
        </div>
      )}
      <div className="p-2 px-6 space-y-1 lg:h-full">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-1 w-full mb-2">
          {/* Title + Score */}
          <div className="flex items-center w-full max-lg:mb-2 ">
            <p className="text-2xl max-md:text-2xl font-bold text-black mr-2">
              Rewards{" "}
            </p>

            {user?.score && (
              <p className="text-sm max-md:text-xs font-medium text-gray-700 mt-2">
                ( Your Score:{" "}
                <span className="text-yellow-400 font-bold">{user.score}</span>{" "}
                )
              </p>
            )}
          </div>

          {/* Admin Action Buttons */}
          <div className="flex flex-row gap-3 w-full sm:w-auto">
            {user?.role === "admin" && (
              <Link href="/wallet/rewards/addreward" className="w-full sm:w-39">
                <SubmitButton className="w-full px-4 py-2 bg-yellow-400 text-black font-semibold rounded-md hover:bg-yellow-500 transition-all duration-200">
                  + Add Reward
                </SubmitButton>
              </Link>
            )}

            <Link href="/wallet/rewards/Bookings" className="w-full sm:w-39">
              <SubmitButton className="w-full px-4 py-2 font-semibold rounded-md transition-all duration-200 bg-blue-500">
                Bookings
              </SubmitButton>
            </Link>
          </div>
        </div>

        {/* Rewards List */}
        <div className="flex flex-col w-full ">
          {rewards.length === 0 ? (
            <p className="text-gray-500 text-center py-10">
              No rewards available.
            </p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {rewards.map((reward) => {
                const tickets = Math.floor(
                  (user?.score || 0) / reward.pointsRequired
                );
                return (
                  <div
                    key={reward.reward_id}
                    className="border border-gray-200 rounded-xl shadow-md bg-white hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col w-full max-w-sm mx-auto"
                  >
                    {/* Image Section */}
                    <div className="relative w-full h-36 sm:h-40 md:h-44">
                      <Image
                        src={reward.image || "/default.jpg"}
                        alt={reward.title}
                        fill
                        className="object-cover w-full h-full rounded-xl px-1 py-1 shadow-md"
                      />
                    </div>

                    {/* Info Section */}
                    <div className="px-4 py-3 flex flex-col gap-2">
                      <p className="text-lg font-bold text-black mt-2">
                        {reward.title}
                      </p>
                      <p className="text-gray-600 text-sm line-clamp-3">
                        {reward.description}
                      </p>
                      <p className="mt-1 font-semibold text-black text-sm sm:text-base">
                        Required:{" "}
                        <span className="text-yellow-500">
                          {reward.points_required}
                        </span>{" "}
                        points
                      </p>

                      <p className="text-gray-500 text-sm">
                        You can buy{" "}
                        <span className="text-yellow-400 font-semibold">
                          {tickets}
                        </span>{" "}
                        ticket(s)
                      </p>

                      {/* Action Buttons */}
                      <div className="flex justify-end items-center mt-2 gap-2">
                        {user?.role === "admin" && (
                          <Link
                            href={`/wallet/rewards/editreward/${reward._id}`}
                          >
                            <button
                              type="button"
                              className="flex items-center justify-center mt-2 px-1 py-1 rounded-md  transition-all duration-200"
                              title="Edit Reward"
                            >
                              <FaEdit size={20} className="" />
                            </button>
                          </Link>
                        )}

                        <SubmitButton
                          className="px-4 py-1 bg-yellow-400 text-black font-semibold rounded-md hover:bg-yellow-500 transition-all duration-200"
                          onClick={() => handleRedeem(reward)}
                        >
                          Redeem
                        </SubmitButton>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

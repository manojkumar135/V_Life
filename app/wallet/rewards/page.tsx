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
      <div className="p-3 px-6 space-y-4 h-full">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div>
            <p className="text-2xl font-bold text-black"> Rewards</p>
            {user?.score && (
              <p className="text-sm font-medium text-gray-700 text-right">
                Your Score:{" "}
                <span className="text-yellow-400 font-bold">{user.score}</span>
              </p>
            )}
          </div>

          {/* Admin Action Buttons */}
          {user?.role === "admin" && (
            <div className="flex gap-3">
              <Link href="/wallet/rewards/addreward">
                <SubmitButton className="px-4 py-2 bg-yellow-400 text-black font-semibold rounded-md hover:bg-yellow-500 transition-all duration-200">
                  + Add Reward
                </SubmitButton>
              </Link>
              <Link href="/wallet/rewards/Bookings">
                <SubmitButton className="px-4 py-2  font-semibold rounded-md transition-all duration-200">
                  Bookings
                </SubmitButton>
              </Link>
            </div>
          )}
        </div>

        {/* Rewards List */}
        <div className="flex flex-col w-full ">
          {rewards.length === 0 ? (
            <p className="text-gray-500 text-center py-10">
              No rewards available.
            </p>
          ) : (
            rewards.map((reward) => {
              const tickets = Math.floor(
                (user?.score || 0) / reward.pointsRequired
              );
              return (
                <div
                  key={reward.reward_id}
                  className="border border-gray-200 rounded-xl shadow-md bg-white hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col lg:flex-row w-full my-2 h-[150px] max-md:h-auto"
                >
                  {/* Image Section */}
                  <div className="relative w-full lg:w-[300px] h-[150px] max-md:h-[160px]">
                    <Image
                      src={reward.image || "/default.jpg"}
                      alt={reward.title}
                      fill
                      className="rounded-t-xl lg:rounded-l-xl lg:rounded-tr-none object-cover"
                    />
                  </div>

                  {/* Info Section */}
                  <div className="px-4 py-2 flex flex-col flex-grow">
                    <div className="flex-1">
                      <p className="text-xl font-bold text-black">
                        {reward.title}
                      </p>
                      <p className="text-gray-600 mt-1 line-clamp-2">
                        {reward.description}
                      </p>
                      <p className="mt-2 font-semibold text-black">
                        Required:{" "}
                        <span className="text-yellow-400">
                          {reward.pointsRequired}
                        </span>{" "}
                        points
                      </p>
                      {user?.role !== "admin" && (
                        <p className="text-sm text-gray-500">
                          You can buy{" "}
                          <span className="text-yellow-400 font-semibold">
                            {tickets}
                          </span>{" "}
                          ticket(s)
                        </p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end items-end -mt-4">
                      {user?.role === "admin" && (
                        <Link href={`/wallet/rewards/editreward/${reward._id}`}>
                          <button
                            type="button"
                            className="flex items-center justify-center p-2 rounded-md  transition-all duration-200"
                            title="Edit Reward"
                          >
                            <FaEdit size={24} />
                          </button>
                        </Link>
                      )}

                      <SubmitButton
                        onClick={() => handleRedeem(reward)}
                        className="px-5 py-2"
                      >
                        Redeem
                      </SubmitButton>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Layout>
  );
}

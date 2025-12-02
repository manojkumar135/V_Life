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
import { LiaGiftsSolid } from "react-icons/lia";
import { IoIosArrowBack } from "react-icons/io";
import { IoRemove, IoAdd } from "react-icons/io5";
import { useRouter } from "next/navigation";

export default function RewardsPage() {
  const { user, setUser } = useVLife();
  const [rewards, setRewards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<{ [key: string]: number }>({});
  const [scoreLeft, setScoreLeft] = useState(user?.score || 0);
  const [showModal, setShowModal] = useState(false);
  const [address, setAddress] = useState<string>("");

  const router = useRouter();
  // console.log(user)

  // ✅ Fetch rewards
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

  // ✅ Fetch address automatically
  useEffect(() => {
    const fetchAddress = async () => {
      try {
        const res = await axios.post("/api/address-operations", {
          user_id: user?.user_id,
        });
        if (res.data.success && res.data.address) {
          setAddress(res.data.address);
        } else {
          setAddress("No address available");
        }
      } catch (err) {
        console.error("Address fetch error:", err);
        setAddress("No address available");
      }
    };
    if (user?.user_id) fetchAddress();
  }, [user?.user_id]);

  // ✅ Update scoreLeft when selection changes
  useEffect(() => {
    let used = 0;
    Object.entries(selected).forEach(([id, qty]) => {
      const reward = rewards.find((r) => r.reward_id === id);
      if (reward) used += reward.points_required * qty;
    });
    setScoreLeft((user?.score || 0) - used);
  }, [selected, rewards, user?.score]);

  // ✅ Select/Deselect
  const handleSelect = (reward: any) => {
    if (selected[reward.reward_id]) {
      const newSelected = { ...selected };
      delete newSelected[reward.reward_id];
      setSelected(newSelected);
    } else {
      setSelected({ ...selected, [reward.reward_id]: 1 });
    }
  };

  // ✅ Quantity controls
  const handleIncreaseQuantity = (id: string, max: number) => {
    setSelected((prev) => ({
      ...prev,
      [id]: Math.min((prev[id] || 1) + 1, max),
    }));
  };
  const handleDecreaseQuantity = (id: string) => {
    setSelected((prev) => ({
      ...prev,
      [id]: Math.max((prev[id] || 1) - 1, 1),
    }));
  };
  const handleQuantityChange = (id: string, value: number, max: number) => {
    setSelected((prev) => ({
      ...prev,
      [id]: Math.min(Math.max(value, 1), max),
    }));
  };

  // ✅ Booking handler
  const handleBookNow = async () => {
    if (Object.keys(selected).length === 0) {
      ShowToast.error("Select at least one reward to book.");
      return;
    }

    if (!address || address === "No address available") {
      ShowToast.error("Please provide a valid address before booking.");
      return;
    }

    const rewardsArray = Object.entries(selected)
      .map(([id, qty]) => {
        const reward = rewards.find((r) => r.reward_id === id);
        if (!reward) return null;
        return {
          reward_id: reward.reward_id,
          reward_name: reward.title,
          points_required: reward.points_required,
          count: qty,
          score_used: reward.points_required * qty,
        };
      })
      .filter(Boolean);

    const total_score_used = rewardsArray.reduce(
      (sum, r) => sum + r!.score_used,
      0
    );

    const bookingPayload = {
      user_id: user.user_id,
      user_name: user.user_name,
      user_email: user.mail || "",
      user_contact: user.contact || "",
      rank: user.rank,
      user_role: user.role,
      rewards: rewardsArray,
      total_score_used,
      remaining_score: (user.score || 0) - total_score_used,
      status: "pending",
      description: "",
      address: address,
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
    };

    try {
      setLoading(true);
      const res = await axios.post("/api/booking-operations", bookingPayload);
      if (res.data.success) {
        ShowToast.success("Booking created successfully!");
        setUser({ ...user, score: (user.score || 0) - total_score_used });
        setSelected({});
        router.push("/wallet/rewards/Bookings");
      } else {
        ShowToast.error(res.data.message || "Failed to create booking.");
      }
    } catch (err) {
      console.error("Book Now Error:", err);
      ShowToast.error("Failed to create booking.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="p-2 px-6 space-y-1 lg:h-full max-md:min-h-[160vh]">
        {loading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <Loader />
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-1 w-full max-md:mb-4 mb-2">
          <div className="flex flex-wrap items-center w-full gap-2 max-lg:mb-2">
            <IoIosArrowBack
              size={25}
              color="black"
              className="cursor-pointer z-20"
              onClick={() => router.push("/wallet")}
            />
            <p className="text-2xl max-md:text-xl font-bold text-black">
              Rewards
            </p>
            {user?.score !== undefined && (
              <p className="text-sm max-md:text-xs font-medium text-gray-700 mt-1">
                ( Your Score:{" "}
                <span className="text-yellow-400 font-bold">{scoreLeft}</span> )
              </p>
            )}
          </div>

          {/* Admin Buttons */}
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
                {user?.role === "admin" ? "Bookings" : "My Bookings"}
              </SubmitButton>
            </Link>
          </div>
        </div>

        {/* Rewards List */}
        <div className="flex flex-col w-full">
          {rewards.length === 0 ? (
            <p className="text-gray-500 text-center py-10">
              No rewards available.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-4">
              {rewards.map((reward) => {
                const isActive = reward.status === "active";
                if (!isActive && user?.role !== "admin") return null;

                const maxTickets = Math.floor(
                  scoreLeft / reward.points_required +
                    (selected[reward.reward_id] || 0)
                );
                const quantity = selected[reward.reward_id] || 1;
                const isSelected = selected[reward.reward_id] !== undefined;

                return (
                  <div
                    key={reward.reward_id}
                    className="border border-gray-200 rounded-xl shadow-md bg-white hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col w-full max-w-sm mx-auto"
                  >
                    <div className="relative w-full h-36 sm:h-40 md:h-46 ">
                      <Image
                        src={reward.image || "/default.jpg"}
                        alt={reward.title}
                        fill
                        className="object-cover w-full h-full rounded-xl px-1 py-1 shadow-md border border-gray-300"
                      />
                      {!isActive && user?.role === "admin" && (
                        <span className="absolute top-2 right-2 bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded">
                          Unavailable
                        </span>
                      )}
                    </div>

                    <div className="px-4 py-3 flex flex-col gap-2">
                      <p className="text-lg font-bold text-black mt-1">
                        {reward.title}
                      </p>
                      <p className="text-gray-600 text-sm line-clamp-1">
                        {reward.description}
                      </p>
                      <p className="mt-1 font-semibold text-black text-sm sm:text-base">
                        Required:{" "}
                        <span className="text-green-700">
                          {reward.points_required}
                        </span>{" "}
                        points
                      </p>

                      <div className="flex items-center justify-between mt-1 gap-2">
                        {isSelected ? (
                          <div className="flex items-center rounded-full px-2 py-1 w-fit border border-gray-300">
                            <button
                              type="button"
                              onClick={() =>
                                handleDecreaseQuantity(reward.reward_id)
                              }
                              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-200 cursor-pointer"
                              disabled={!isActive || quantity <= 1}
                            >
                              <IoRemove size={18} />
                            </button>
                            <input
                              type="number"
                              value={quantity}
                              min={1}
                              max={maxTickets || 0}
                              onChange={(e) =>
                                handleQuantityChange(
                                  reward.reward_id,
                                  parseInt(e.target.value),
                                  maxTickets
                                )
                              }
                              className="mx-2 w-8 text-center text-[0.85rem] font-semibold text-gray-800 border-2 border-gray-600 rounded no-spinner"
                              disabled={!isActive}
                            />
                            <button
                              type="button"
                              onClick={() =>
                                handleIncreaseQuantity(
                                  reward.reward_id,
                                  maxTickets
                                )
                              }
                              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-200 cursor-pointer"
                              disabled={!isActive || quantity >= maxTickets}
                            >
                              <IoAdd size={18} />
                            </button>
                          </div>
                        ) : (
                          <div />
                        )}

                        <div className="flex items-center gap-2">
                          {user?.role === "admin" && (
                            <Link
                              href={`/wallet/rewards/editreward/${reward._id}`}
                            >
                              <button
                                type="button"
                                className="flex items-center justify-center px-1 py-1 rounded-md transition-all duration-200 cursor-pointer"
                                title="Edit Reward"
                              >
                                <FaEdit size={20} />
                              </button>
                            </Link>
                          )}

                          {!isSelected ? (
                            <button
                              onClick={() => handleSelect(reward)}
                              disabled={
                                !isActive || scoreLeft < reward.points_required
                              }
                              className={`px-3 py-1.5 font-semibold rounded-md transition-all duration-200
                                ${
                                  !isActive || scoreLeft < reward.points_required
                                    ? "bg-gray-400 text-white cursor-not-allowed"
                                    : "bg-[#106187] text-white cursor-pointer"
                                }`}
                            >
                              Redeem
                            </button>
                          ) : (
                            <SubmitButton
                              className="!px-3 !py-1.5   font-semibold rounded-md  transition-all duration-200 cursor-pointer"
                              onClick={() => handleSelect(reward)}
                              disabled={!isActive}
                            >
                              Remove
                            </SubmitButton>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Floating Gift Icon (Book) */}
        {Object.keys(selected).length > 0 && (
          <>
            <div
              className="fixed bottom-8 right-8 z-50 bg-gradient-to-tr from-[#0C3978] via-[#106187] to-[#16B8E4] rounded-full p-3 flex items-center justify-center cursor-pointer hover:scale-106 transition-all duration-300 animate-pulseGlow"
              onClick={() => setShowModal(true)}
              title="Book Selected Rewards"
            >
              <LiaGiftsSolid
                size={36}
                className="text-white animate-goldShine animate-pulseGlow"
              />
            </div>

            <style jsx>{`
              @keyframes goldShine {
                0%,
                100% {
                  filter: drop-shadow(0 0 4px #ffd700)
                    drop-shadow(0 0 8px #fff7b3) drop-shadow(0 0 12px #ffea70);
                }
                50% {
                  filter: drop-shadow(0 0 10px #ffe066)
                    drop-shadow(0 0 20px #fff3b0) drop-shadow(0 0 30px #ffd700);
                }
              }
              .animate-goldShine {
                animation: goldShine 2.5s ease-in-out infinite;
              }
              @keyframes pulseGlow {
                0% {
                  box-shadow: 0 0 15px rgba(255, 215, 0, 0.3);
                }
                50% {
                  box-shadow: 0 0 25px rgba(255, 215, 0, 0.7);
                }
                100% {
                  box-shadow: 0 0 15px rgba(255, 215, 0, 0.3);
                }
              }
              .animate-pulseGlow {
                animation: pulseGlow 3s ease-in-out infinite;
              }
            `}</style>
          </>
        )}
      </div>

      {/* ✅ Reward Summary Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center p-4 max-sm:p-2 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-md sm:max-w-lg md:max-w-md p-4 sm:p-6 relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-red-700 text-2xl sm:text-xl cursor-pointer font-semibold"
            >
              ✕
            </button>

            <h2 className="text-xl sm:text-2xl font-bold text-center text-gray-800 mb-4">
              Reward Summary
            </h2>

            <div className="max-h-[200px] overflow-y-auto border-t border-b py-2">
              {Object.entries(selected).map(([id, qty]) => {
                const reward = rewards.find((r) => r.reward_id === id);
                return (
                  <div
                    key={id}
                    className="flex justify-between items-center border-b last:border-none py-1"
                  >
                    <div>
                      <p className="font-semibold text-gray-800 text-sm sm:text-base">
                        {reward?.title}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-600">
                        {qty} × {reward?.points_required} pts
                      </p>
                    </div>
                    <p className="font-bold text-blue-600 text-sm sm:text-base">
                      {reward?.points_required * qty} pts
                    </p>
                  </div>
                );
              })}
            </div>

            {/* ✅ Address Field */}
            <div className="mt-3">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Shipping Address
              </label>
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black-400"
                placeholder="Enter delivery address"
                required
              />
            </div>

            {/* Total */}
            <div className="flex justify-between items-center mt-3 text-sm sm:text-base">
              <p className="font-semibold text-gray-700">Total Points Used:</p>
              <p className="font-bold text-green-700">
                {Object.entries(selected).reduce((acc, [id, qty]) => {
                  const reward = rewards.find((r) => r.reward_id === id);
                  return acc + (reward?.points_required || 0) * qty;
                }, 0)}{" "}
                pts
              </p>
            </div>

            {/* ✅ Action Buttons */}
            <div className="flex flex-row justify-end gap-2 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="w-1/2 sm:w-auto px-4 py-2 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 transition-all duration-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowModal(false);
                  handleBookNow();
                }}
                disabled={!address || address === "No address available"}
                className={`w-1/2 sm:w-auto px-5 py-2 rounded-md font-semibold transition-all duration-200 ${
                  !address || address === "No address available"
                    ? "bg-gray-400 text-white cursor-not-allowed"
                    : "bg-[#106187] text-white cursor-pointer"
                }`}
              >
                Book Now
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

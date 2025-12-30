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

interface MatchStats {
  matches: number;
  remainingDays: number;
  cycleEnd: string;
  cycleStart: string;
  daysPassed: number;
  cycleIndex: number;
  matchingBonus?: number;
}

export default function RewardsPage() {
  const { user, setUser } = useVLife();
  // console.log(user)
  const [rewards, setRewards] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<{ [key: string]: number }>({});
  const [scoreLeft, setScoreLeft] = useState(user?.rewardPoints || 0);
  const [matchesLeft, setMatchesLeft] = useState(0);

  const [showModal, setShowModal] = useState(false);
  const [address, setAddress] = useState<string>("");
  const [matchStats, setMatchStats] = useState<MatchStats>({
    matches: 0,
    remainingDays: 0,
    cycleEnd: "",
    cycleStart: "",
    daysPassed: 0,
    cycleIndex: 0,
    matchingBonus: 0,
  });

  // 🔐 Track which reward type is currently selected ("score" | "matching")
  const [selectedType, setSelectedType] = useState<"score" | "matching" | null>(
    null
  );

  // console.log(user.dailyReward)
  const router = useRouter();

  useEffect(() => {
    const fetch60Stats = async () => {
      try {
        const res = await axios.get(`/api/get-cycles?user_id=${user?.user_id}`);
        if (res.data.success) {
          setMatchStats(res.data.data);
        }
      } catch (error) {
        console.error("Match stats fetch error:", error);
      }
    };

    if (user?.user_id) fetch60Stats();
  }, [user?.user_id]);

  useEffect(() => {
    const fetchBookingUsedMatches = async () => {
      if (!user?.user_id || matchStats.cycleIndex === undefined) return;

      try {
        const res = await axios.get("/api/booking-operations", {
          params: { user_id: user?.user_id, type: "matching" },
        });

        if (res.data.success) {
          const bookings = res.data.data || [];

          // Count matches used in same cycle only
          const usedMatches = bookings.reduce((total: number, b: any) => {
            return b.cycleIndex === matchStats.cycleIndex
              ? total + (b.total_matches_used || 0)
              : total;
          }, 0);

          // Update UI to show actual remaining matches
          setMatchStats((prev) => ({
            ...prev,
            matches: (prev.matches || 0) - usedMatches,
          }));
        }
      } catch (err) {
        console.error("Match usage calculation failed:", err);
      }
    };

    fetchBookingUsedMatches();
  }, [user?.user_id, matchStats.cycleIndex]);

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

  useEffect(() => {
    let used = 0;

    Object.entries(selected).forEach(([id, qty]) => {
      const reward = rewards.find((r) => r.reward_id === id);
      if (reward && reward.type === "score") {
        used += reward.points_required * qty;
      }
    });

    setScoreLeft((user?.rewardPoints || 0) - used);
  }, [selected, rewards, user?.rewardPoints]);

  useEffect(() => {
    let usedMatches = 0;

    Object.entries(selected).forEach(([id, qty]) => {
      const reward = rewards.find((r) => r.reward_id === id);
      if (reward && reward.type === "matching") {
        usedMatches += reward.matches_required * qty;
      }
    });

    setMatchesLeft((matchStats.matches || 0) - usedMatches);
  }, [selected, rewards, matchStats.matches]);

  // 🎯 Selection handler with TYPE locking (Score vs Matching)
  const handleSelect = (reward: any) => {
    const isAlreadySelected = !!selected[reward.reward_id];

    // If already selected → unselect it
    if (isAlreadySelected) {
      const newSelected = { ...selected };
      delete newSelected[reward.reward_id];
      setSelected(newSelected);

      // If no rewards left, clear selectedType lock
      if (Object.keys(newSelected).length === 0) {
        setSelectedType(null);
      }
      return;
    }

    // If a type is already locked and user tries other type → error
    if (selectedType && selectedType !== reward.type) {
      ShowToast.error(
        "Please select only one reward type.\nChoose either Score rewards or Matching rewards."
      );
      return;
    }

    // First selection or adding same type
    setSelected({
      ...selected,
      [reward.reward_id]: 1,
    });

    if (!selectedType) {
      setSelectedType(reward.type); // lock to "score" or "matching"
    }
  };

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

  // (Kept for compatibility – no longer used because quantity is not typed)
  const handleQuantityChange = (id: string, value: number, max: number) => {
    setSelected((prev) => ({
      ...prev,
      [id]: Math.min(Math.max(value, 1), max),
    }));
  };

  const cycleEndFormatted = matchStats.cycleEnd
    ? new Date(matchStats.cycleEnd).toLocaleDateString("en-GB")
    : "";

  const handleBookNow = async () => {
    if (Object.keys(selected).length === 0) {
      ShowToast.error("Select at least one reward to book.");
      return;
    }

    if (!address || address === "No address available") {
      ShowToast.error("Please provide a valid address before booking.");
      return;
    }

    const firstSelectedId = Object.keys(selected)[0];
    const firstReward = rewards.find((r) => r.reward_id === firstSelectedId);
    const bookingType: "score" | "matching" =
      firstReward?.type === "matching" ? "matching" : "score";

    let total_score_used = 0;
    let total_matches_used = 0;

    const rewardsArray = Object.entries(selected)
      .map(([id, qty]) => {
        const reward = rewards.find((r) => r.reward_id === id);
        if (!reward) return null;

        const isMatchingReward = reward.type === "matching";

        const score_used = !isMatchingReward ? reward.points_required * qty : 0;

        const matches_used = isMatchingReward
          ? reward.matches_required * qty
          : 0;

        if (score_used > 0) total_score_used += score_used;
        if (matches_used > 0) total_matches_used += matches_used;

        return {
          reward_id: reward.reward_id,
          reward_name: reward.title,
          type: reward.type,
          points_required: reward.points_required,
          matches_required: reward.matches_required,
          count: qty,
          score_used,
          matches_used,
        };
      })
      .filter(Boolean) as any[];

    const remaining_score =
      bookingType === "score"
        ? (user?.dailyReward || 0) - total_score_used
        : user?.dailyReward || 0;

    const remaining_matches =
      bookingType === "matching"
        ? matchStats.matches - total_matches_used
        : matchStats.matches;

    const bookingPayload = {
      user_id: user?.user_id,
      user_name: user?.user_name,
      user_email: user?.mail || "",
      user_contact: user?.contact || "",
      user_role: user?.role,
      rank: user?.rank,
      address,
      description: "",
      rewards: rewardsArray,

      type: bookingType, // 🆕 ADD THIS LINE

      // Score values
      total_score_used,
      remaining_score,

      // Matching values
      total_matches_used,
      cycleIndex: matchStats.cycleIndex,
      remaining_matches,

      status: "pending",
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
    };

    try {
      setLoading(true);
      const res = await axios.post("/api/booking-operations", bookingPayload);

      if (res.data.success) {
        ShowToast.success("Booking created successfully!");

        if (bookingType === "score" && user) {
          setUser({ ...user, score: remaining_score });
        }

        setSelected({});
        setSelectedType(null);
        router.push("/wallet/rewards/Bookings");
        setLoading(false);
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

  // 📊 Summary footer (Points OR Matches based on selected type)
  const hasSelection = Object.keys(selected).length > 0;
  let summaryTotalLabel = "Total Points Used:";
  let summaryTotalValue = 0;
  let summaryTotalSuffix = "pts";

  if (hasSelection) {
    const firstSelectedId = Object.keys(selected)[0];
    const firstReward = rewards.find((r) => r.reward_id === firstSelectedId);
    const isMatchingSummary = firstReward?.type === "matching";

    if (isMatchingSummary) {
      summaryTotalLabel = "Total Matches Used:";
      summaryTotalSuffix = "matches";
      summaryTotalValue = Object.entries(selected).reduce((acc, [id, qty]) => {
        const reward = rewards.find((r) => r.reward_id === id);
        return acc + (reward?.matches_required || 0) * qty;
      }, 0);
    } else {
      summaryTotalLabel = "Total Points Used:";
      summaryTotalSuffix = "pts";
      summaryTotalValue = Object.entries(selected).reduce((acc, [id, qty]) => {
        const reward = rewards.find((r) => r.reward_id === id);
        return acc + (reward?.points_required || 0) * qty;
      }, 0);
    }
  }

  return (
    <Layout>
      <div className="p-2 px-6 space-y-1 flex flex-col h-[calc(100vh-4rem)]">
        {loading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <Loader />
          </div>
        )}

        <div className="flex flex-col md:flex-row justify-between md:items-center gap-1 w-full max-md:mb-2">
          <div className="flex flex-wrap items-center w-full gap-2">
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
                <span className="text-[#0c3978] font-bold">{scoreLeft}</span> )
              </p>
            )}
          </div>

          <div className="flex flex-row gap-3 w-full sm:w-auto">
            {user?.role === "admin" && (
              <Link href="/wallet/rewards/addreward" className="w-full sm:w-39">
                <SubmitButton className="w-full px-4 py-2 font-semibold rounded-md">
                  + Add Reward
                </SubmitButton>
              </Link>
            )}
            <Link href="/wallet/rewards/Bookings" className="w-full sm:w-39">
              <SubmitButton className="w-full px-4 py-2 font-semibold rounded-md bg-blue-500">
                {user?.role === "admin" ? "Bookings" : "My Bookings"}
              </SubmitButton>
            </Link>
          </div>
        </div>

        <div
          className="flex-1 max-lg:w-[103%] w-[101%] overflow-y-auto scroll-smooth
          [&::-webkit-scrollbar]:w-1.5
          [&::-webkit-scrollbar]:bg-transparent
          hover:[&::-webkit-scrollbar-thumb]:bg-gradient-to-b
          hover:[&::-webkit-scrollbar-thumb]:from-[#0c3978]
          hover:[&::-webkit-scrollbar-thumb]:to-[#16b8e4]
          hover:[&::-webkit-scrollbar-thumb]:rounded-full"
        >
          {rewards.length === 0 ? (
            <p className="text-gray-500 text-center py-10">
              No rewards available.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-4 pr-1 pb-25">
              {rewards.map((reward) => {
                const isActive = reward.status === "active";
                if (!isActive && user?.role !== "admin") return null;

                const isScoreReward = reward.type === "score";
                const isMatchingReward = reward.type === "matching";

                const quantity = selected[reward.reward_id] || 1;
                const isSelected = selected[reward.reward_id] !== undefined;
                const baseSelectedQty = selected[reward.reward_id] || 0;

                // 🎯 For score rewards, max based on user's score & cost
                const maxTickets =
                  isScoreReward && reward.points_required > 0
                    ? Math.floor(
                        scoreLeft / reward.points_required + baseSelectedQty
                      )
                    : 0;

                // 🎯 For matching rewards, max based on user's matches & requirement
                const maxMatchQty =
                  isMatchingReward && reward.matches_required > 0
                    ? Math.floor(matchStats.matches / reward.matches_required)
                    : 0;

                // 🧠 Matching reward eligibility checks
                const insufficientMatches =
                  isMatchingReward &&
                  matchStats.matches < reward.matches_required;

                const isCycleExpired =
                  isMatchingReward && matchStats.remainingDays <= 0;

                const handleIncreaseClick = () => {
                  if (!isActive) return;

                  if (isScoreReward) {
                    if (maxTickets > 0) {
                      handleIncreaseQuantity(reward.reward_id, maxTickets);
                    }
                  } else if (isMatchingReward) {
                    if (!isCycleExpired && maxMatchQty > 0) {
                      handleIncreaseQuantity(reward.reward_id, maxMatchQty);
                    }
                  }
                };

                const handleDecreaseClick = () => {
                  if (!isActive) return;
                  handleDecreaseQuantity(reward.reward_id);
                };

                return (
                  <div
                    key={reward.reward_id}
                    className="border border-gray-300 rounded-xl shadow-md bg-white hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col w-full max-w-sm mx-auto"
                  >
                    {/* Image */}
                    <div className="relative w-full h-42">
                      <Image
                        src={reward.image || "/default.jpg"}
                        alt={reward.title}
                        fill
                        className="object-cover rounded-xl border-3 border-white shadow"
                      />
                      {!isActive && user?.role === "admin" && (
                        <span className="absolute top-2 right-2 bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded">
                          Unavailable
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="px-4 py-2 flex flex-col gap-2 flex-grow">
                      <p className="text-lg font-bold text-black">
                        {reward.title}
                      </p>
                      <p className="text-gray-600 text-sm">
                        {reward.description}
                      </p>

                      {isMatchingReward ? (
                        <div className="mt-1 text-sm font-semibold text-black space-y-1">
                          <p>
                            Required :
                            <span className="text-green-700">
                              {" "}
                              {reward.matches_required} Matches{" "}
                            </span>
                            <span className="text-[11px] font-medium text-gray-700">
                              {" "}
                              (You have :{" "}
                              <span className="text-gray-900 font-bold text-sm">
                                {matchesLeft} / 60
                              </span>{" "}
                              Matches)
                            </span>
                          </p>
                          <p className="text-[11px] font-medium text-gray-700">
                            Remaining Days :{" "}
                            <span className="text-red-600 font-bold text-sm">
                              {matchStats.remainingDays}
                            </span>{" "}
                            days
                            {cycleEndFormatted && (
                              <span className="text-gray-600">
                                {" "}
                                (upto {cycleEndFormatted})
                              </span>
                            )}
                          </p>
                        </div>
                      ) : (
                        <p className="mt-1 font-semibold text-black text-sm">
                          Required:
                          <span className="text-green-700">
                            {" "}
                            {reward.points_required}
                          </span>{" "}
                          points
                        </p>
                      )}
                    </div>

                    {/* ⭐ Always at bottom */}
                    <div className="flex items-center justify-between px-4 pb-3 mt-1 gap-2">
                      {isSelected ? (
                        <div className="flex items-center rounded-full px-2 py-1 w-fit border border-gray-300">
                          <button
                            type="button"
                            onClick={handleDecreaseClick}
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
                            disabled
                          />

                          <button
                            type="button"
                            onClick={handleIncreaseClick}
                            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-200 cursor-pointer"
                            disabled={
                              !isActive ||
                              (isScoreReward &&
                                (maxTickets <= 0 || quantity >= maxTickets)) ||
                              (isMatchingReward &&
                                (isCycleExpired ||
                                  maxMatchQty <= 0 ||
                                  quantity >= maxMatchQty))
                            }
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
                              !isActive ||
                              insufficientMatches ||
                              isCycleExpired ||
                              (isScoreReward &&
                                scoreLeft < reward.points_required) ||
                              (!!selectedType && selectedType !== reward.type) // fixed
                            }
                            className={`px-3 py-1.5 font-semibold rounded-md transition-all duration-200
            ${
              !isActive ||
              insufficientMatches ||
              isCycleExpired ||
              (isScoreReward && scoreLeft < reward.points_required)
                ? "bg-gray-400 text-white cursor-not-allowed"
                : selectedType && selectedType !== reward.type
                ? "bg-gray-400 text-white cursor-not-allowed" // 🆕 Visual lock
                : "bg-[#106187] text-white cursor-pointer"
            }`}
                          >
                            Redeem
                          </button>
                        ) : (
                          <SubmitButton
                            className="!px-3 !py-1.5 font-semibold rounded-md transition-all duration-200 cursor-pointer"
                            onClick={() => handleSelect(reward)}
                            disabled={!isActive}
                          >
                            Remove
                          </SubmitButton>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {Object.keys(selected).length > 0 && (
          <>
            <div
              className="fixed bottom-8 right-8 z-50 bg-gradient-to-tr from-[#0C3978] via-[#106187] to-[#16B8E4] rounded-full p-3 flex items-center justify-center cursor-pointer hover:scale-106 transition-all duration-300 animate-pulseGlow"
              onClick={() => setShowModal(true)}
            >
              <LiaGiftsSolid size={36} className="text-white" />
            </div>
          </>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-md sm:max-w-lg md:max-w-md p-4 relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-red-700 text-xl cursor-pointer"
            >
              ✕
            </button>

            <h2 className="text-xl sm:text-2xl font-bold text-center text-gray-800 mb-4">
              Reward Summary
            </h2>

            <div className="max-h-[200px] overflow-y-auto border-t border-b py-2">
              {Object.entries(selected).map(([id, qty]) => {
                const reward = rewards.find((r) => r.reward_id === id);
                const isMatchingReward = reward?.type === "matching";
                const unitValue = isMatchingReward
                  ? reward?.matches_required
                  : reward?.points_required;
                const unitLabel = isMatchingReward ? "matches" : "pts";
                const totalValue = (unitValue || 0) * qty;

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
                        {qty} × {unitValue} {unitLabel}
                      </p>
                    </div>
                    <p className="font-bold text-blue-600 text-sm sm:text-base">
                      {totalValue} {unitLabel}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="mt-3">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Shipping Address
              </label>
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black-400 capitalize h-28"
                placeholder="Enter delivery address"
                required
              />
            </div>

            <div className="flex justify-between items-center mt-3 text-sm sm:text-base">
              <p className="font-semibold text-gray-700">{summaryTotalLabel}</p>
              <p className="font-bold text-green-700">
                {summaryTotalValue} {summaryTotalSuffix}
              </p>
            </div>

            <div className="flex flex-row justify-end gap-2 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="w-1/2 sm:w-auto px-4 py-2 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowModal(false);
                  handleBookNow();
                }}
                disabled={!address || address === "No address available"}
                className={`w-1/2 sm:w-auto px-5 py-2 rounded-md font-semibold
                ${
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

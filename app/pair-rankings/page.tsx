"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import Layout from "@/layout/Layout";
import { useVLife } from "@/store/context";
import Loader from "@/components/common/loader";
import { IoIosArrowBack } from "react-icons/io";
import { FaTrophy, FaCheck } from "react-icons/fa";
import { GiTargetShot } from "react-icons/gi";
import { useRouter } from "next/navigation";
import ShowToast from "@/components/common/Toast/toast";

interface Tier {
  name: string;
  required_pairs: number;
  required_direct_pv: number;
  reward: string;
  current_pairs: number;
  pairs_balance: number;
  pairs_percent: number;
  left_active: number;
  right_active: number;
  left_direct_pv: number;
  right_direct_pv: number;
  left_pv_balance: number;
  right_pv_balance: number;
  left_pv_percent: number;
  right_pv_percent: number;
  achieved: boolean;
  reward_released: boolean;
  achieved_date?: string | null;
  released_at?: string | null;
}

interface PairStarData {
  user_id: string;
  user_name: string;
  current_pairs: number;
  current_pair_star: string | null;
  left_active: number;
  right_active: number;
  left_direct_pv: number;
  right_direct_pv: number;
  start_date: string | null;

  pair_star_start_date: string | null;
  activated_date: string | null;
  tiers: Tier[];
}

// Format DD-MM-YYYY → YYYY-MM-DD for <input type="date">
function toInputDate(ddmmyyyy: string | null): string {
  if (!ddmmyyyy) return "";
  const parts = ddmmyyyy.split("-");
  if (parts.length !== 3) return "";
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

// Format YYYY-MM-DD → DD-MM-YYYY for API
function toApiDate(yyyymmdd: string): string {
  if (!yyyymmdd) return "";
  const parts = yyyymmdd.split("-");
  if (parts.length !== 3) return "";
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

// Abbreviate large numbers
function fmtNum(n: number): string {
  if (n >= 10_00_000) return `${(n / 10_00_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const TIER_NAME_TO_BADGE: Record<string, string> = {
  STAR: "bronze",
  "BRONZE STAR": "bronze",
  "SILVER STAR": "silver",
  "GOLD STAR": "gold",
  "PLATINUM STAR": "platinum",
  "RUBY EXECUTIVE": "ruby",
  "PEARL EXECUTIVE": "pearl",
  "SAPHIRE EXECUTIVE": "saphire",
  "EMERALD EXECUTIVE": "emerald",
  DIAMOND: "diamond",
  "BLUE DIAMOND": "bluediamond",
  "BLACK DIAMOND": "blackdiamond",
  "CROWN DIAMOND": "crowndiamond",
  AMBASSADOR: "ambassador",
  "CROWN AMBASSADOR": "crownambassador",
  "MAVERICK AMBASSADOR": "maverickambassador",
};
const TIER_COLORS: Record<string, { bg: string; badge: string; text: string }> =
  {
    "BRONZE STAR": {
      bg: "from-purple-500 to-purple-700",
      badge: "bg-purple-600",
      text: "text-purple-700",
    },
    "SILVER STAR": {
      bg: "from-slate-400 to-slate-600",
      badge: "bg-slate-500",
      text: "text-slate-600",
    },
    "GOLD STAR": {
      bg: "from-yellow-400 to-yellow-600",
      badge: "bg-yellow-500",
      text: "text-yellow-600",
    },
    "PLATINUM STAR": {
      bg: "from-cyan-400 to-cyan-700",
      badge: "bg-cyan-600",
      text: "text-cyan-700",
    },
    "RUBY EXECUTIVE": {
      bg: "from-red-400 to-red-700",
      badge: "bg-red-600",
      text: "text-red-700",
    },
    "PEARL EXECUTIVE": {
      bg: "from-pink-300 to-pink-600",
      badge: "bg-pink-500",
      text: "text-pink-600",
    },
    "SAPHIRE EXECUTIVE": {
      bg: "from-blue-400 to-blue-700",
      badge: "bg-blue-600",
      text: "text-blue-700",
    },
    "EMERALD EXECUTIVE": {
      bg: "from-emerald-400 to-emerald-700",
      badge: "bg-emerald-600",
      text: "text-emerald-700",
    },
    DIAMOND: {
      bg: "from-sky-300 to-sky-600",
      badge: "bg-sky-500",
      text: "text-sky-600",
    },
    "BLUE DIAMOND": {
      bg: "from-blue-500 to-blue-800",
      badge: "bg-blue-700",
      text: "text-blue-800",
    },
    "BLACK DIAMOND": {
      bg: "from-gray-600 to-gray-900",
      badge: "bg-gray-800",
      text: "text-gray-800",
    },
    "CROWN DIAMOND": {
      bg: "from-violet-500 to-violet-800",
      badge: "bg-violet-700",
      text: "text-violet-800",
    },
    AMBASSADOR: {
      bg: "from-orange-400 to-orange-700",
      badge: "bg-orange-600",
      text: "text-orange-700",
    },
    "CROWN AMBASSADOR": {
      bg: "from-rose-500 to-rose-800",
      badge: "bg-rose-700",
      text: "text-rose-800",
    },
    "MAVERICK AMBASSADOR": {
      bg: "from-indigo-500 to-indigo-900",
      badge: "bg-indigo-700",
      text: "text-indigo-900",
    },
  };

function getColor(name: string) {
  return (
    TIER_COLORS[name] ?? {
      bg: "from-purple-500 to-purple-700",
      badge: "bg-purple-600",
      text: "text-purple-700",
    }
  );
}

export default function PairRankingsPage() {
  const { user } = useVLife();
  const router = useRouter();

  const [data, setData] = useState<PairStarData | null>(null);
  const [loading, setLoading] = useState(true);

  // Start date editing state
  //   const [editingDate, setEditingDate] = useState(false);
  //   const [dateInput, setDateInput] = useState("");
  //   const [savingDate, setSavingDate] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user?.user_id) return;
    setLoading(true);
    try {
      const res = await axios.get(`/api/pair-star?user_id=${user.user_id}`);
      if (res.data.success) {
        setData(res.data.data);
        // setDateInput(toInputDate(res.data.data.pair_star_start_date));
      }
    } catch (err) {
      ShowToast.error("Failed to load rankings.");
    } finally {
      setLoading(false);
    }
  }, [user?.user_id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  //   const handleSaveDate = async () => {
  //     if (!user?.user_id) return;
  //     setSavingDate(true);
  //     try {
  //       const apiDate = dateInput ? toApiDate(dateInput) : null;
  //       const res = await axios.patch("/api/pair-star", {
  //         user_id: user.user_id,
  //         pair_star_start_date: apiDate,
  //       });
  //       if (res.data.success) {
  //         ShowToast.success("Start date updated.");
  //         setEditingDate(false);
  //         fetchData(); // re-fetch with new date filter applied
  //       } else {
  //         ShowToast.error(res.data.message || "Failed to update.");
  //       }
  //     } catch (err: any) {
  //       ShowToast.error(err?.response?.data?.message || "Failed to update.");
  //     } finally {
  //       setSavingDate(false);
  //     }
  //   };

  //   const handleCancelDate = () => {
  //     setDateInput(toInputDate(data?.pair_star_start_date ?? null));
  //     setEditingDate(false);
  //   };

  // Find index of current achieved tier

  const currentTierIdx =
    data?.tiers.findIndex((t) => t.name === data?.current_pair_star) ?? -1;

  return (
    <Layout>
      <div className="p-3 md:px-4 flex flex-col min-h-[calc(100vh-4rem)]">
        {loading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <Loader />
          </div>
        )}

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <IoIosArrowBack
              size={24}
              className="cursor-pointer text-gray-700 hover:text-black"
              onClick={() => router.push("/administration/users")}
            />
            <FaTrophy size={22} className="text-yellow-500" />
            <h1 className="text-lg md:text-xl font-bold text-gray-900">
              Rewards &amp; Rankings
            </h1>
          </div>

          {/* current_pairs — read only for user, set by admin globally */}
          {data?.current_pairs && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>Total Points:</span>
              <span className="font-semibold text-gray-700">
                {data.current_pairs}
              </span>
            </div>
          )}
        </div>

        {/* ── Summary bar ── */}
        {data && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {[
              {
                label: "Left Active",
                value: data.left_active,
                color: "text-green-700",
              },
              {
                label: "Right Active",
                value: data.right_active,
                color: "text-orange-600",
              },
              {
                label: "Current Rank",
                value:
                  data.current_pair_star ??
                  (() => {
                    // No pair_star — check PV both sides
                    const hasPV =
                      data.left_direct_pv >= 100 && data.right_direct_pv >= 100;
                    return hasPV ? "Star" : "Associate";
                  })(),
                color: "text-purple-700",
                small: true,
              },
              {
                label: "Next Star",
                value: (() => {
                  const currentIdx = data.tiers.findIndex(
                    (t) => t.name === data.current_pair_star,
                  );
                  const next = data.tiers[currentIdx + 1];
                  return next ? next.name : "—";
                })(),
                color: "text-blue-700",
                small: true,
              },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex flex-col gap-0.5 shadow-sm"
              >
                <span className="text-xs text-gray-500 font-medium">
                  {s.label}
                </span>
                <span
                  className={`font-bold ${s.small ? "text-sm" : "text-xl"} ${s.color}`}
                >
                  {typeof s.value === "number"
                    ? s.value.toLocaleString()
                    : s.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ── Column headers — desktop only ── */}
        {data && (
          <div className="hidden sm:grid grid-cols-[1.8fr_1.2fr_2fr_1.6fr_1fr_0.8fr] gap-4 px-4 pb-2 border-b border-gray-200 mb-2">
            {[
              "Rank",
              "Required Points",
              "Your Progress",
              "Status",
              "Incentive",
              "Achieved",
            ].map((h) => (
              <span
                key={h}
                className="text-xs font-semibold text-gray-500 uppercase tracking-wide"
              >
                {h}
              </span>
            ))}
          </div>
        )}

        {/* ── Tier list ── */}
        <div className="flex flex-col gap-3 pb-10">
          {data?.tiers.map((tier, idx) => {
            const color = getColor(tier.name);
            const isCurrentStar = tier.name === data.current_pair_star;
            const isAchieved = tier.achieved;
            const isNext = !isAchieved && idx === currentTierIdx + 1;

            return (
              <div
                key={tier.name}
                className={`
                  relative bg-white rounded-xl border transition-all
                  ${isCurrentStar ? "border-purple-400 shadow-md shadow-purple-100" : "border-gray-200 shadow-sm"}
                  ${isAchieved ? "opacity-100" : idx > currentTierIdx + 1 ? "opacity-70" : "opacity-100"}
                `}
              >
                {/* Achieved ribbon */}
                {isAchieved && (
                  <div className="absolute top-2 right-2 sm:hidden flex items-center gap-1 bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    <FaCheck size={8} /> Achieved
                  </div>
                )}

                <div className="p-4 grid grid-cols-1 sm:grid-cols-[1.8fr_1.2fr_2fr_1.6fr_1fr_0.8fr] gap-3 sm:gap-4 items-center">
                  {/* ── Col 1: Rank badge + name ── */}
                  <div className="flex items-center gap-3">
                    <img
                      src={`/badges/newbadges/${TIER_NAME_TO_BADGE[tier.name] ?? "associate"}.png`}
                      alt={tier.name}
                      className="w-18 h-18 object-contain drop-shadow-md shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                    <div>
                      <p className="font-bold text-gray-900 text-sm sm:text-base leading-tight">
                        {tier.name}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {isAchieved
                          ? tier.released_at
                            ? `Released: ${tier.released_at}`
                            : "✓ Reward Released"
                          : isNext
                            ? "Up Next"
                            : "Locked"}
                      </p>
                    </div>
                  </div>

                  {/* ── Col 2: Required pairs ── */}
                  <div className="flex flex-row sm:flex-col gap-1 sm:gap-0">
                    <span className="sm:hidden text-xs text-gray-500 font-medium w-24">
                      Required:
                    </span>
                    <div>
                      <p className="text-sm font-bold text-gray-800">
                        {tier.required_pairs.toLocaleString()} points
                      </p>
                      <p className="text-[11px] text-gray-500">
                        PV/side: {tier.required_direct_pv}
                      </p>
                    </div>
                  </div>

                  {/* ── Col 3: Progress bars ── */}
                  <div>
                    <span className="sm:hidden text-xs text-gray-500 font-medium block mb-1">
                      Your Progress:
                    </span>
                    <div className="space-y-2">
                      {/* Left — active users vs required pairs */}
                      <div>
                        {/* Left */}
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="text-xs font-semibold text-green-600">
                            Left
                          </span>
                          <span className="text-xs text-gray-600">
                            {Math.min(tier.left_active, tier.required_pairs)} /{" "}
                            {tier.required_pairs}
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min(100, Math.round((tier.left_active / tier.required_pairs) * 100))}%`,
                            }}
                          />
                        </div>
                      </div>
                      {/* Right — active users vs required pairs */}
                      <div>
                        {/* Right */}
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="text-xs font-semibold text-orange-500">
                            Right
                          </span>
                          <span className="text-xs text-gray-600">
                            {Math.min(tier.right_active, tier.required_pairs)} /{" "}
                            {tier.required_pairs}
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min(100, Math.round((tier.right_active / tier.required_pairs) * 100))}%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Pairs bar */}
                      <div>
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="text-xs font-semibold text-purple-600">
                            Points
                          </span>
                          <span className="text-xs text-gray-600">
                            {tier.pairs_percent}%
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${isAchieved ? "bg-green-500" : "bg-purple-500"}`}
                            style={{ width: `${tier.pairs_percent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Col 4: Status ── */}
                  <div className={isAchieved ? "hidden sm:block" : ""}>
                    <span className="sm:hidden text-xs text-gray-500 font-medium block mb-1">
                      Status:
                    </span>
                    {isAchieved ? (
                      <div className="space-y-1">
                        <div className="inline-flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                          <FaCheck size={10} /> Achieved
                        </div>
                        {tier.achieved_date && (
                          <p className="text-[11px] text-gray-500">
                            <span className="font-medium text-green-600">
                              Achieved:
                            </span>{" "}
                            {tier.achieved_date}
                          </p>
                        )}
                        {tier.released_at && (
                          <p className="text-[11px] text-gray-500">
                            <span className="font-medium text-blue-600">
                              Received:
                            </span>{" "}
                            {tier.released_at}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-2">
                          <GiTargetShot size={12} /> In Progress
                        </div>
                        <p className="text-[11px] text-gray-500 leading-snug">
                          <span className="text-green-600 font-medium">
                            Left:
                          </span>{" "}
                          {tier.left_pv_balance > 0
                            ? `${tier.left_pv_balance} PV pending`
                            : `${tier.left_direct_pv} / ${tier.required_direct_pv} PV ✓`}
                        </p>
                        <p className="text-[11px] text-gray-500 leading-snug">
                          <span className="text-orange-500 font-medium">
                            Right:
                          </span>{" "}
                          {tier.right_pv_balance > 0
                            ? `${tier.right_pv_balance} PV pending`
                            : `${tier.right_direct_pv} / ${tier.required_direct_pv} PV ✓`}
                        </p>
                        <p className="text-[11px] text-gray-500 leading-snug">
                          <span className="text-purple-600 font-medium">
                            Points:
                          </span>{" "}
                          {tier.pairs_balance > 0
                            ? `${tier.pairs_balance.toLocaleString()} more needed`
                            : "✓"}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* ── Col 5: Incentive ── */}
                  <div>
                    <span className="sm:hidden text-xs text-gray-500 font-medium block mb-1">
                      Incentive:
                    </span>
                    <p className={`text-base font-bold ${color.text}`}>
                      {tier.reward}
                    </p>
                  </div>

                  {/* ── Col 6: Achieved badge (desktop) ── */}
                  <div className="hidden sm:flex justify-center">
                    {isAchieved ? (
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-600">
                        <FaCheck size={14} />
                      </span>
                    ) : (
                      <span className="text-gray-300 text-lg font-bold">—</span>
                    )}
                  </div>
                </div>

                {/* Bottom label */}
                <div className="px-4 pb-3">
                  <span
                    className={`text-xs font-medium ${
                      isAchieved ? "text-green-600" : "text-gray-400"
                    }`}
                  >
                    {isAchieved ? "✓ Achieved" : "Not Achieved"}
                  </span>
                </div>
              </div>
            );
          })}

          {!data && !loading && (
            <p className="text-center text-gray-500 py-10">
              No data available.
            </p>
          )}
        </div>
      </div>
    </Layout>
  );
}

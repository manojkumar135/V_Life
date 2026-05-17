"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import Layout from "@/layout/Layout";
import Loader from "@/components/common/loader";
import { IoIosArrowBack } from "react-icons/io";
import {
  FaTrophy,
  FaEdit,
  FaCheck,
  FaTimes,
  FaSearch,
  FaCalendarAlt,
} from "react-icons/fa";
import { GiTargetShot } from "react-icons/gi";
import { useRouter } from "next/navigation";
import ShowToast from "@/components/common/Toast/toast";
import { useVLife } from "@/store/context";

interface TierConfig {
  tier_name: string;
  pairs: number;
  direct_pv: number;
  reward: string;
  updated_by: string | null;
  updated_at: string | null;
}

interface TierProgress {
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
  released_at: string | null;
}

interface UserProgress {
  user_id: string;
  user_name: string;
  current_pairs: number;
  current_pair_star: string | null;
  left_active: number;
  right_active: number;
  tiers: TierProgress[];
}

const TIER_COLORS: Record<string, string> = {
  STAR: "text-purple-700",
  "SILVER STAR": "text-slate-600",
  "GOLD STAR": "text-yellow-600",
  "PLATINUM STAR": "text-cyan-700",
  "RUBY EXECUTIVE": "text-red-700",
  "PEARL EXECUTIVE": "text-pink-600",
  "SAPHIRE EXECUTIVE": "text-blue-700",
  "EMERALD EXECUTIVE": "text-emerald-700",
  DIAMOND: "text-sky-600",
  "BLUE DIAMOND": "text-blue-800",
  "BLACK DIAMOND": "text-gray-800",
  "CROWN DIAMOND": "text-violet-800",
  AMBASSADOR: "text-orange-700",
  "CROWN AMBASSADOR": "text-rose-700",
  "MAVERICK AMBASSADOR": "text-indigo-900",
};

// Convert DD-MM-YYYY ↔ YYYY-MM-DD for input[type=date]
function toInputDate(ddmmyyyy: string | null): string {
  if (!ddmmyyyy) return "";
  const p = ddmmyyyy.split("-");
  if (p.length !== 3) return "";
  return `${p[2]}-${p[1]}-${p[0]}`;
}
function toApiDate(yyyymmdd: string): string {
  if (!yyyymmdd) return "";
  const p = yyyymmdd.split("-");
  if (p.length !== 3) return "";
  return `${p[2]}-${p[1]}-${p[0]}`;
}

export default function AdminPairConfigPage() {
  const router = useRouter();
  const { user } = useVLife();

  // Role guard
  useEffect(() => {
    if (!user?.user_id) return;
    if (user.role !== "admin" && user.role !== "superadmin") {
      router.push("/pair-rankings");
    }
  }, [user?.user_id, user?.role]);

  // Config state
  const [tiers, setTiers] = useState<TierConfig[]>([]);
  const [editing, setEditing] = useState<Record<string, TierConfig>>({});
  const [editRow, setEditRow] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingCfg, setLoadingCfg] = useState(true);

  // Global start date state
  const [startDate, setStartDate] = useState<string | null>(null); // DD-MM-YYYY from DB
  const [startDateInput, setStartDateInput] = useState(""); // YYYY-MM-DD for input
  const [editingDate, setEditingDate] = useState(false);
  const [savingDate, setSavingDate] = useState(false);

  // User search state
  const [searchId, setSearchId] = useState("");
  const [searching, setSearching] = useState(false);
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);

  // Tabs
  const [tab, setTab] = useState<"config" | "search">("config");

  // ── Load config ────────────────────────────────────────────────────────────
  const loadConfig = useCallback(async () => {
    setLoadingCfg(true);
    try {
      const res = await axios.get("/api/pair-star-config");
      if (res.data.success) {
        setTiers(res.data.data.tiers);
        const sd = res.data.data.start_date ?? null;
        setStartDate(sd);
        setStartDateInput(toInputDate(sd));
      }
    } catch {
      ShowToast.error("Failed to load config.");
    } finally {
      setLoadingCfg(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // ── Tier edit handlers ─────────────────────────────────────────────────────
  const startEdit = (cfg: TierConfig) => {
    setEditRow(cfg.tier_name);
    setEditing((prev) => ({ ...prev, [cfg.tier_name]: { ...cfg } }));
  };

  const cancelEdit = (tier_name: string) => {
    setEditRow(null);
    setEditing((prev) => {
      const n = { ...prev };
      delete n[tier_name];
      return n;
    });
  };

  const handleChange = (
    tier_name: string,
    field: keyof TierConfig,
    value: string | number,
  ) => {
    setEditing((prev) => ({
      ...prev,
      [tier_name]: { ...prev[tier_name], [field]: value },
    }));
  };

  const saveRow = async (tier_name: string) => {
    const row = editing[tier_name];
    if (!row) return;
    setSaving(true);
    try {
      const res = await axios.put("/api/pair-star-config", {
        tier_name: row.tier_name,
        pairs: Number(row.pairs),
        direct_pv: Number(row.direct_pv),
        reward: row.reward,
      });
      if (res.data.success) {
        ShowToast.success(`${tier_name} updated.`);
        cancelEdit(tier_name);
        loadConfig();
      } else {
        ShowToast.error(res.data.message || "Failed.");
      }
    } catch (err: any) {
      ShowToast.error(err?.response?.data?.message || "Failed.");
    } finally {
      setSaving(false);
    }
  };

  // ── Global start date handlers ─────────────────────────────────────────────
  const saveStartDate = async () => {
    setSavingDate(true);
    try {
      const apiDate = startDateInput ? toApiDate(startDateInput) : null;
      const res = await axios.put("/api/pair-star-config", {
        tier_name: "__global__",
        start_date: apiDate,
      });
      if (res.data.success) {
        ShowToast.success("Start date updated.");
        setEditingDate(false);
        setStartDate(apiDate);
      } else {
        ShowToast.error(res.data.message || "Failed.");
      }
    } catch (err: any) {
      ShowToast.error(err?.response?.data?.message || "Failed.");
    } finally {
      setSavingDate(false);
    }
  };

  // ── User search ────────────────────────────────────────────────────────────
  const searchUser = async () => {
    if (!searchId.trim()) return;
    setSearching(true);
    setUserProgress(null);
    try {
      const res = await axios.get(
        `/api/pair-star?search_user=${searchId.trim()}`,
      );
      if (res.data.success) {
        setUserProgress(res.data.data);
      } else {
        ShowToast.error(res.data.message || "User not found.");
      }
    } catch {
      ShowToast.error("User not found.");
    } finally {
      setSearching(false);
    }
  };

  return (
    <Layout>
      <div className="p-3 md:px-4 flex flex-col min-h-[calc(100vh-4rem)]">
        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <IoIosArrowBack
              size={22}
              className="cursor-pointer text-gray-600 hover:text-black"
              onClick={() => router.back()}
            />
            <FaTrophy size={20} className="text-yellow-500" />
            <h1 className="text-lg md:text-xl font-bold text-gray-900">
              Pair Star — Admin Config
            </h1>
          </div>
        </div>

        {/* ── Global Start Date Banner ── */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-5 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 flex-1">
            <FaCalendarAlt size={14} className="text-blue-500 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-blue-700">
                Global Start Date
              </p>
              <p className="text-xs text-blue-500 mt-0.5">
                Only activations on or after this date count toward pairs for
                ALL users and ALL tiers.
                {!startDate && " Not set — counting all activations."}
              </p>
            </div>
          </div>

          {editingDate ? (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDateInput}
                max={new Date().toISOString().split("T")[0]}
                onChange={(e) => setStartDateInput(e.target.value)}
                className="border border-blue-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button
                onClick={saveStartDate}
                disabled={savingDate}
                className="p-1.5 bg-green-500 hover:bg-green-600 text-white rounded cursor-pointer disabled:opacity-50"
              >
                <FaCheck size={12} />
              </button>
              <button
                onClick={() => {
                  setEditingDate(false);
                  setStartDateInput(toInputDate(startDate));
                }}
                className="p-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded cursor-pointer"
              >
                <FaTimes size={12} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-blue-800">
                {startDate ?? "Not set"}
              </span>
              <button
                onClick={() => setEditingDate(true)}
                className="p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded cursor-pointer"
              >
                <FaEdit size={12} />
              </button>
              {startDate && (
                <button
                  onClick={() => {
                    setStartDateInput("");
                    saveStartDate();
                  }}
                  className="text-xs text-red-500 hover:text-red-700 cursor-pointer"
                  title="Clear start date"
                >
                  Clear
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Tabs + inline search ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-5 border-b border-gray-200">
          <div className="flex gap-2">
            {(["config", "search"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`pb-2 px-3 text-sm font-semibold capitalize border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  tab === t
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {t === "config" ? "Tier Config" : "Search User"}
              </button>
            ))}
          </div>

          {tab === "search" && (
            <div className="flex gap-2 pb-2 w-full sm:w-auto sm:max-w-sm">
              <div className="relative flex-1">
                <FaSearch
                  size={13}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Enter User ID..."
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchUser()}
                  className="w-full pl-9 pr-4 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <button
                onClick={searchUser}
                disabled={searching || !searchId.trim()}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 cursor-pointer whitespace-nowrap"
              >
                {searching ? "..." : "Search"}
              </button>
            </div>
          )}
        </div>

        {/* ── TAB: Tier Config ── */}
        {tab === "config" && (
          <>
            {loadingCfg ? (
              <div className="flex justify-center py-10">
                <Loader />
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        {[
                          "Tier Name",
                          "Required Pairs",
                          "Direct PV / Side",
                          "Reward",
                          "Updated",
                          "Actions",
                        ].map((h) => (
                          <th
                            key={h}
                            className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {tiers.map((cfg) => {
                        const isEditing = editRow === cfg.tier_name;
                        const row = isEditing ? editing[cfg.tier_name] : cfg;
                        return (
                          <tr
                            key={cfg.tier_name}
                            className={
                              isEditing ? "bg-blue-50" : "hover:bg-gray-50"
                            }
                          >
                            <td className="px-4 py-3">
                              <span
                                className={`font-bold text-sm ${TIER_COLORS[cfg.tier_name] ?? "text-gray-800"}`}
                              >
                                {cfg.tier_name}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {isEditing ? (
                                <input
                                  type="number"
                                  value={row?.pairs}
                                  onChange={(e) =>
                                    handleChange(
                                      cfg.tier_name,
                                      "pairs",
                                      e.target.value,
                                    )
                                  }
                                  className="w-24 border border-blue-300 rounded px-2 py-1 text-sm"
                                />
                              ) : (
                                <span className="font-semibold text-gray-800">
                                  {cfg.pairs.toLocaleString()}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {isEditing ? (
                                <input
                                  type="number"
                                  value={row?.direct_pv}
                                  onChange={(e) =>
                                    handleChange(
                                      cfg.tier_name,
                                      "direct_pv",
                                      e.target.value,
                                    )
                                  }
                                  className="w-20 border border-blue-300 rounded px-2 py-1 text-sm"
                                />
                              ) : (
                                <span className="text-gray-700">
                                  {cfg.direct_pv}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={row?.reward}
                                  onChange={(e) =>
                                    handleChange(
                                      cfg.tier_name,
                                      "reward",
                                      e.target.value,
                                    )
                                  }
                                  className="w-48 border border-blue-300 rounded px-2 py-1 text-sm"
                                />
                              ) : (
                                <span className="text-gray-600 text-xs">
                                  {cfg.reward}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-400">
                              {cfg.updated_at
                                ? new Date(cfg.updated_at).toLocaleDateString(
                                    "en-GB",
                                  )
                                : "—"}
                            </td>
                            <td className="px-4 py-3">
                              {isEditing ? (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => saveRow(cfg.tier_name)}
                                    disabled={saving}
                                    className="p-1.5 bg-green-500 hover:bg-green-600 text-white rounded cursor-pointer disabled:opacity-50"
                                  >
                                    <FaCheck size={12} />
                                  </button>
                                  <button
                                    onClick={() => cancelEdit(cfg.tier_name)}
                                    className="p-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded cursor-pointer"
                                  >
                                    <FaTimes size={12} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => startEdit(cfg)}
                                  className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded cursor-pointer"
                                >
                                  <FaEdit size={12} />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden flex flex-col gap-3">
                  {tiers.map((cfg) => {
                    const isEditing = editRow === cfg.tier_name;
                    const row = isEditing ? editing[cfg.tier_name] : cfg;
                    return (
                      <div
                        key={cfg.tier_name}
                        className={`rounded-xl border p-4 ${isEditing ? "border-blue-300 bg-blue-50" : "border-gray-200 bg-white"} shadow-sm`}
                      >
                        <div className="flex justify-between items-center mb-3">
                          <span
                            className={`font-bold ${TIER_COLORS[cfg.tier_name] ?? "text-gray-800"}`}
                          >
                            {cfg.tier_name}
                          </span>
                          {isEditing ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => saveRow(cfg.tier_name)}
                                disabled={saving}
                                className="p-1.5 bg-green-500 text-white rounded cursor-pointer"
                              >
                                <FaCheck size={11} />
                              </button>
                              <button
                                onClick={() => cancelEdit(cfg.tier_name)}
                                className="p-1.5 bg-gray-200 rounded cursor-pointer"
                              >
                                <FaTimes size={11} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEdit(cfg)}
                              className="p-1.5 bg-gray-100 rounded cursor-pointer"
                            >
                              <FaEdit size={11} />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-xs text-gray-400">
                              Required Pairs
                            </p>
                            {isEditing ? (
                              <input
                                type="number"
                                value={row?.pairs}
                                onChange={(e) =>
                                  handleChange(
                                    cfg.tier_name,
                                    "pairs",
                                    e.target.value,
                                  )
                                }
                                className="w-full border border-blue-300 rounded px-2 py-1 text-sm mt-0.5"
                              />
                            ) : (
                              <p className="font-semibold">
                                {cfg.pairs.toLocaleString()}
                              </p>
                            )}
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">
                              Direct PV / Side
                            </p>
                            {isEditing ? (
                              <input
                                type="number"
                                value={row?.direct_pv}
                                onChange={(e) =>
                                  handleChange(
                                    cfg.tier_name,
                                    "direct_pv",
                                    e.target.value,
                                  )
                                }
                                className="w-full border border-blue-300 rounded px-2 py-1 text-sm mt-0.5"
                              />
                            ) : (
                              <p className="font-semibold">{cfg.direct_pv}</p>
                            )}
                          </div>
                          <div className="col-span-2">
                            <p className="text-xs text-gray-400">Reward</p>
                            {isEditing ? (
                              <input
                                type="text"
                                value={row?.reward}
                                onChange={(e) =>
                                  handleChange(
                                    cfg.tier_name,
                                    "reward",
                                    e.target.value,
                                  )
                                }
                                className="w-full border border-blue-300 rounded px-2 py-1 text-sm mt-0.5"
                              />
                            ) : (
                              <p className="text-gray-600 text-xs">
                                {cfg.reward}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}

        {/* ── TAB: Search User ── */}
        {tab === "search" && (
          <div className="flex flex-col gap-4">
            {userProgress && (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    {
                      label: "User",
                      value: `${userProgress.user_name} (${userProgress.user_id})`,
                      small: true,
                    },
                    { label: "Total Pairs", value: userProgress.current_pairs },
                    { label: "Left Active", value: userProgress.left_active },
                    { label: "Right Active", value: userProgress.right_active },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm"
                    >
                      <p className="text-xs text-gray-500">{s.label}</p>
                      <p
                        className={`font-bold ${s.small ? "text-sm" : "text-xl"} text-gray-900`}
                      >
                        {typeof s.value === "number"
                          ? s.value.toLocaleString()
                          : s.value}
                      </p>
                    </div>
                  ))}
                </div>

                {userProgress.tiers.map((tier) => {
                  const isAchieved = tier.achieved;
                  const isReleased = tier.reward_released;
                  return (
                    <div
                      key={tier.name}
                      className={`bg-white rounded-xl border shadow-sm p-4 ${
                        isAchieved ? "border-green-500" : "border-gray-200"
                      }`}
                    >
                      {/* Top row: tier name + status badge */}
                      <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <div
                            className={`p-1.5 rounded-lg ${isAchieved ? "bg-green-100" : "bg-gray-100"}`}
                          >
                            <FaTrophy
                              size={14}
                              className={
                                isAchieved ? "text-green-500" : "text-gray-400"
                              }
                            />
                          </div>
                          <span
                            className={`font-bold text-sm ${TIER_COLORS[tier.name] ?? "text-gray-800"}`}
                          >
                            {tier.name}
                          </span>
                          {isReleased && (
                            <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                              Reward Released
                              {tier.released_at ? ` · ${tier.released_at}` : ""}
                            </span>
                          )}
                        </div>
                        <div>
                          {isAchieved ? (
                            <span className="inline-flex items-center gap-1 bg-green-50 border border-green-200 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                              <FaCheck size={9} /> Achieved
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                              <GiTargetShot size={11} /> In Progress
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Meta info */}
                      <p className="text-xs text-gray-500 mb-3">
                        {tier.required_pairs.toLocaleString()} pairs ·{" "}
                        {tier.required_direct_pv} PV/side · {tier.reward}
                      </p>

                      {/* Progress bars — responsive 3-column grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-3">
                        {/* Left */}
                        <div>
                          <div className="flex justify-between text-[10px] mb-1">
                            <span className="font-semibold text-green-600">
                              Left
                            </span>
                            <span className="text-gray-500">
                              {Math.min(tier.left_active, tier.required_pairs)}/
                              {tier.required_pairs} · PV {tier.left_direct_pv}/
                              {tier.required_direct_pv}
                              {tier.left_pv_balance > 0
                                ? ` (${tier.left_pv_balance} pending)`
                                : " ✓"}
                            </span>
                          </div>
                          <div className="h-1.5 bg-green-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 rounded-full"
                              style={{
                                width: `${Math.min(100, Math.round((tier.left_active / tier.required_pairs) * 100))}%`,
                              }}
                            />
                          </div>
                        </div>

                        {/* Right */}
                        <div>
                          <div className="flex justify-between text-[10px] mb-1">
                            <span className="font-semibold text-orange-500">
                              Right
                            </span>
                            <span className="text-gray-500">
                              {Math.min(tier.right_active, tier.required_pairs)}
                              /{tier.required_pairs} · PV {tier.right_direct_pv}
                              /{tier.required_direct_pv}
                              {tier.right_pv_balance > 0
                                ? ` (${tier.right_pv_balance} pending)`
                                : " ✓"}
                            </span>
                          </div>
                          <div className="h-1.5 bg-orange-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-orange-400 rounded-full"
                              style={{
                                width: `${Math.min(100, Math.round((tier.right_active / tier.required_pairs) * 100))}%`,
                              }}
                            />
                          </div>
                        </div>

                        {/* Pairs */}
                        <div>
                          <div className="flex justify-between text-[10px] mb-1">
                            <span className="font-semibold text-purple-600">
                              Pairs
                            </span>
                            <span className="text-gray-500">
                              {Math.min(
                                tier.current_pairs,
                                tier.required_pairs,
                              )}
                              /{tier.required_pairs}
                              {tier.pairs_balance > 0
                                ? ` (${tier.pairs_balance.toLocaleString()} more needed)`
                                : " ✓"}
                            </span>
                          </div>
                          <div className="h-1.5 bg-purple-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-500 rounded-full"
                              style={{ width: `${tier.pairs_percent}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

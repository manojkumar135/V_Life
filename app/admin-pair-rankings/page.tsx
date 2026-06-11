"use client";

//app/admin-pair-rankings/page.tsx

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import Layout from "@/layout/Layout";
import Loader from "@/components/common/loader";
import { IoIosArrowBack } from "react-icons/io";
import { FaTrophy, FaSearch, FaFilter, FaUsers, FaMedal } from "react-icons/fa";
import { useRouter } from "next/navigation";
import ShowToast from "@/components/common/Toast/toast";
import { PAIR_STAR_TIERS } from "@/constant/pairStar";
import { useVLife } from "@/store/context";

interface AdminUser {
  user_id: string;
  user_name: string;
  contact: string;
  pairs: number;
  pair_star: string;
  left_active_count: number;
  right_active_count: number;
  activated_date: string;
  released_tiers: Array<{
    tier_name: string;
    payout_id?: string;
    payout_status?: string;
  }>;
  reward: string;
  required_pairs: number;
}

const TIER_BADGE_COLORS: Record<string, string> = {
  STAR: "bg-purple-100 text-purple-700 border-purple-200",
  "SILVER STAR": "bg-slate-100 text-slate-700 border-slate-200",
  "GOLD STAR": "bg-yellow-100 text-yellow-700 border-yellow-200",
  "PLATINUM STAR": "bg-cyan-100 text-cyan-700 border-cyan-200",
  "RUBY EXECUTIVE": "bg-red-100 text-red-700 border-red-200",
  "PEARL EXECUTIVE": "bg-pink-100 text-pink-700 border-pink-200",
  "SAPHIRE EXECUTIVE": "bg-blue-100 text-blue-700 border-blue-200",
  "EMERALD EXECUTIVE": "bg-emerald-100 text-emerald-700 border-emerald-200",
  DIAMOND: "bg-sky-100 text-sky-700 border-sky-200",
  "BLUE DIAMOND": "bg-blue-100 text-blue-800 border-blue-300",
  "BLACK DIAMOND": "bg-gray-200 text-gray-800 border-gray-300",
  "CROWN DIAMOND": "bg-violet-100 text-violet-800 border-violet-200",
  AMBASSADOR: "bg-orange-100 text-orange-700 border-orange-200",
  "CROWN AMBASSADOR": "bg-rose-100 text-rose-700 border-rose-200",
  "MAVERICK AMBASSADOR": "bg-indigo-100 text-indigo-800 border-indigo-200",
};

function badgeClass(tier: string) {
  return TIER_BADGE_COLORS[tier] ?? "bg-gray-100 text-gray-700 border-gray-200";
}

function PayoutCell({ releasedTiers }: { releasedTiers: AdminUser["released_tiers"] }) {
  if (!releasedTiers?.length) return <span className="text-gray-400">—</span>;
  const withPayout = releasedTiers.filter((r) => r.payout_id);
  if (!withPayout.length) return <span className="text-gray-400">—</span>;
  return (
    <div className="flex flex-col gap-1">
      {withPayout.map((r) => (
        <a
          key={r.payout_id}
          href={`/wallet/payout/detailview/${r.payout_id}`}
          className="text-blue-600 hover:text-blue-800 hover:underline font-mono text-[11px]"
        >
          {r.payout_id}
          {r.payout_status && (
            <span className={`ml-1 text-[10px] font-semibold ${
              r.payout_status === "Completed" ? "text-green-600" :
              r.payout_status === "Pending" ? "text-yellow-600" : "text-gray-400"
            }`}>
              ({r.payout_status})
            </span>
          )}
        </a>
      ))}
    </div>
  );
}

export default function AdminPairRankingsPage() {
  const router = useRouter();
  const [data, setData] = useState<AdminUser[]>([]);
  const [filtered, setFiltered] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("");

  const { user } = useVLife();

  // Redirect non-admins away
  useEffect(() => {
    if (!user?.user_id) return;
    if (user.role !== "admin" && user.role !== "superadmin") {
      router.push("/pair-rankings");
    }
  }, [user?.user_id, user?.role]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { admin: "true" };
      if (tierFilter) params.pair_star = tierFilter;
      const res = await axios.get("/api/pair-star", { params });
      if (res.data.success) {
        setData(res.data.data);
      } else {
        ShowToast.error(res.data.message || "Failed to load data.");
      }
    } catch {
      ShowToast.error("Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, [tierFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Client-side search filter
  useEffect(() => {
    if (!search.trim()) {
      setFiltered(data);
      return;
    }
    const q = search.toLowerCase();
    setFiltered(
      data.filter(
        (u) =>
          u.user_id.toLowerCase().includes(q) ||
          u.user_name.toLowerCase().includes(q) ||
          (u.contact || "").toLowerCase().includes(q) ||
          (u.pair_star || "").toLowerCase().includes(q),
      ),
    );
  }, [search, data]);

  // Summary counts per tier
  const tierCounts = PAIR_STAR_TIERS.reduce(
    (acc, t) => {
      acc[t.name] = data.filter((u) => u.pair_star === t.name).length;
      return acc;
    },
    {} as Record<string, number>,
  );

  const totalAchievers = data.length;

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
              Pair Star — Admin View
            </h1>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <FaUsers size={16} />
            <span>
              <strong className="text-gray-900">{totalAchievers}</strong>{" "}
              achievers
            </span>
            <button
              onClick={() => router.push("/admin-pair-config")}
              className="ml-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg cursor-pointer"
            >
              Edit Config
            </button>
          </div>
        </div>

        {/* ── Summary tiles — top tiers ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-5">
          {PAIR_STAR_TIERS.slice(0, 5).map((t) => (
            <button
              key={t.name}
              onClick={() => setTierFilter(tierFilter === t.name ? "" : t.name)}
              className={`
                rounded-xl border px-3 py-2.5 text-left transition-all cursor-pointer
                ${
                  tierFilter === t.name
                    ? `${badgeClass(t.name)} shadow-md ring-2 ring-offset-1 ring-current`
                    : "bg-white border-gray-200 hover:border-gray-300 shadow-sm"
                }
              `}
            >
              <p className={`text-xs font-semibold truncate ${tierFilter === t.name ? "" : "text-gray-600"}`}>
                {t.name}
              </p>
              <p className={`text-xl font-bold mt-0.5 ${tierFilter === t.name ? "" : "text-gray-900"}`}>
                {tierCounts[t.name] ?? 0}
              </p>
              <p className={`text-[10px] mt-0.5 ${tierFilter === t.name ? "opacity-80" : "text-gray-400"}`}>
                {t.reward}
              </p>
            </button>
          ))}
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <FaSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, ID, contact..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div className="relative">
            <FaFilter size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white cursor-pointer"
            >
              <option value="">All Tiers</option>
              {PAIR_STAR_TIERS.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Desktop Table ── */}
        <div className="hidden md:block rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {[
                  "User", "Contact", "Star", "Points",
                  "Left Active", "Right Active", "Reward",
                  "Payout ID", "Activated Date",
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
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-gray-400">
                    No users found.
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.user_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{u.user_name}</p>
                      <p className="text-xs text-gray-400">{u.user_id}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{u.contact || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full border ${badgeClass(u.pair_star)}`}>
                        <FaMedal size={10} />
                        {u.pair_star}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-900">
                      {u.pairs.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-green-700 font-medium">
                      {u.left_active_count.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-orange-600 font-medium">
                      {u.right_active_count.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-40">
                      {u.reward}
                    </td>
                    <td className="px-4 py-3">
                      <PayoutCell releasedTiers={u.released_tiers} />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {u.activated_date ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Mobile Cards ── */}
        <div className="md:hidden flex flex-col gap-3">
          {filtered.length === 0 ? (
            <p className="text-center text-gray-400 py-10">No users found.</p>
          ) : (
            filtered.map((u) => (
              <div key={u.user_id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <p className="font-bold text-gray-900">{u.user_name}</p>
                    <p className="text-xs text-gray-400">{u.user_id}</p>
                    {u.contact && (
                      <p className="text-xs text-gray-500 mt-0.5">{u.contact}</p>
                    )}
                  </div>
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full border flex-shrink-0 ${badgeClass(u.pair_star)}`}>
                    <FaMedal size={9} />
                    {u.pair_star}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                  <div className="bg-blue-50 rounded-lg py-1.5">
                    <p className="text-[10px] text-gray-500">Points</p>
                    <p className="font-bold text-blue-700 text-sm">{u.pairs.toLocaleString()}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg py-1.5">
                    <p className="text-[10px] text-gray-500">Left</p>
                    <p className="font-bold text-green-700 text-sm">{u.left_active_count.toLocaleString()}</p>
                  </div>
                  <div className="bg-orange-50 rounded-lg py-1.5">
                    <p className="text-[10px] text-gray-500">Right</p>
                    <p className="font-bold text-orange-600 text-sm">{u.right_active_count.toLocaleString()}</p>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-2 space-y-1.5">
                  <p className="text-xs text-gray-600">
                    <span className="text-gray-400">Reward:</span> {u.reward}
                  </p>
                  <div className="text-xs text-gray-500">
                    <span className="text-gray-400">Payout: </span>
                    <PayoutCell releasedTiers={u.released_tiers} />
                  </div>
                  <p className="text-xs text-gray-500">
                    <span className="text-gray-400">Activated: </span>
                    <span className="font-medium">{u.activated_date ?? "—"}</span>
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Footer count ── */}
        {filtered.length > 0 && (
          <p className="text-xs text-gray-400 text-center pt-4 pb-6">
            Showing {filtered.length} of {data.length} achievers
          </p>
        )}
      </div>
    </Layout>
  );
}
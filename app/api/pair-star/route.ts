/**
 * GET  /api/pair-star?user_id=xxx          → user's tier progress (user page)
 * GET  /api/pair-star?admin=true           → admin list of all achievers
 * GET  /api/pair-star?admin=true&search_user=USER001 → admin searches specific user's progress
 * PATCH /api/pair-star                     → save user's pair_star_start_date
 */

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/user";
import { Login } from "@/models/login";
import TreeNode from "@/models/tree";
import { getDirectPV } from "@/services/directPV";
import { loadTierConfig, loadGlobalConfig } from "@/services/pairStarConfig";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "";

// Decode accessToken from cookie and return { user_id, role }
function decodeAccessToken(req: Request): { _id: string; role: string } | null {
  const cookieHeader = req.headers.get("cookie") || "";
  const accessToken = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("accessToken="))
    ?.slice("accessToken=".length);

  if (!accessToken) return null;

  try {
    const decoded = jwt.verify(accessToken, JWT_SECRET) as any;
    return { _id: decoded._id, role: decoded.role };
  } catch {
    return null;
  }
}

function parseDDMMYYYY(str: string): Date | null {
  if (!str) return null;
  const parts = str.split("-");
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts;
  return new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`);
}

// Count active users in left/right subtree filtered by a start date
async function countActiveFromDate(
  user_id: string,
  startDate: Date | null,
): Promise<{ leftCount: number; rightCount: number }> {
  const allNodes = (await TreeNode.find(
    {},
    { user_id: 1, parent: 1, left: 1, right: 1 },
  ).lean()) as any;

  const nodeMap = new Map<string, any>();
  for (const n of allNodes) nodeMap.set(n.user_id, n);

  const root = nodeMap.get(user_id);
  if (!root) return { leftCount: 0, rightCount: 0 };

  function subtreeIds(startId: string | null | undefined): string[] {
    if (!startId) return [];
    const ids: string[] = [];
    const queue = [startId];
    while (queue.length) {
      const cur = queue.shift()!;
      ids.push(cur);
      const node = nodeMap.get(cur);
      if (node?.left) queue.push(node.left);
      if (node?.right) queue.push(node.right);
    }
    return ids;
  }

  const leftIds = subtreeIds(root.left);
  const rightIds = subtreeIds(root.right);

  const activeQuery = (ids: string[]) => ({
    user_id: { $in: ids },
    user_status: "active",
    $or: [
      { status_notes: { $exists: false } },
      { status_notes: null },
      { status_notes: { $not: /admin/i } },
    ],
  });

  const [leftUsers, rightUsers] = await Promise.all([
    leftIds.length
      ? User.find(activeQuery(leftIds), {
          user_id: 1,
          activated_date: 1,
        }).lean()
      : [],
    rightIds.length
      ? User.find(activeQuery(rightIds), {
          user_id: 1,
          activated_date: 1,
        }).lean()
      : [],
  ]);

  const filterByDate = (users: any[]): number => {
    if (!startDate) return users.length;
    return users.filter((u: any) => {
      const d = parseDDMMYYYY(u.activated_date ?? "");
      return d !== null && d >= startDate;
    }).length;
  };

  return {
    leftCount: filterByDate(leftUsers as any[]),
    rightCount: filterByDate(rightUsers as any[]),
  };
}

// Build full tier progress for a single user — used for both user page and admin user search
async function buildUserProgress(user_id: string) {
  const [tierConfig, globalConfig] = await Promise.all([
    loadTierConfig(),
    loadGlobalConfig(),
  ]);

  const user = (await User.findOne({ user_id })
    .select(
      "user_id user_name pairs pair_star left_active_count right_active_count activated_date pair_star_released_tiers",
    )
    .lean()) as any;

  if (!user) return null;

  // Use global start_date (set by admin for all users/tiers)
  const globalStartDate = globalConfig.start_date
    ? parseDDMMYYYY(globalConfig.start_date)
    : null;

  let leftCount: number;
  let rightCount: number;

  if (globalStartDate) {
    const counted = await countActiveFromDate(user_id, globalStartDate);
    leftCount = counted.leftCount;
    rightCount = counted.rightCount;
  } else {
    leftCount = user.left_active_count ?? 0;
    rightCount = user.right_active_count ?? 0;
  }

  const currentPairs = Math.min(leftCount, rightCount);
  const releasedTiers: Array<{
    tier_name: string;
    reward: string;
    pairs: number;
    released_at: string;
    payout_status: string;
    transaction_id: string | null;
  }> = user.pair_star_released_tiers ?? [];

  let leftDirectPV = 0;
  let rightDirectPV = 0;
  try {
    const pv = await getDirectPV(user_id);
    leftDirectPV = pv.leftDirectPV;
    rightDirectPV = pv.rightDirectPV;
  } catch (_) {}

  const tiers = tierConfig.map((tier) => {
    const pairsAchieved = currentPairs >= tier.pairs;
    const leftPVAchieved = leftDirectPV >= tier.direct_pv;
    const rightPVAchieved = rightDirectPV >= tier.direct_pv;
    const achieved = pairsAchieved && leftPVAchieved && rightPVAchieved;

    // Normalize underscore → space for matching e.g. "BRONZE_STAR" → "BRONZE STAR"
    const releaseRecord = releasedTiers.find(
      (r) => r.tier_name.replace(/_/g, " ") === tier.tier_name,
    );
    const reward_released = !!releaseRecord;

    // payout_status "Paid" means payment received → show received date
    const isPaid = releaseRecord?.payout_status === "Paid";

    return {
      name: tier.tier_name,
      required_pairs: tier.pairs,
      required_direct_pv: tier.direct_pv,
      reward: tier.reward,

      current_pairs: currentPairs,
      pairs_balance: Math.max(0, tier.pairs - currentPairs),
      pairs_percent: Math.min(
        100,
        Math.round((currentPairs / tier.pairs) * 100),
      ),

      left_active: leftCount,
      right_active: rightCount,
      left_direct_pv: leftDirectPV,
      right_direct_pv: rightDirectPV,
      left_pv_balance: Math.max(0, tier.direct_pv - leftDirectPV),
      right_pv_balance: Math.max(0, tier.direct_pv - rightDirectPV),
      left_pv_percent: Math.min(
        100,
        Math.round((leftDirectPV / tier.direct_pv) * 100),
      ),
      right_pv_percent: Math.min(
        100,
        Math.round((rightDirectPV / tier.direct_pv) * 100),
      ),

      achieved,
      reward_released,

      // achieved_date = when reward was released/unlocked (released_at from DB)
      achieved_date: releaseRecord?.released_at ?? null,

      // released_at (received) = only when payout_status is "Paid"
      released_at: isPaid ? (releaseRecord?.released_at ?? null) : null,

      released_pairs: releaseRecord?.pairs ?? null,
    };
  });

  return {
    user_id,
    user_name: user.user_name,
    current_pairs: currentPairs,
    current_pair_star: user.pair_star ?? null,
    left_active: leftCount,
    right_active: rightCount,
    left_direct_pv: leftDirectPV,
    right_direct_pv: rightDirectPV,
    start_date: globalConfig.start_date ?? null, // global — same for all users
    activated_date: user.activated_date ?? null,
    pair_star_released_tiers: releasedTiers,
    tiers,
  };
}

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);

    // ── ADMIN: search specific user's progress ────────────────────────────
    const searchUser = searchParams.get("search_user");
    if (searchUser) {
      const progress = await buildUserProgress(searchUser);
      if (!progress) {
        return NextResponse.json(
          { success: false, message: "User not found" },
          { status: 404 },
        );
      }
      return NextResponse.json({ success: true, data: progress });
    }

    // ── ADMIN: list all achievers ─────────────────────────────────────────
    if (searchParams.get("admin") === "true") {
      const tierConfig = await loadTierConfig();
      const search = searchParams.get("search") || "";
      const filterTier = searchParams.get("pair_star") || "";

      const query: any = { pair_star: { $exists: true, $ne: null } };
      if (filterTier) query.pair_star = filterTier;
      if (search) {
        query.$or = [
          { user_id: { $regex: search, $options: "i" } },
          { user_name: { $regex: search, $options: "i" } },
          { contact: { $regex: search, $options: "i" } },
        ];
      }

      const users = await User.find(query, {
        user_id: 1,
        user_name: 1,
        contact: 1,
        pairs: 1,
        pair_star: 1,
        left_active_count: 1,
        right_active_count: 1,
        activated_date: 1,
        pair_star_released_tiers: 1,
      })
        .sort({ pairs: -1 })
        .lean();

      const data = (users as any[]).map((u) => {
        const tierInfo = tierConfig.find((t) => t.tier_name === u.pair_star);
        const releasedTiers = u.pair_star_released_tiers ?? [];
        return {
          user_id: u.user_id,
          user_name: u.user_name,
          contact: u.contact,
          pairs: u.pairs ?? 0,
          pair_star: u.pair_star,
          left_active_count: u.left_active_count ?? 0,
          right_active_count: u.right_active_count ?? 0,
          activated_date: u.activated_date,
          reward: tierInfo?.reward ?? "",
          required_pairs: tierInfo?.pairs ?? 0,
          released_tiers: releasedTiers,
        };
      });

      return NextResponse.json({ success: true, data });
    }

    // ── USER: own progress ────────────────────────────────────────────────
    const user_id = searchParams.get("user_id");
    if (!user_id) {
      return NextResponse.json(
        { success: false, message: "user_id is required" },
        { status: 400 },
      );
    }

    const progress = await buildUserProgress(user_id);
    if (!progress) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: progress });
  } catch (err: any) {
    console.error("[PairStar API] GET error:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Server error" },
      { status: 500 },
    );
  }
}

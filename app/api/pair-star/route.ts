/**
 * GET  /api/pair-star?user_id=xxx          → user's tier progress (user page)
 * GET  /api/pair-star?admin=true           → admin list of all achievers
 * GET  /api/pair-star?admin=true&search_user=USER001 → admin searches specific user's progress
 * PATCH /api/pair-star                     → save user's pair_star_start_date
 */

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/user";
import { DailyPayout } from "@/models/payout";
import { Login } from "@/models/login";
import TreeNode from "@/models/tree";
import { getDirectPV } from "@/services/directPV";
import { loadTierConfig, loadGlobalConfig } from "@/services/pairStarConfig";
import jwt from "jsonwebtoken";
import { istStringsToUTCDate, laterDate } from "@/utils/server/getISTDateTime";
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

// Count active users in left/right subtree filtered by an effective start date
// async function countActiveFromDate(
//   user_id: string,
//   effectiveStartDate: Date | null,
// ): Promise<{ leftCount: number; rightCount: number }> {
//    // Team activations count only after the parent user is activated.
//    const owner = (await User.findOne({ user_id })
//     .select("user_status")
//     .lean()) as { user_status?: string } | null;

//   if (owner?.user_status?.toLowerCase() !== "active") {
//     return { leftCount: 0, rightCount: 0 };
//   }
//   const allNodes = (await TreeNode.find(
//     {},
//     { user_id: 1, parent: 1, left: 1, right: 1 },
//   ).lean()) as any;

//   const nodeMap = new Map<string, any>();
//   for (const n of allNodes) nodeMap.set(n.user_id, n);

//   const root = nodeMap.get(user_id);
//   if (!root) return { leftCount: 0, rightCount: 0 };

//   function subtreeIds(startId: string | null | undefined): string[] {
//     if (!startId) return [];
//     const ids: string[] = [];
//     const queue = [startId];
//     while (queue.length) {
//       const cur = queue.shift()!;
//       ids.push(cur);
//       const node = nodeMap.get(cur);
//       if (node?.left) queue.push(node.left);
//       if (node?.right) queue.push(node.right);
//     }
//     return ids;
//   }

//   const leftIds = subtreeIds(root.left);
//   const rightIds = subtreeIds(root.right);

//   const activeQuery = (ids: string[]) => ({
//   user_id: { $in: ids },
//   user_status: "active",
// });

//   const [leftUsers, rightUsers] = await Promise.all([
//     leftIds.length
//       ? User.find(activeQuery(leftIds), {
//           user_id: 1,
//           activated_date: 1,
//           activated_time: 1,
//         }).lean()
//       : [],
//     rightIds.length
//       ? User.find(activeQuery(rightIds), {
//           user_id: 1,
//           activated_date: 1,
//           activated_time: 1,
//         }).lean()
//       : [],
//   ]);

//  const filterByDate = (users: any[]): number => {
//   return users.filter((user: any) => {
//     // Active users without date/time are counted.
//     if (!user.activated_date || !user.activated_time) {
//       return true;
//     }

//     if (!effectiveStartDate) {
//       return true;
//     }

//     const activationDate = istStringsToUTCDate(
//       user.activated_date,
//       user.activated_time,
//     );

//     return !!activationDate && activationDate >= effectiveStartDate;
//   }).length;
// };

//   return {
//     leftCount: filterByDate(leftUsers as any[]),
//     rightCount: filterByDate(rightUsers as any[]),
//   };
// }

// Count active team PV in left/right subtree filtered by an effective start date.
// Pair count is based on the PV total: floor(min(leftPV, rightPV) / 100).
async function countPVFromDate(
  user_id: string,
  effectiveStartDate: Date | null,
): Promise<{ leftPV: number; rightPV: number }> {
  const owner = (await User.findOne({ user_id })
    .select("user_status")
    .lean()) as { user_status?: string } | null;

  if (owner?.user_status?.toLowerCase() !== "active") {
    return { leftPV: 0, rightPV: 0 };
  }

  const allNodes = (await TreeNode.find(
    {},
    { user_id: 1, parent: 1, left: 1, right: 1 },
  ).lean()) as any;

  const nodeMap = new Map<string, any>();
  for (const n of allNodes) nodeMap.set(n.user_id, n);

  const root = nodeMap.get(user_id);
  if (!root) return { leftPV: 0, rightPV: 0 };

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
  });

  const [leftUsers, rightUsers] = await Promise.all([
    leftIds.length
      ? User.find(activeQuery(leftIds), {
          user_id: 1,
          activated_date: 1,
          activated_time: 1,
          self_pv: 1,
        }).lean()
      : [],
    rightIds.length
      ? User.find(activeQuery(rightIds), {
          user_id: 1,
          activated_date: 1,
          activated_time: 1,
          self_pv: 1,
        }).lean()
      : [],
  ]);

  const sumEligiblePV = (users: any[]): number =>
    users
      .filter((user: any) => {
        if (!user.activated_date || !user.activated_time) return true;
        if (!effectiveStartDate) return true;

        const activationDate = istStringsToUTCDate(
          user.activated_date,
          user.activated_time,
        );

        return !!activationDate && activationDate >= effectiveStartDate;
      })
      .reduce((total, user) => total + Number(user.self_pv || 0), 0);

  return {
    leftPV: sumEligiblePV(leftUsers as any[]),
    rightPV: sumEligiblePV(rightUsers as any[]),
  };
}

async function applyDailyPayoutStatuses(releasedTiers: any[]): Promise<any[]> {
  const payoutIds: string[] = releasedTiers
    .map((tier) => tier.payout_id)
    .filter((payoutId): payoutId is string => Boolean(payoutId));

  if (!payoutIds.length) return releasedTiers;

  const payouts = (await DailyPayout.find(
    { payout_id: { $in: payoutIds } },
    { payout_id: 1, status: 1, transaction_id: 1 },
  ).lean()) as unknown as Array<{
    payout_id: string;
    status?: string;
    transaction_id?: string;
  }>;
  const payoutMap = new Map(
    payouts.map((payout) => [
      payout.payout_id,
      {
        status: payout.status,
        transaction_id: payout.transaction_id,
      },
    ]),
  );

  return releasedTiers.map((tier) => {
    const payout = tier.payout_id ? payoutMap.get(tier.payout_id) : undefined;

    if (!payout) return tier;

    return {
      ...tier,
      payout_status: payout.status ?? tier.payout_status,
      transaction_id: payout.transaction_id ?? tier.transaction_id,
    };
  });
}

// Build full tier progress for a single user — used for both user page and admin user search
async function buildUserProgress(user_id: string) {
  const [tierConfig, globalConfig] = await Promise.all([
    loadTierConfig(),
    loadGlobalConfig(),
  ]);

  const user = (await User.findOne({ user_id })
    .select(
      "user_id user_name pairs pair_star left_active_count right_active_count activated_date activated_time pair_star_released_tiers",
    )
    .lean()) as any;

  if (!user) return null;

  // Use global start_date (set by admin for all users/tiers)
  const globalStartDate = globalConfig.start_date
    ? parseDDMMYYYY(globalConfig.start_date)
    : null;

  // Effective cutoff = later of (global Pair Star start date) and (this
  // user's own activation timestamp) — a user cannot earn pairs from team
  // activity that predates their own activation.
  const userActivationCutoff = istStringsToUTCDate(
    user.activated_date,
    user.activated_time,
  );
  const effectiveStartDate = laterDate(globalStartDate, userActivationCutoff);

  let leftPV: number;
  let rightPV: number;

  const counted = await countPVFromDate(user_id, effectiveStartDate);
  leftPV = counted.leftPV;
  rightPV = counted.rightPV;

  const currentPairs = Math.floor(Math.min(leftPV, rightPV) / 100);
  const releasedTiers = await applyDailyPayoutStatuses(
    user.pair_star_released_tiers ?? [],
  );

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
      (r) =>
        String(r.tier_name || "")
          .replace(/_/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .toUpperCase() === tier.tier_name.toUpperCase(),
    );
    const reward_released = !!releaseRecord;

    // payout_status "Paid" means payment received → show received date
    const isPaid = ["paid", "completed"].includes(
      String(releaseRecord?.payout_status ?? "").toLowerCase(),
    );
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

      left_active: Math.floor(leftPV / 100),
      right_active: Math.floor(rightPV / 100),
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
    left_active: Math.floor(leftPV / 100),
    right_active: Math.floor(rightPV / 100),
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

      const data = (
        await Promise.all(
          (users as any[]).map(async (u) => {
            const progress = await buildUserProgress(u.user_id);
            const tierInfo = tierConfig.find(
              (t) => t.tier_name === u.pair_star,
            );

            return {
              user_id: u.user_id,
              user_name: u.user_name,
              contact: u.contact,
              pairs: progress?.current_pairs ?? 0,
              pair_star: u.pair_star,
              left_active: progress?.left_active ?? 0,
              right_active: progress?.right_active ?? 0,
              activated_date: u.activated_date,
              reward: tierInfo?.reward ?? "",
              required_pairs: tierInfo?.pairs ?? 0,
              released_tiers: await applyDailyPayoutStatuses(
                u.pair_star_released_tiers ?? [],
              ),
            };
          }),
        )
      ).filter(Boolean);

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

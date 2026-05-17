/**
 * PAIR STAR ENGINE
 *
 * Triggered AFTER a user is activated (first order or admin activation).
 *
 * Flow:
 *  1. Walk UP the binary tree from the newly activated user using parent pointers.
 *  2. For each ancestor, determine whether the new user is in their left or right subtree.
 *  3. Atomically $inc left_active_count or right_active_count on User + TreeNode.
 *  4. After incrementing, re-read that ancestor's counts and recompute pairs.
 *  5. Check if pairs crossed a new pair_star tier and award it (once per tier).
 *
 * Reward release guard:
 *  - pair_star_released_tiers on User stores every tier already released as objects
 *    { tier_name, reward, pairs, released_at }
 *  - Before releasing any tier we check if tier_name already exists in that array.
 *  - If yes → skip (reward already given, never release again).
 *  - If no  → release + push the record into the array.
 *
 * Design for scale (1000+ level tree, concurrent activations):
 *  - Walk ancestors in a single in-memory pass (one TreeNode.find() loads the whole tree).
 *  - Use atomic $inc — no read-modify-write races.
 *  - Bulk write the increments for all ancestors in one bulkWrite call.
 *  - Tier check only runs for ancestors whose pairs value is near a threshold.
 *  - Called fire-and-forget from activation routes (does not block HTTP response).
 *
 * Tier config:
 *  - Loaded from DB via loadTierConfig() — admin-editable values (pairs, direct_pv, reward, start_date).
 *  - Tier names are fixed from constants/pairStar.ts — admin cannot change names.
 *  - Falls back to constants if DB not yet seeded.
 *  - Cached for 60 seconds to avoid repeated DB calls.
 */

import { User } from "@/models/user";
import { Login } from "@/models/login";
import TreeNode from "@/models/tree";
import { Alert } from "@/models/alert";
import { connectDB } from "@/lib/mongodb";
import { getDirectPV } from "@/services/directPV";
import { loadTierConfig, TierConfig } from "@/services/pairStarConfig";

// Re-export constants so existing imports from this file still work
export { PAIR_STAR_TIERS, PAIR_STAR_TIER_NAMES } from "@/constant/pairStar";
export type { PairStarTierName } from "@/constant/pairStar";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function tierIndexByName(name: string | undefined | null, tiers: TierConfig[]): number {
  if (!name) return -1;
  return tiers.findIndex((t) => t.tier_name === name);
}

function computeHighestTier(
  pairs: number,
  leftDirectPV: number,
  rightDirectPV: number,
  tiers: TierConfig[],
): TierConfig | null {
  const minPV = Math.min(leftDirectPV, rightDirectPV);
  let best: TierConfig | null = null;
  for (const tier of tiers) {
    if (pairs >= tier.pairs && minPV >= tier.direct_pv) {
      best = tier;
    } else {
      break;
    }
  }
  return best;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT: called fire-and-forget after every user activation
// ─────────────────────────────────────────────────────────────────────────────
export async function propagatePairStarOnActivation(
  activatedUserId: string,
): Promise<void> {
  try {
    await connectDB();

    // Load tier config from DB (admin-editable, 60s cached)
    const tierConfig = await loadTierConfig();

    // ── 1. Load entire tree into memory (one query) ──────────────────────────
    const allNodes = (await TreeNode.find(
      {},
      { user_id: 1, parent: 1, left: 1, right: 1 },
    ).lean()) as any;

    const nodeMap = new Map<string, { user_id: string; parent?: string; left?: string; right?: string }>();
    for (const n of allNodes) {
      nodeMap.set(n.user_id, n);
    }

    // ── 2. Walk UP the tree collecting ancestors + which side the new user is on
    const ancestors: Array<{ user_id: string; side: "left" | "right" }> = [];

    const startNode = nodeMap.get(activatedUserId);
    if (!startNode) {
      console.warn(`[PairStar] TreeNode not found for activated user ${activatedUserId}`);
      return;
    }

    let child = startNode;

    while (child.parent) {
      const parentNode = nodeMap.get(child.parent);
      if (!parentNode) break;

      const side: "left" | "right" | null =
        parentNode.left === child.user_id
          ? "left"
          : parentNode.right === child.user_id
            ? "right"
            : null;

      if (!side) break;

      ancestors.push({ user_id: parentNode.user_id, side });
      child = parentNode;
    }

    if (ancestors.length === 0) return;

    // ── 3. Bulk $inc left_active_count / right_active_count on User + TreeNode
    const userBulkOps: any[] = [];
    const treeBulkOps: any[] = [];

    for (const { user_id, side } of ancestors) {
      const incField =
        side === "left" ? "left_active_count" : "right_active_count";

      userBulkOps.push({
        updateOne: {
          filter: { user_id },
          update: { $inc: { [incField]: 1 } },
        },
      });

      treeBulkOps.push({
        updateOne: {
          filter: { user_id },
          update: { $inc: { [incField]: 1 } },
        },
      });
    }

    await Promise.all([
      User.bulkWrite(userBulkOps, { ordered: false }),
      TreeNode.bulkWrite(treeBulkOps, { ordered: false }),
    ]);

    // ── 4. Re-read updated counts + pair_star_released_tiers for each ancestor
    const ancestorIds = ancestors.map((a) => a.user_id);

    const ancestorUsers = (await User.find(
      { user_id: { $in: ancestorIds } },
      {
        user_id: 1,
        user_name: 1,
        left_active_count: 1,
        right_active_count: 1,
        pair_star: 1,
        pairs: 1,
        pair_star_released_tiers: 1, // ← fetch to check before releasing
      },
    ).lean()) as any;

    // Format date + time once for all release records and alerts
    const now = new Date();
    const istNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const formattedDate = `${String(istNow.getDate()).padStart(2, "0")}-${String(
      istNow.getMonth() + 1,
    ).padStart(2, "0")}-${istNow.getFullYear()}`;
    const formattedTime = `${String(istNow.getHours()).padStart(2, "0")}:${String(
      istNow.getMinutes(),
    ).padStart(2, "0")}`;
    const releasedAt = `${formattedDate} ${formattedTime}`; // "DD-MM-YYYY HH:MM"

    await Promise.allSettled(
      ancestorUsers.map((ancestor: any) =>
        checkAndUpgradePairStar(ancestor, tierConfig, formattedDate, releasedAt, istNow),
      ),
    );
  } catch (err) {
    console.error("[PairStar] propagatePairStarOnActivation error:", err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Check one ancestor — release any newly crossed tiers
// ─────────────────────────────────────────────────────────────────────────────
async function checkAndUpgradePairStar(
  ancestor: {
    user_id: string;
    user_name: string;
    left_active_count: number;
    right_active_count: number;
    pair_star?: string;
    pairs: number;
    pair_star_released_tiers?: Array<{
      tier_name: string;
      reward: string;
      pairs: number;
      released_at: string;
    }>;
  },
  tierConfig: TierConfig[],
  formattedDate: string,
  releasedAt: string,
  istNow: Date,
): Promise<void> {
  const leftCount  = ancestor.left_active_count  ?? 0;
  const rightCount = ancestor.right_active_count ?? 0;
  const currentPairs = Math.min(leftCount, rightCount);

  // Keep pairs field in sync
  if (currentPairs !== (ancestor.pairs ?? 0)) {
    await Promise.all([
      User.updateOne({ user_id: ancestor.user_id }, { $set: { pairs: currentPairs } }),
      TreeNode.updateOne({ user_id: ancestor.user_id }, { $set: { pairs: currentPairs } }),
    ]);
  }

  // Not reached first tier yet — nothing to do
  if (currentPairs < tierConfig[0].pairs) return;

  // Already released tiers — from pair_star_released_tiers on User
  const releasedTiers: Array<{ tier_name: string; reward: string; pairs: number; released_at: string }> =
    ancestor.pair_star_released_tiers ?? [];

  // Find the highest tier index already released
  const currentTierIdx = releasedTiers.length > 0
    ? Math.max(...releasedTiers.map((r) => tierIndexByName(r.tier_name, tierConfig)))
    : -1;

  // Already at highest possible tier — nothing to do
  if (currentTierIdx === tierConfig.length - 1) return;

  // Check if pairs meet the NEXT tier's requirement
  const nextTierIdx = currentTierIdx + 1;
  const nextTier = tierConfig[nextTierIdx];

  if (currentPairs < nextTier.pairs) return; // not enough pairs yet

  // Pairs crossed a threshold — now check directPV
  let leftDirectPV = 0;
  let rightDirectPV = 0;

  try {
    const pvResult = await getDirectPV(ancestor.user_id);
    leftDirectPV = pvResult.leftDirectPV;
    rightDirectPV = pvResult.rightDirectPV;
  } catch (err) {
    console.error(`[PairStar] getDirectPV failed for ${ancestor.user_id}:`, err);
    return;
  }

  // Find the highest tier this user NOW fully qualifies for
  const highestTier = computeHighestTier(currentPairs, leftDirectPV, rightDirectPV, tierConfig);
  if (!highestTier) return;

  const highestTierIdx = tierIndexByName(highestTier.tier_name, tierConfig);
  if (highestTierIdx <= currentTierIdx) return; // no new tier to release

  // Release every tier from nextTierIdx up to highestTierIdx
  // handles case where user jumps multiple tiers at once
  for (let idx = nextTierIdx; idx <= highestTierIdx; idx++) {
    const tier = tierConfig[idx];

    // ── GUARD: check if this specific tier is already released ───────────
    const alreadyReleased = releasedTiers.some((r) => r.tier_name === tier.tier_name);
    if (alreadyReleased) {
      console.log(`[PairStar] ${ancestor.user_id} — ${tier.tier_name} already released, skipping`);
      continue;
    }

    // ── Build release record ─────────────────────────────────────────────
    const releaseRecord = {
      tier_name:   tier.tier_name,
      reward:      tier.reward,
      pairs:       currentPairs,
      released_at: releasedAt,   // "DD-MM-YYYY HH:MM"
    };

    // ── Save to User, Login, TreeNode ─────────────────────────────────────
    await Promise.all([
      User.updateOne(
        { user_id: ancestor.user_id },
        {
          $set:  { pair_star: tier.tier_name, pairs: currentPairs },
          $push: { pair_star_released_tiers: releaseRecord },
        },
      ),
      Login.updateOne(
        { user_id: ancestor.user_id },
        {
          $set:  { pair_star: tier.tier_name, pairs: currentPairs },
          $push: { pair_star_released_tiers: releaseRecord },
        },
      ),
      TreeNode.updateOne(
        { user_id: ancestor.user_id },
        {
          $set:  { pair_star: tier.tier_name, pairs: currentPairs },
          $push: { pair_star_released_tiers: releaseRecord },
        },
      ),
    ]);

    // ── Fire alerts ───────────────────────────────────────────────────────
    await Alert.create([
      {
        user_id:     ancestor.user_id,
        user_name:   ancestor.user_name,
        role:        "user",
        priority:    "high",
        title:       `🏆 ${tier.tier_name} Achieved!`,
        description: `Congratulations! You achieved the ${tier.tier_name} rank with ${currentPairs} pairs. Reward: ${tier.reward}`,
        type:        "achievement",
        link:        "/wallet/rewards",
        read:        false,
        date:        formattedDate,
        created_at:  istNow,
      },
      {
        role:        "admin",
        priority:    "high",
        title:       `🏆 Pair Star Upgrade: ${tier.tier_name}`,
        description: `User ${ancestor.user_name} (${ancestor.user_id}) achieved ${tier.tier_name} with ${currentPairs} pairs. Reward: ${tier.reward}`,
        link:        "/AdminDashboard",
        read:        false,
        date:        formattedDate,
        created_at:  istNow,
      },
    ]);

    // Push to local array so next iteration's guard is accurate without re-reading DB
    releasedTiers.push(releaseRecord);

    console.log(
      `[PairStar] ✅ ${ancestor.user_id} — ${tier.tier_name} released (pairs: ${currentPairs}, at: ${releasedAt})`,
    );
  }
}
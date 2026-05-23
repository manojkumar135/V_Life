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
 *    { tier_name, reward, pairs, released_at, payout_id, payout_status, transaction_id }
 *  - Before releasing any tier we check if tier_name already exists in that array.
 *  - If yes → skip (reward already given, never release again).
 *  - If no  → release + push the record into the array.
 *
 * Payout flow (same as matching bonus):
 *  - Creates DailyPayout record with status: "Pending"
 *  - reward_amount → type: "reward" in Score
 *  - withdraw_amount → type: "daily" in Score
 *  - Admin downloads Excel → pays via NEFT → updates transaction_id + status: "Completed"
 *
 * Design for scale (1000+ level tree, concurrent activations):
 *  - Walk ancestors in a single in-memory pass (one TreeNode.find() loads the whole tree).
 *  - Use atomic $inc — no read-modify-write races.
 *  - Bulk write the increments for all ancestors in one bulkWrite call.
 *  - Tier check only runs for ancestors whose pairs value is near a threshold.
 *  - Called fire-and-forget from activation routes (does not block HTTP response).
 *
 * Tier config:
 *  - Loaded from DB via loadTierConfig() — admin-editable values (pairs, direct_pv, reward, reward_amount).
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
import {
  loadTierConfig,
  loadGlobalConfig,
  TierConfig,
} from "@/services/pairStarConfig";
import { DailyPayout } from "@/models/payout";
import { Wallet } from "@/models/wallet";
import { addRewardScore } from "@/services/updateRewardScore";
import { generateUniqueCustomId } from "@/utils/server/customIdGenerator";
import { History } from "@/models/history";

// Re-export constants so existing imports from this file still work
export { PAIR_STAR_TIERS, PAIR_STAR_TIER_NAMES } from "@/constant/pairStar";
export type { PairStarTierName } from "@/constant/pairStar";

// ─────────────────────────────────────────────────────────────────────────────
// Count active users in left/right subtree using already-loaded nodeMap
// This is the same logic as countActiveFromDate in the API — ensures consistency
// ─────────────────────────────────────────────────────────────────────────────
async function countActiveInSubtree(
  user_id: string,
  nodeMap: Map<string, any>,
  globalStartDate: Date | null,
): Promise<{ leftCount: number; rightCount: number }> {
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

 // Exclude admin-activated users — they have "admin" in status_notes
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
      ? User.find(activeQuery(leftIds), { user_id: 1, activated_date: 1 }).lean()
      : [],
    rightIds.length
      ? User.find(activeQuery(rightIds), { user_id: 1, activated_date: 1 }).lean()
      : [],
  ]);

  const filterByDate = (users: any[]): number => {
    if (!globalStartDate) return users.length;
    return users.filter((u: any) => {
      if (!u.activated_date) return false;
      const parts = u.activated_date.split("-");
      if (parts.length !== 3) return false;
      const d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00.000Z`);
      return d >= globalStartDate;
    }).length;
  };

  return {
    leftCount: filterByDate(leftUsers as any[]),
    rightCount: filterByDate(rightUsers as any[]),
  };
}

function tierIndexByName(
  name: string | undefined | null,
  tiers: TierConfig[],
): number {
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

    // Load global start date — same as API uses
    const globalConfig = await loadGlobalConfig();
    const globalStartDate = globalConfig.start_date
      ? (() => {
          const parts = globalConfig.start_date!.split("-");
          return parts.length === 3
            ? new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00.000Z`)
            : null;
        })()
      : null;

    // ── 1. Load entire tree into memory (one query) ──────────────────────────
    const allNodes = (await TreeNode.find(
      {},
      { user_id: 1, parent: 1, left: 1, right: 1 },
    ).lean()) as any;

    const nodeMap = new Map<
      string,
      { user_id: string; parent?: string; left?: string; right?: string }
    >();
    for (const n of allNodes) {
      nodeMap.set(n.user_id, n);
    }

    // ── 2. Walk UP the tree collecting ancestors + which side the new user is on
    const ancestors: Array<{ user_id: string; side: "left" | "right" }> = [];

    const startNode = nodeMap.get(activatedUserId);
    if (!startNode) {
      console.warn(
        `[PairStar] TreeNode not found for activated user ${activatedUserId}`,
      );
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
        contact: 1,
        mail: 1,
        left_active_count: 1,
        right_active_count: 1,
        pair_star: 1,
        pairs: 1,
        pair_star_released_tiers: 1, // ← fetch to check before releasing
      },
    ).lean()) as any;

    // Format date + time once for all release records and alerts
    const now = new Date();
    const istNow = new Date(
      now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
    );
    const formattedDate = `${String(istNow.getDate()).padStart(2, "0")}-${String(
      istNow.getMonth() + 1,
    ).padStart(2, "0")}-${istNow.getFullYear()}`;
    const formattedTime = `${String(istNow.getHours()).padStart(2, "0")}:${String(
      istNow.getMinutes(),
    ).padStart(2, "0")}`;
    const releasedAt = `${formattedDate} ${formattedTime}`; // "DD-MM-YYYY HH:MM"

    await Promise.allSettled(
      ancestorUsers.map((ancestor: any) =>
        checkAndUpgradePairStar(
          ancestor,
          tierConfig,
          nodeMap,
          globalStartDate,
          formattedDate,
          formattedTime,
          releasedAt,
          istNow,
        ),
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
    contact?: string;
    mail?: string;
    left_active_count: number;
    right_active_count: number;
    pair_star?: string;
    pairs: number;
    pair_star_released_tiers?: Array<{
      tier_name: string;
      reward: string;
      pairs: number;
      released_at: string;
      payout_id?: string;
      payout_status?: string;
      transaction_id?: string | null;
    }>;
  },
  tierConfig: TierConfig[],
  nodeMap: Map<string, any>,
  globalStartDate: Date | null,
  formattedDate: string,
  formattedTime: string,
  releasedAt: string,
  istNow: Date,
): Promise<void> {
  // ── Accurate counts from tree traversal — same logic as API ──────────────
  const { leftCount, rightCount } = await countActiveInSubtree(
    ancestor.user_id,
    nodeMap,
    globalStartDate,
  );
  const currentPairs = Math.min(leftCount, rightCount);

  // Sync stored counters if they differ from actual counts
  if (
    currentPairs !== (ancestor.pairs ?? 0) ||
    leftCount !== (ancestor.left_active_count ?? 0) ||
    rightCount !== (ancestor.right_active_count ?? 0)
  ) {
    await Promise.all([
      User.updateOne(
        { user_id: ancestor.user_id },
        {
          $set: {
            pairs: currentPairs,
            left_active_count: leftCount,
            right_active_count: rightCount,
          },
        },
      ),
      TreeNode.updateOne(
        { user_id: ancestor.user_id },
        {
          $set: {
            pairs: currentPairs,
            left_active_count: leftCount,
            right_active_count: rightCount,
          },
        },
      ),
    ]);
  }

  // Not reached first tier yet — nothing to do
  if (currentPairs < tierConfig[0].pairs) return;

  // Already released tiers — from pair_star_released_tiers on User
  const releasedTiers = ancestor.pair_star_released_tiers ?? ([] as any[]);

  // Find the highest tier index already released
  const currentTierIdx =
    releasedTiers.length > 0
      ? Math.max(
          ...releasedTiers.map((r: any) =>
            tierIndexByName(r.tier_name, tierConfig),
          ),
        )
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
    console.error(
      `[PairStar] getDirectPV failed for ${ancestor.user_id}:`,
      err,
    );
    return;
  }

  // Find the highest tier this user NOW fully qualifies for
  const highestTier = computeHighestTier(
    currentPairs,
    leftDirectPV,
    rightDirectPV,
    tierConfig,
  );
  if (!highestTier) return;

  const highestTierIdx = tierIndexByName(highestTier.tier_name, tierConfig);
  if (highestTierIdx <= currentTierIdx) return; // no new tier to release

  // Release every tier from nextTierIdx up to highestTierIdx
  for (let idx = nextTierIdx; idx <= highestTierIdx; idx++) {
    const tier = tierConfig[idx];

    // ── GUARD: check if this specific tier is already released ───────────
    const alreadyReleased = releasedTiers.some(
      (r: any) => r.tier_name === tier.tier_name,
    );
    if (alreadyReleased) {
      console.log(
        `[PairStar] ${ancestor.user_id} — ${tier.tier_name} already released, skipping`,
      );
      continue;
    }

    // ── Build release record ─────────────────────────────────────────────
    const releaseRecord: any = {
      tier_name: tier.tier_name,
      reward: tier.reward,
      pairs: currentPairs,
      released_at: releasedAt, // "DD-MM-YYYY HH:MM"
      payout_id: "", // filled after payout creation below
      payout_status: "Pending",
      transaction_id: null,
    };

    // ── Save to User, Login, TreeNode ─────────────────────────────────────
    await Promise.all([
      User.updateOne(
        { user_id: ancestor.user_id },
        {
          $set: { pair_star: tier.tier_name, pairs: currentPairs },
          $push: { pair_star_released_tiers: releaseRecord },
        },
      ),
      Login.updateOne(
        { user_id: ancestor.user_id },
        {
          $set: { pair_star: tier.tier_name, pairs: currentPairs },
          $push: { pair_star_released_tiers: releaseRecord },
        },
      ),
      TreeNode.updateOne(
        { user_id: ancestor.user_id },
        {
          $set: { pair_star: tier.tier_name, pairs: currentPairs },
          $push: { pair_star_released_tiers: releaseRecord },
        },
      ),
    ]);

    // ── Create Payout + Save to Score ─────────────────────────────────────
    try {
      const payout_id = await generateUniqueCustomId("PS", DailyPayout, 8, 8);

      const wallet = (await Wallet.findOne(
        { user_id: ancestor.user_id },
        {
          wallet_id: 1,
          account_holder_name: 1,
          bank_name: 1,
          account_number: 1,
          ifsc_code: 1,
          balance: 1,
          rank: 1,
          pan_verified: 1,
          pan: 1,
        },
      ).lean()) as any;

      const isPanVerified =
        wallet?.pan_verified === true || wallet?.pan_verified === "true";
      const totalAmount = tier.reward_amount ?? 0;

      // Deductions — same structure as matching bonus
      let withdrawAmount = 0;
      let rewardAmount = 0;
      let tdsAmount = 0;
      let adminCharge = 0;

      if (wallet && isPanVerified) {
        withdrawAmount = Number((totalAmount * 0.8).toFixed(2)); // 80% to user wallet
        rewardAmount = Number((totalAmount * 0.08).toFixed(2)); // 8% reward points
        tdsAmount = Number((totalAmount * 0.02).toFixed(2)); // 2% TDS
        adminCharge = Number((totalAmount * 0.1).toFixed(2)); // 10% admin
      } else {
        withdrawAmount = Number((totalAmount * 0.62).toFixed(2)); // 62% to user wallet
        rewardAmount = Number((totalAmount * 0.08).toFixed(2)); // 8% reward points
        tdsAmount = Number((totalAmount * 0.2).toFixed(2)); // 20% TDS (no PAN)
        adminCharge = Number((totalAmount * 0.1).toFixed(2)); // 10% admin
      }

      // ── Create DailyPayout record (status: Pending) ───────────────────
      const payout = await DailyPayout.create({
        transaction_id: payout_id,
        payout_id,
        user_id: ancestor.user_id,
        user_name: ancestor.user_name,
        wallet_id: wallet?.wallet_id?.toString() || "",
        pan_verified: isPanVerified,
        pan: wallet?.pan || "",
        rank: wallet?.rank || "",
        contact: ancestor.contact || "",
        mail: ancestor.mail || "",
        account_holder_name: wallet?.account_holder_name || "",
        bank_name: wallet?.bank_name || "",
        account_number: wallet?.account_number || "",
        ifsc_code: wallet?.ifsc_code || "",
        date: formattedDate,
        time: formattedTime,
        available_balance: wallet?.balance || 0,
        amount: totalAmount,
        totalamount: totalAmount,
        withdraw_amount: withdrawAmount,
        reward_amount: rewardAmount,
        tds_amount: tdsAmount,
        admin_charge: adminCharge,
        transaction_type: "Credit",
        status: "pending",
        name: "Pair Star Reward",
        title: tier.tier_name,
        details: `Pair Star Reward — ${tier.tier_name} (${currentPairs} pairs)`,
        from: "system",
        to: ancestor.user_id,
        created_by: "system",
        last_modified_by: "system",
        last_modified_at: istNow,
        created_at: istNow,
      });

      // ── Create History record (shows in transaction history page) ────────
      await History.create({
        transaction_id: payout.payout_id,
        wallet_id: wallet?.wallet_id || "",
        user_id: ancestor.user_id,
        user_name: ancestor.user_name,
        contact: ancestor.contact || "",
        mail: ancestor.mail || "",
        pan_verified: isPanVerified,
        rank: wallet?.rank || "",
        account_holder_name: wallet?.account_holder_name || "",
        bank_name: wallet?.bank_name || "",
        account_number: wallet?.account_number || "",
        ifsc_code: wallet?.ifsc_code || "",
        date: formattedDate,
        time: formattedTime,
        available_balance: wallet?.balance || 0,
        amount: totalAmount,
        total_amount: totalAmount,
        withdraw_amount: withdrawAmount,
        reward_amount: rewardAmount,
        tds_amount: tdsAmount,
        admin_charge: adminCharge,
        transaction_type: "Credit",
        status: "Pending",
        name: "Pair Star Reward",
        title: tier.tier_name,
        details: `Pair Star Reward — ${tier.tier_name} (${currentPairs} pairs)`,
        from: "system",
        to: ancestor.user_id,
        first_payment: false,
        first_order: false,
        advance: false,
        ischecked: false,
        created_by: "system",
        last_modified_by: "system",
        last_modified_at: istNow,
        created_at: istNow,
      });

      // ── Save reward_amount → Score type: "reward" ─────────────────────
      await addRewardScore({
        user_id: ancestor.user_id,
        points: rewardAmount,
        source: "pair_star_reward",
        reference_id: payout.payout_id,
        remarks: `Pair Star Reward — ${tier.tier_name} (${currentPairs} pairs)`,
        type: "reward",
      });

      // ── Save withdraw_amount → Score type: "daily" ────────────────────
      await addRewardScore({
        user_id: ancestor.user_id,
        points: withdrawAmount,
        source: "pair_star_reward",
        reference_id: payout.payout_id,
        remarks: `Pair Star Withdraw — ${tier.tier_name} (${currentPairs} pairs)`,
        type: "daily",
      });

      // ── Update released tier record with payout_id ────────────────────
      await User.updateOne(
        {
          user_id: ancestor.user_id,
          "pair_star_released_tiers.tier_name": tier.tier_name,
        },
        {
          $set: {
            "pair_star_released_tiers.$.payout_id": payout.payout_id,
            "pair_star_released_tiers.$.payout_status": "Pending",
            "pair_star_released_tiers.$.transaction_id": null,
          },
        },
      );

      console.log(
        `[PairStar] ✅ Payout ${payout.payout_id} created — ${ancestor.user_id} — ${tier.tier_name} (₹${totalAmount})`,
      );
    } catch (err) {
      console.error(
        `[PairStar] Payout creation failed for ${ancestor.user_id} — ${tier.tier_name}:`,
        err,
      );
    }

    // ── Fire alerts ───────────────────────────────────────────────────────
    await Alert.create([
      {
        user_id: ancestor.user_id,
        user_name: ancestor.user_name,
        role: "user",
        priority: "high",
        title: `🏆 ${tier.tier_name} Achieved!`,
        description: `Congratulations! You achieved ${tier.tier_name} with ${currentPairs} pairs. Reward: ${tier.reward}`,
        type: "achievement",
        link: "/wallet/rewards",
        read: false,
        date: formattedDate,
        created_at: istNow,
      },
      {
        role: "admin",
        priority: "high",
        title: `🏆 Pair Star: ${tier.tier_name}`,
        description: `User ${ancestor.user_name} (${ancestor.user_id}) achieved ${tier.tier_name} with ${currentPairs} pairs. Reward: ${tier.reward}`,
        link: "/AdminDashboard",
        read: false,
        date: formattedDate,
        created_at: istNow,
      },
    ]);

    // Push to local array so next iteration's guard is accurate without re-reading DB
    releasedTiers.push(releaseRecord);

    console.log(
      `[PairStar] ✅ ${ancestor.user_id} — ${tier.tier_name} released (pairs: ${currentPairs}, at: ${releasedAt})`,
    );
  }
}

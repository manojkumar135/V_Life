/**
 * ONE-TIME PAIR STAR BACKFILL
 *
 * Recomputes left_active_count / right_active_count / pairs for every user
 * with a TreeNode, using the SAME rule as the fixed pairStarEngine.ts / route.ts:
 *
 *   - team member counts only if user_status === "active"
 *     (and not admin-activated, matching the existing status_notes exclusion)
 *   - team member counts only if their own activation timestamp is AFTER
 *     the effective cutoff = laterDate(globalStartDate, ancestor's own activation)
 *
 * This does NOT touch pair_star_released_tiers, does NOT release or revoke
 * any reward, and does NOT create/modify any DailyPayout or History record.
 * It only corrects the stored count fields on User and TreeNode so future
 * reads (admin list, user progress page) show accurate numbers immediately,
 * without waiting for the next activation event to trigger a recount.
 *
 * USAGE:
 *   Dry run (default, no writes):
 *     npx tsx scripts/backfill-pair-star.ts
 *
 *   Live run (writes to DB):
 *     npx tsx scripts/backfill-pair-star.ts --live
 *
 * Always run in dry-run mode first and review the output before running live.
 */

// import { connectDB } from "@/lib/mongodb";
// import { User } from "@/models/user";
// import TreeNode from "@/models/tree";
// import { loadGlobalConfig } from "@/services/pairStarConfig";
// import {
//   istStringsToUTCDate,
//   laterDate,
// } from "@/utils/server/getISTDateTime";

// function parseDDMMYYYY(str: string | null): Date | null {
//   if (!str) return null;
//   const parts = str.split("-");
//   if (parts.length !== 3) return null;
//   const [dd, mm, yyyy] = parts;
//   return new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`);
// }

// async function main() {
//   const isLive = process.argv.includes("--live");

//   console.log(
//     isLive
//       ? "⚠️  LIVE RUN — this will write to User and TreeNode collections."
//       : "🔍 DRY RUN — no writes will be made. Pass --live to apply changes.",
//   );

//   await connectDB();

//   const globalConfig = await loadGlobalConfig();
//   const globalStartDate = parseDDMMYYYY(globalConfig.start_date);

//   // ── Load full tree + all users once ─────────────────────────────────────
//   const allNodes = (await TreeNode.find(
//     {},
//     { user_id: 1, left: 1, right: 1 },
//   ).lean()) as any[];
//   const nodeMap = new Map(allNodes.map((n) => [n.user_id, n]));

//   const allUsers = (await User.find(
//     {},
//     {
//       user_id: 1,
//       user_status: 1,
//       status_notes: 1,
//       activated_date: 1,
//       activated_time: 1,
//       left_active_count: 1,
//       right_active_count: 1,
//       pairs: 1,
//     },
//   ).lean()) as any[];
//   const userMap = new Map(allUsers.map((u) => [u.user_id, u]));

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

//   // Mirrors the activeQuery + filterByDate logic in pairStarEngine.ts / route.ts
//   function countSide(ids: string[], effectiveStartDate: Date | null): number {
//     return ids.filter((id) => {
//       const u = userMap.get(id);
//       if (!u) return false;
//       if (u.user_status !== "active") return false;
//       if (u.status_notes && /admin/i.test(u.status_notes)) return false;

//       if (!effectiveStartDate) return true;

//       if (!u.activated_date || !u.activated_time) return false;

//       const activationDate = istStringsToUTCDate(
//         u.activated_date,
//         u.activated_time,
//       );
//       return !!activationDate && activationDate >= effectiveStartDate;
//     }).length;
//   }

//   let checked = 0;
//   let changed = 0;
//   const mismatches: Array<{
//     user_id: string;
//     before: { left: number; right: number; pairs: number };
//     after: { left: number; right: number; pairs: number };
//     hadReleasedTiers: boolean;
//   }> = [];

//   for (const node of allNodes) {
//     checked++;

//     const rootUser = userMap.get(node.user_id);
//     const ancestorCutoff = rootUser
//       ? istStringsToUTCDate(rootUser.activated_date, rootUser.activated_time)
//       : null;
//     const effectiveStartDate = laterDate(globalStartDate, ancestorCutoff);

//     const leftIds = subtreeIds(node.left);
//     const rightIds = subtreeIds(node.right);

//     const leftCount = countSide(leftIds, effectiveStartDate);
//     const rightCount = countSide(rightIds, effectiveStartDate);
//     const pairs = Math.min(leftCount, rightCount);

//     const before = {
//       left: rootUser?.left_active_count ?? 0,
//       right: rootUser?.right_active_count ?? 0,
//       pairs: rootUser?.pairs ?? 0,
//     };
//     const after = { left: leftCount, right: rightCount, pairs };

//     const isDifferent =
//       before.left !== after.left ||
//       before.right !== after.right ||
//       before.pairs !== after.pairs;

//     if (isDifferent) {
//       changed++;
//       const hadReleasedTiers = !!(
//         rootUser &&
//         (await User.exists({
//           user_id: node.user_id,
//           pair_star_released_tiers: { $exists: true, $ne: [] },
//         }))
//       );

//       mismatches.push({
//         user_id: node.user_id,
//         before,
//         after,
//         hadReleasedTiers: !!hadReleasedTiers,
//       });

//       console.log(
//         `[${isDifferent ? "CHANGE" : "SAME"}] ${node.user_id} — ` +
//           `left ${before.left}→${after.left}, right ${before.right}→${after.right}, ` +
//           `pairs ${before.pairs}→${after.pairs}` +
//           (hadReleasedTiers ? "  ⚠️ HAS RELEASED TIERS — review before/if downgrading" : ""),
//       );

//       if (isLive) {
//         await Promise.all([
//           User.updateOne(
//             { user_id: node.user_id },
//             {
//               $set: {
//                 left_active_count: leftCount,
//                 right_active_count: rightCount,
//                 pairs,
//               },
//             },
//           ),
//           TreeNode.updateOne(
//             { user_id: node.user_id },
//             {
//               $set: {
//                 left_active_count: leftCount,
//                 right_active_count: rightCount,
//                 pairs,
//               },
//             },
//           ),
//         ]);
//       }
//     }
//   }

//   console.log("──────────────────────────────────────────");
//   console.log(`Checked: ${checked} users with TreeNode`);
//   console.log(`${isLive ? "Updated" : "Would update"}: ${changed} users`);
//   console.log(
//     `Users with released tiers among the changed set: ${
//       mismatches.filter((m) => m.hadReleasedTiers).length
//     } — review these manually before deciding whether to adjust pair_star_released_tiers or payouts. This script did NOT touch them.`,
//   );
//   console.log(isLive ? "✅ Live backfill complete." : "🔍 Dry run complete — re-run with --live to apply.");

//   process.exit(0);
// }

// main().catch((err) => {
//   console.error("Backfill failed:", err);
//   process.exit(1);
// });
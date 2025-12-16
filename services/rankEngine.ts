// services/rankEngine.ts

import { Types } from "mongoose";
import { User } from "@/models/user";
import TreeNode from "@/models/tree";
import { Rank } from "@/models/rank";
import { Wallet } from "@/models/wallet";
import { Login } from "@/models/login";
import { History } from "@/models/history";

/* ===================== TYPES ===================== */

interface HistoryLean {
  _id: Types.ObjectId;
}

interface RankQualifiedUser {
  user_id: string;
  user_name: string;
  team: "left" | "right";
  payment_id: Types.ObjectId;
}

interface RankRecordLean {
  ranks?: {
    [key: string]: {
      qualified_users?: RankQualifiedUser[];
    };
  };
}

/* ===================== HELPERS ===================== */

async function getUserTeam(
  rootUserId: string,
  targetUserId: string
): Promise<"left" | "right" | "any"> {
  const allNodes = await TreeNode.find({}).lean();
  const nodeMap = new Map(allNodes.map((n: any) => [n.user_id, n]));

  const rootNode = nodeMap.get(rootUserId);
  if (!rootNode) return "any";

  if (rootNode.left === targetUserId) return "left";
  if (rootNode.right === targetUserId) return "right";

  const queue = [
    { nodeId: rootNode.left, team: "left" as const },
    { nodeId: rootNode.right, team: "right" as const },
  ];

  while (queue.length) {
    const { nodeId, team } = queue.shift()!;
    if (!nodeId) continue;
    if (nodeId === targetUserId) return team;

    const child = nodeMap.get(nodeId);
    if (child) {
      queue.push({ nodeId: child.left, team });
      queue.push({ nodeId: child.right, team });
    }
  }

  return "any";
}

async function updateUserRank(
  userId: string,
  rankLevel: number,
  qualifiedUsers: RankQualifiedUser[]
) {
  const rankKey = `${rankLevel}_star`;

  await Rank.findOneAndUpdate(
    { user_id: userId },
    {
      $set: {
        [`ranks.${rankKey}`]: {
          qualified_users: qualifiedUsers,
          achieved_at: new Date(),
        },
      },
    },
    { upsert: true }
  );

  const updateData = {
    rank: String(rankLevel),
    club: "Star",
    last_modified_at: new Date(),
  };

  await Promise.all([
    User.updateOne({ user_id: userId }, { $set: updateData }),
    Login.updateOne({ user_id: userId }, { $set: updateData }),
    TreeNode.updateOne({ user_id: userId }, { $set: updateData }),
    Wallet.updateOne({ user_id: userId }, { $set: updateData }),
  ]);
}

/* ===================== MAIN ENGINE ===================== */

export async function checkAndUpgradeRank(user: any) {
  let currentRank = parseInt(user.rank === "none" ? "0" : user.rank);
  if (currentRank >= 5) return;

  // STEP 1 — Paid directs
  const directs = await User.find({ referBy: user.user_id }).lean();
  const paidDirects: RankQualifiedUser[] = [];

  for (const direct of directs) {
    const paid = (await History.findOne({
      user_id: direct.user_id,
      first_order: true,
    }).lean()) as HistoryLean | null;

    if (!paid?._id) continue;

    const team = await getUserTeam(user.user_id, direct.user_id);
    if (team === "left" || team === "right") {
      paidDirects.push({
        user_id: direct.user_id,
        user_name: direct.user_name,
        team,
        payment_id: paid._id,
      });
    }
  }

  // STEP 2 — Pools
  let leftPool = paidDirects.filter((u) => u.team === "left");
  let rightPool = paidDirects.filter((u) => u.team === "right");

  // STEP 3 — Remove used users
  const rankRecord = (await Rank.findOne({
    user_id: user.user_id,
  }).lean()) as RankRecordLean | null;

  const usedUsers: string[] = [];

  if (rankRecord?.ranks) {
    Object.values(rankRecord.ranks).forEach((r) => {
      r.qualified_users?.forEach((u) => usedUsers.push(u.user_id));
    });
  }

  leftPool = leftPool.filter((u) => !usedUsers.includes(u.user_id));
  rightPool = rightPool.filter((u) => !usedUsers.includes(u.user_id));

  // STEP 4 — Assign ranks
  for (let nextRank = currentRank + 1; nextRank <= 5; nextRank++) {
    if (leftPool.length < 1 || rightPool.length < 1) break;

    const left = leftPool.shift()!;
    const right = rightPool.shift()!;

    const qualifiedUsers: RankQualifiedUser[] = [
      { ...left, team: "left" },
      { ...right, team: "right" },
    ];

    await updateUserRank(user.user_id, nextRank, qualifiedUsers);
    currentRank = nextRank;
  }
}

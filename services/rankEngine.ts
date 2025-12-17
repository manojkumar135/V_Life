// services/rankEngine.ts

import { User } from "@/models/user";
import TreeNode from "@/models/tree";
import { Rank } from "@/models/rank";
import { Wallet } from "@/models/wallet";
import { Login } from "@/models/login";
import { History } from "@/models/history";
import { Alert } from "@/models/alert";

/* -------------------------------------------------------------
   Helper: Detect whether targetUserId is in left/right team
------------------------------------------------------------- */
async function getUserTeam(
  rootUserId: string,
  targetUserId: string
): Promise<"left" | "right" | "any"> {
  if (!rootUserId || !targetUserId) return "any";

  const allNodes = (await TreeNode.find({}).lean()) as any[];
  const nodeMap = new Map(allNodes.map((n) => [n.user_id, n]));

  const rootNode = nodeMap.get(rootUserId);
  if (!rootNode) return "any";

  if (rootNode.left === targetUserId) return "left";
  if (rootNode.right === targetUserId) return "right";

  const queue: { nodeId?: string; team: "left" | "right" }[] = [
    { nodeId: rootNode.left, team: "left" },
    { nodeId: rootNode.right, team: "right" },
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

/* -------------------------------------------------------------
   UTIL: Update rank across all collections
------------------------------------------------------------- */
async function updateUserRank(
  userId: string,
  rankLevel: number,
  qualifiedUsers: any[]
) {
  const rankKey = `${rankLevel}_star`;

  await Rank.findOneAndUpdate(
    { user_id: userId },
    {
      $set: {
        [`ranks.${rankKey}.qualified_users`]: qualifiedUsers,
        [`ranks.${rankKey}.achieved_at`]: new Date(),
      },
    },
    { upsert: true }
  );

  const updatePayload = {
    rank: String(rankLevel),
    club: "Star",
    last_modified_at: new Date(),
  };

  await Promise.all([
    User.updateOne({ user_id: userId }, { $set: updatePayload }),
    Login.updateOne({ user_id: userId }, { $set: updatePayload }),
    TreeNode.updateOne({ user_id: userId }, { $set: updatePayload }),
    Wallet.updateOne({ user_id: userId }, { $set: updatePayload }),
  ]);
}

/* -------------------------------------------------------------
   RANK ENGINE — FIRST ORDER BASED (FINAL + ALERT)
------------------------------------------------------------- */
export async function checkAndUpgradeRank(user: any) {
  console.log(`🔎 [RANK] Checking ${user.user_id}`);

  const oldRank = user.rank ?? "none";
  let currentRank = parseInt(oldRank === "none" ? "0" : oldRank);

  if (currentRank >= 5) return;

  /* -------------------------------------------------------------
     STEP 1 — FETCH PAID DIRECTS (FIRST ORDER COMPLETED)
  ------------------------------------------------------------- */
  const directs = (await User.find({
    referBy: user.user_id,
  }).lean()) as any[];

  const paidDirects: any[] = [];

  for (const direct of directs) {
    const paid = (await History.findOne({
      user_id: direct.user_id,
      first_order: true,
      first_payment: true,
      status: "Completed",
    }).lean()) as { _id: any } | null;

    if (!paid) continue;

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

  /* -------------------------------------------------------------
     STEP 2 — SPLIT POOLS
  ------------------------------------------------------------- */
  let leftPool = paidDirects.filter((u) => u.team === "left");
  let rightPool = paidDirects.filter((u) => u.team === "right");

  /* -------------------------------------------------------------
     STEP 3 — REMOVE USED USERS
  ------------------------------------------------------------- */
  const rankRecord = (await Rank.findOne({
    user_id: user.user_id,
  }).lean()) as
    | {
        ranks?: Record<
          string,
          { qualified_users?: { user_id: string }[] }
        >;
      }
    | null;

  const usedUsers: string[] = [];

  if (rankRecord?.ranks) {
    Object.values(rankRecord.ranks).forEach((rank) => {
      rank?.qualified_users?.forEach((u) =>
        usedUsers.push(u.user_id)
      );
    });
  }

  leftPool = leftPool.filter((u) => !usedUsers.includes(u.user_id));
  rightPool = rightPool.filter((u) => !usedUsers.includes(u.user_id));

  /* -------------------------------------------------------------
     STEP 4 — ASSIGN RANKS
  ------------------------------------------------------------- */
  for (let nextRank = currentRank + 1; nextRank <= 5; nextRank++) {
    const rankKey = `${nextRank}_star`;

    if (leftPool.length < 1 || rightPool.length < 1) {
      await Rank.findOneAndUpdate(
        { user_id: user.user_id },
        {
          $set: {
            [`ranks.${rankKey}.unused_left`]: leftPool,
            [`ranks.${rankKey}.unused_right`]: rightPool,
          },
        },
        { upsert: true }
      );
      break;
    }

    const left = leftPool.shift()!;
    const right = rightPool.shift()!;

    const qualifiedUsers = [
      { ...left, team: "left" },
      { ...right, team: "right" },
    ];

    await Rank.findOneAndUpdate(
      { user_id: user.user_id },
      {
        $set: {
          [`ranks.${rankKey}.qualified_users`]: qualifiedUsers,
          [`ranks.${rankKey}.achieved_at`]: new Date(),
          [`ranks.${rankKey}.unused_left`]: leftPool,
          [`ranks.${rankKey}.unused_right`]: rightPool,
        },
      },
      { upsert: true }
    );

    await updateUserRank(user.user_id, nextRank, qualifiedUsers);
    currentRank = nextRank;
  }

  /* -------------------------------------------------------------
     STEP 5 — EXTRA USERS
  ------------------------------------------------------------- */
  await Rank.findOneAndUpdate(
    { user_id: user.user_id },
    {
      $set: {
        "extra.qualified_users": [...leftPool, ...rightPool],
      },
    },
    { upsert: true }
  );

  /* -------------------------------------------------------------
     STEP 6 — CREATE ALERT IF RANK CHANGED
  ------------------------------------------------------------- */
  const newRank = String(currentRank);

  if (newRank !== oldRank && currentRank > 0) {
    console.info("🏆 [RANK] Rank upgraded", {
      user: user.user_id,
      from: oldRank,
      to: newRank,
    });

    await Alert.create({
      user_id: user.user_id,
      user_name: user.user_name || "",
      user_status: user.user_status,
      role: "user",
      priority: "high",
      title: "🎖️ Rank Achieved!",
      description: `Congratulations ${user.user_name}! You achieved Rank ${newRank}.`,
      type: "achievement",
      link: "/dashboards",
      date: new Date().toLocaleDateString("en-GB").split("/").join("-"),
    });
  }

  console.log(`✅ [RANK] Final rank for ${user.user_id}: ${currentRank}`);
}

// services/rankEngine.ts

import { User } from "@/models/user";
import TreeNode from "@/models/tree";
import { Rank } from "@/models/rank";
import { History } from "@/models/history";
import { Alert } from "@/models/alert";

/* -------------------------------------------------------------
   Helper: Detect left / right team
------------------------------------------------------------- */
async function getUserTeam(
  rootUserId: string,
  targetUserId: string
): Promise<"left" | "right" | "any"> {
  if (!rootUserId || !targetUserId) return "any";

  const allNodes = await TreeNode.find({}).lean();
  const nodeMap = new Map(allNodes.map((n: any) => [n.user_id, n]));

  const root = nodeMap.get(rootUserId);
  if (!root) return "any";

  if (root.left === targetUserId) return "left";
  if (root.right === targetUserId) return "right";

  const queue = [
    { id: root.left, team: "left" as const },
    { id: root.right, team: "right" as const },
  ];

  while (queue.length) {
    const { id, team } = queue.shift()!;
    if (!id) continue;
    if (id === targetUserId) return team;

    const node = nodeMap.get(id);
    if (node) {
      queue.push({ id: node.left, team });
      queue.push({ id: node.right, team });
    }
  }

  return "any";
}

/* -------------------------------------------------------------
   Persist star rank
------------------------------------------------------------- */
async function persistStarRank(
  userId: string,
  star: number,
  qualifiedUsers: any[]
) {
  const key = `${star}_star`;

  await Rank.findOneAndUpdate(
    { user_id: userId },
    {
      $set: {
        [`ranks.${key}.qualified_users`]: qualifiedUsers,
        [`ranks.${key}.achieved_at`]: new Date(),
      },
    },
    { upsert: true }
  );
}

/* -------------------------------------------------------------
   ⭐ STAR ENGINE — PV BASED (OPTION B)
------------------------------------------------------------- */
export async function checkAndUpgradeRank(user: any): Promise<number> {
  /**
   * 🚫 OPTION B:
   * Once user enters Executive or Diamond club,
   * stop star calculation completely.
   */
  if (user.club === "Executive" || user.club === "Diamond") {
    return parseInt(user.rank || "0");
  }

  const currentStar = parseInt(user.rank || "0");
  if (currentStar >= 5) return currentStar;

  /* 1️⃣ Fetch direct users */
  const directs = await User.find({ referBy: user.user_id })
    .select("user_id user_name pv")
    .lean();

  const paidUsers: any[] = [];

  for (const d of directs) {
    if (!d.pv || d.pv <= 0) continue;

    const paid = await History.findOne({
      user_id: d.user_id,
      first_order: true,
      first_payment: true,
      status: "Completed",
    }).lean();

    if (!paid) continue;

    const team = await getUserTeam(user.user_id, d.user_id);
    if (team === "left" || team === "right") {
      paidUsers.push({
        user_id: d.user_id,
        user_name: d.user_name,
        team,
        pv: d.pv,
      });
    }
  }

  /* 2️⃣ Remove already used users */
  const rankDoc = (await Rank.findOne({ user_id: user.user_id }).lean()) as any;
  const used = new Set<string>();

  if (rankDoc?.ranks) {
    Object.values(rankDoc.ranks).forEach((r: any) => {
      r?.qualified_users?.forEach((u: any) => used.add(u.user_id));
    });
  }

  let leftPool = paidUsers.filter(
    (u) => u.team === "left" && !used.has(u.user_id)
  );
  let rightPool = paidUsers.filter(
    (u) => u.team === "right" && !used.has(u.user_id)
  );

  let star = currentStar;
  let enteredStarClub = false;

  /* 3️⃣ Assign stars (100 PV per side) */
  while (star < 5) {
    let lPV = 0,
      rPV = 0;
    const lUsed: any[] = [];
    const rUsed: any[] = [];

    for (const u of leftPool) {
      if (lPV >= 100) break;
      lPV += u.pv;
      lUsed.push(u);
    }

    for (const u of rightPool) {
      if (rPV >= 100) break;
      rPV += u.pv;
      rUsed.push(u);
    }

    if (lPV < 100 || rPV < 100) break;

    star++;

    if (star === 1 && currentStar === 0) {
      enteredStarClub = true;
    }

    const qualified = [
      ...lUsed.map((u) => ({
        user_id: u.user_id,
        user_name: u.user_name,
        team: "left",
      })),
      ...rUsed.map((u) => ({
        user_id: u.user_id,
        user_name: u.user_name,
        team: "right",
      })),
    ];

    await persistStarRank(user.user_id, star, qualified);

    leftPool = leftPool.filter((u) => !lUsed.includes(u));
    rightPool = rightPool.filter((u) => !rUsed.includes(u));
  }

  /* 4️⃣ After 5★ → extra */
  if (star >= 5) {
    await Rank.findOneAndUpdate(
      { user_id: user.user_id },
      { $set: { "extra.qualified_users": [...leftPool, ...rightPool] } },
      { upsert: true }
    );
  }

  /* 5️⃣ Alert — ONLY ON STAR CLUB ENTRY */
  if (enteredStarClub) {
    await Alert.create({
      user_id: user.user_id,
      user_name: user.user_name,
      role: "user",
      priority: "high",
      title: "⭐ Welcome to Star Club!",
      description: "Congratulations! You have entered the Star Club.",
      type: "achievement",
      link: "/dashboards",
      date: new Date().toISOString().split("T")[0],
    });
  }

  return star;
}

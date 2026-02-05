import { User } from "@/models/user";
import TreeNode from "@/models/tree";
import { Rank } from "@/models/rank";
import { History } from "@/models/history";
import { Alert } from "@/models/alert";
import { Login } from "@/models/login";
import { Wallet } from "@/models/wallet";

/* -------------------------------------------------------------
   Helper: Detect left / right team
------------------------------------------------------------- */
async function getUserTeam(
  rootUserId: string,
  targetUserId: string,
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
   ⭐ STAR ENGINE (WITH UNUSED / QUALIFIED LOGIC)
------------------------------------------------------------- */
export async function checkAndUpgradeRank(user: any): Promise<number> {
  /**
   * STOP STAR ENGINE once Executive or Diamond reached
   */
  if (user.club === "Executive" || user.club === "Diamond") {
    return user.rank && !isNaN(Number(user.rank)) ? Number(user.rank) : 0;
  }

  /* ✅ FIX: handle rank === "none" */
  const currentStar =
    user.rank && !isNaN(Number(user.rank)) ? Number(user.rank) : 0;

  if (currentStar >= 5) return currentStar;

  /* -----------------------------------------------------------
     1️⃣ ENSURE RANK DOCUMENT EXISTS
  ----------------------------------------------------------- */
  await Rank.findOneAndUpdate(
    { user_id: user.user_id },
    {
      $setOnInsert: {
        user_id: user.user_id,
        createdAt: new Date(),
        ranks: {
          "1_star": { qualified_users: [], unused_left: [], unused_right: [] },
          "2_star": { qualified_users: [], unused_left: [], unused_right: [] },
          "3_star": { qualified_users: [], unused_left: [], unused_right: [] },
          "4_star": { qualified_users: [], unused_left: [], unused_right: [] },
          "5_star": { qualified_users: [], unused_left: [], unused_right: [] },
        },
        extra: { qualified_users: [] },
      },
    },
    { upsert: true },
  );

  /* -----------------------------------------------------------
     2️⃣ FETCH PAID DIRECT USERS (ORDER + ADVANCE)
  ----------------------------------------------------------- */
  const directs = await User.find({ referBy: user.user_id })
    .select("user_id user_name pv")
    .lean();

  const paidUsers: any[] = [];

  for (const d of directs) {
    if (!d.pv || d.pv <= 0) continue;

    const paid = await History.findOne({
      user_id: d.user_id,
      status: "Completed",
      first_payment: true,
      $or: [{ first_order: true }, { advance: true }],
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

  /* -----------------------------------------------------------
     3️⃣ REMOVE ALREADY USED USERS
  ----------------------------------------------------------- */
  const rankDoc: any = await Rank.findOne({ user_id: user.user_id }).lean();
  const used = new Set<string>();

  if (rankDoc?.ranks) {
    Object.values(rankDoc.ranks).forEach((r: any) => {
      r?.qualified_users?.forEach((u: any) => used.add(u.user_id));
    });
  }

  let leftPool = paidUsers.filter(
    (u) => u.team === "left" && !used.has(u.user_id),
  );
  let rightPool = paidUsers.filter(
    (u) => u.team === "right" && !used.has(u.user_id),
  );

  /* -----------------------------------------------------------
     4️⃣ SAVE UNUSED USERS (BEFORE STAR)
  ----------------------------------------------------------- */
  if (currentStar === 0) {
    await Rank.updateOne(
      { user_id: user.user_id },
      {
        $set: {
          "ranks.1_star.unused_left": leftPool.map((u) => ({
            user_id: u.user_id,
            user_name: u.user_name,
            pv: u.pv,
          })),
          "ranks.1_star.unused_right": rightPool.map((u) => ({
            user_id: u.user_id,
            user_name: u.user_name,
            pv: u.pv,
          })),
        },
      },
    );
  }

  /* -----------------------------------------------------------
     5️⃣ STAR ASSIGNMENT LOOP (100 PV EACH SIDE)
  ----------------------------------------------------------- */
  let star = currentStar;
  let enteredStarClub = false;

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

    await Rank.updateOne(
      { user_id: user.user_id },
      {
        $set: {
          [`ranks.${star}_star.qualified_users`]: [
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
          ],
          [`ranks.${star}_star.achieved_at`]: new Date(),
          [`ranks.${star}_star.unused_left`]: leftPool.filter(
            (u) => !lUsed.includes(u),
          ),
          [`ranks.${star}_star.unused_right`]: rightPool.filter(
            (u) => !rUsed.includes(u),
          ),
        },
      },
    );

    leftPool = leftPool.filter((u) => !lUsed.includes(u));
    rightPool = rightPool.filter((u) => !rUsed.includes(u));
  }

  /* -----------------------------------------------------------
     6️⃣ AFTER 5★ → EXTRA
  ----------------------------------------------------------- */
  if (star >= 5) {
    await Rank.updateOne(
      { user_id: user.user_id },
      {
        $set: {
          "extra.qualified_users": [...leftPool, ...rightPool],
        },
      },
    );
  }

  /* -----------------------------------------------------------
     7️⃣ UPDATE USER / LOGIN / TREE / WALLET BEFORE ALERT
  ----------------------------------------------------------- */
  if (enteredStarClub) {
    const update = {
      club: "Star",
      rank: String(star),
      last_modified_at: new Date(),
    };

    await User.updateOne({ user_id: user.user_id }, { $set: update });
    await Login.updateOne({ user_id: user.user_id }, { $set: update });
    await TreeNode.updateOne({ user_id: user.user_id }, { $set: update });
    await Wallet.updateOne({ user_id: user.user_id }, { $set: update });
  }

  /* -----------------------------------------------------------
     8️⃣ ALERT ON FIRST STAR
  ----------------------------------------------------------- */
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

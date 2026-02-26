import { User } from "@/models/user";
import { Rank } from "@/models/rank";
import { History } from "@/models/history";
import { Alert } from "@/models/alert";
import { Login } from "@/models/login";
import { Wallet } from "@/models/wallet";
import TreeNode from "@/models/tree";
import { loadTreeMap, getUserTeamFromMap } from "@/services/getTeam";
import { getDirectPV } from "@/services/directPV";
import mongoose from "mongoose";


/* -------------------------------------------------------------
   ⭐ STAR ENGINE (FINAL – CLEAN & BUSINESS SAFE)
------------------------------------------------------------- */
export async function checkAndUpgradeRank(
  user: any,
  session?: mongoose.ClientSession
): Promise<number> {
  // console.log(user,"from rank engine")
  if (
    user.club === "Executive" ||
    user.club === "Diamond" ||
    user.club === "Royality"
  ) {
    return user.rank && !isNaN(Number(user.rank))
      ? Number(user.rank)
      : 0;
  }

  const currentStar =
    user.rank && !isNaN(Number(user.rank))
      ? Number(user.rank)
      : 0;

  /* ===========================================================
     🔥 EXECUTIVE FAST TRACK CHECK (500 PV EACH SIDE)
  =========================================================== */
  const { leftDirectPV, rightDirectPV } =
    await getDirectPV(user.user_id);
    console.log(leftDirectPV, rightDirectPV,"from rank engine")

  if (leftDirectPV >= 500 && rightDirectPV >= 500) {
    await User.updateOne(
      { user_id: user.user_id },
      { $set: { club: "Executive", rank: "Bronze" } }
    );
    await Login.updateOne(
      { user_id: user.user_id },
      { $set: { club: "Executive", rank: "Bronze" } }
    );
    await TreeNode.updateOne(
      { user_id: user.user_id },
      { $set: { club: "Executive", rank: "Bronze" } }
    );
    await Wallet.updateOne(
      { user_id: user.user_id },
      { $set: { club: "Executive", rank: "Bronze" } }
    );

    return 5;
  }

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
          "1_star": { qualified_users: [] },
          "2_star": { qualified_users: [] },
          "3_star": { qualified_users: [] },
          "4_star": { qualified_users: [] },
          "5_star": { qualified_users: [] },
        },
        extra: { qualified_users: [] },
      },
    },
    { upsert: true }
  );

  /* -----------------------------------------------------------
     2️⃣ LOAD TREE
  ----------------------------------------------------------- */
  const nodeMap = await loadTreeMap();

/* -----------------------------------------------------------
   3️⃣ FETCH PAID DIRECTS (FIXED — USE paid_directs)
----------------------------------------------------------- */

// reload fresh user to ensure latest paid_directs
const freshUser = (await User.findOne({
  user_id: user.user_id,
})
.select("paid_directs")
.lean()) as any;

const paidDirectIds: string[] = freshUser?.paid_directs ?? [];

const directs = await User.find(
  { user_id: { $in: paidDirectIds } },
  { user_id: 1, user_name: 1, pv: 1 }
).lean();

const paidUsers: any[] = [];

for (const d of directs) {

  if (!d.pv || d.pv <= 0) continue;

  const team = getUserTeamFromMap(
    user.user_id,
    d.user_id,
    nodeMap
  );

  if (team === "left" || team === "right") {
    paidUsers.push({
      user_id: d.user_id,
      user_name: d.user_name,
      team,
      pv: d.pv,
    });
  }
}

console.log(paidUsers, "rank engine FIXED");

  /* -----------------------------------------------------------
     4️⃣ REMOVE PREVIOUSLY USED USERS
  ----------------------------------------------------------- */
  const rankDoc: any = await Rank.findOne({
    user_id: user.user_id,
  }).lean();

  const used = new Set<string>();

  if (rankDoc?.ranks) {
    Object.values(rankDoc.ranks).forEach((r: any) => {
      r?.qualified_users?.forEach((u: any) =>
        used.add(u.user_id)
      );
    });
  }

  let leftPool = paidUsers.filter(
    (u) => u.team === "left" && !used.has(u.user_id)
  );

  let rightPool = paidUsers.filter(
    (u) => u.team === "right" && !used.has(u.user_id)
  );

  /* -----------------------------------------------------------
     5️⃣ STAR LOOP (100 PV EACH SIDE)
  ----------------------------------------------------------- */
  let star = currentStar;
  let enteredStarClub = false;

  while (star < 5) {
    let lPV = 0;
    let rPV = 0;

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
        },
      }
    );

    const lIds = new Set(lUsed.map((u) => u.user_id));
    const rIds = new Set(rUsed.map((u) => u.user_id));

    leftPool = leftPool.filter(
      (u) => !lIds.has(u.user_id)
    );
    rightPool = rightPool.filter(
      (u) => !rIds.has(u.user_id)
    );
  }

  /* -----------------------------------------------------------
     6️⃣ AFTER 5★ → MOVE TO EXTRA
  ----------------------------------------------------------- */
  if (star >= 5) {
    await Rank.updateOne(
      { user_id: user.user_id },
      {
        $set: {
          "extra.qualified_users": [
            ...leftPool,
            ...rightPool,
          ],
        },
      }
    );
  }

  /* -----------------------------------------------------------
     7️⃣ UPDATE USER IF STAR INCREASED
  ----------------------------------------------------------- */
  if (star > currentStar) {
    const update = {
      club: "Star",
      rank: String(star),
      last_modified_at: new Date(),
    };

    await User.updateOne(
      { user_id: user.user_id },
      { $set: update }
    );
    await Login.updateOne(
      { user_id: user.user_id },
      { $set: update }
    );
    await TreeNode.updateOne(
      { user_id: user.user_id },
      { $set: update }
    );
    await Wallet.updateOne(
      { user_id: user.user_id },
      { $set: update }
    );
  }

  if (enteredStarClub) {
    await Alert.create({
      user_id: user.user_id,
      user_name: user.user_name,
      role: "user",
      priority: "high",
      title: "⭐ Welcome to Star Club!",
      description:
        "Congratulations! You have entered the Star Club.",
      type: "achievement",
      link: "/dashboards",
      date: new Date()
        .toISOString()
        .split("T")[0],
    });
  }

  return star;
}

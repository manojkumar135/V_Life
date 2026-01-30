// services/clubrank.ts

import { User } from "@/models/user";
import { connectDB } from "@/lib/mongodb";
import { Login } from "@/models/login";
import TreeNode from "@/models/tree";
import mongoose from "mongoose";

import { getInfinityBV } from "@/services/infinityBV";
import { getDirectPV } from "@/services/directPV";
import { checkAndUpgradeRank } from "@/services/rankEngine";

/* =============================================================
   CLUB & NAMED RANK ENGINE (FINAL – EXACT BUSINESS RULES)
============================================================= */
export async function updateClub(
  user_id: string,
  totalPayout: number
) {
  await connectDB();
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await User.findOne({ user_id }).session(session);
    if (!user) return null;

    let newClub = user.club;
    let newRank = user.rank;

    /* ⭐ STAR ENGINE — ONLY BEFORE EXECUTIVE */
    let starRank = 0;

    if (user.club !== "Executive" && user.club !== "Diamond" && user.club !== "Royalty") {
      starRank = await checkAndUpgradeRank(user);

      if (starRank >= 1 && !user.club) {
        newClub = "Star";
        newRank = String(starRank);
      }
    }

    /* FETCH TEAM DATA */
    const { leftDirectPV, rightDirectPV } = await getDirectPV(user_id);
    const { leftInfinityBV, rightInfinityBV } = await getInfinityBV(user_id);

    /* =========================================================
       👑 ROYALTY CLUB — CHECK FIRST (50 CR)
    ========================================================= */
    if (
      leftDirectPV >= 1000 &&
      rightDirectPV >= 1000 &&
      totalPayout >= 50_00_00_000 &&
      leftInfinityBV >= 50_00_00_000 &&
      rightInfinityBV >= 50_00_00_000
    ) {
      newClub = "Royalty";
      newRank = "Royalty";
    }

    /* =========================================================
       💎 DIAMOND CLUB — 1000 PV DIRECT
    ========================================================= */
    else if (leftDirectPV >= 1000 && rightDirectPV >= 1000) {
      newClub = "Diamond";

      if (
        totalPayout >= 25_00_00_000 &&
        leftInfinityBV >= 25_00_00_000 &&
        rightInfinityBV >= 25_00_00_000
      ) {
        newRank = "Royal Crown Diamond";
      }

      else if (
        totalPayout >= 10_00_00_000 &&
        leftInfinityBV >= 10_00_00_000 &&
        rightInfinityBV >= 10_00_00_000
      ) {
        newRank = "Crown Diamond";
      }

      else if (
        totalPayout >= 5_00_00_000 &&
        leftInfinityBV >= 5_00_00_000 &&
        rightInfinityBV >= 5_00_00_000
      ) {
        newRank = "Black Diamond";
      }

      else if (
        totalPayout >= 1_00_00_000 &&
        leftInfinityBV >= 1_00_00_000 &&
        rightInfinityBV >= 1_00_00_000
      ) {
        newRank = "Blue Diamond";
      }

      else if (
        totalPayout >= 50_00_000 &&
        leftInfinityBV >= 50_00_000 &&
        rightInfinityBV >= 50_00_000
      ) {
        newRank = "Diamond";
      }
    }

    /* =========================================================
       🟦 EXECUTIVE CLUB — 500 PV DIRECT
    ========================================================= */
    else if (leftDirectPV >= 500 && rightDirectPV >= 500) {
      newClub = "Executive";

      if (
        totalPayout >= 25_00_000 &&
        leftInfinityBV >= 25_00_000 &&
        rightInfinityBV >= 25_00_000
      ) newRank = "Platinum";

      else if (
        totalPayout >= 10_00_000 &&
        leftInfinityBV >= 10_00_000 &&
        rightInfinityBV >= 10_00_000
      ) newRank = "Emerald";

      else if (
        totalPayout >= 5_00_000 &&
        leftInfinityBV >= 5_00_000 &&
        rightInfinityBV >= 5_00_000
      ) newRank = "Gold";

      else if (
        totalPayout >= 1_00_000 &&
        leftInfinityBV >= 1_00_000 &&
        rightInfinityBV >= 1_00_000
      ) newRank = "Silver";

      else newRank = "Bronze";
    }

    /* 🚫 NO CHANGE */
    if (newClub === user.club && newRank === user.rank) {
      await session.abortTransaction();
      return null;
    }

    const update = {
      club: newClub,
      rank: newRank,
      last_modified_at: new Date(),
    };

    await User.updateOne({ user_id }, { $set: update }, { session });
    await Login.updateOne({ user_id }, { $set: update }, { session });
    await TreeNode.updateOne({ user_id }, { $set: update }, { session });

    await session.commitTransaction();
    return { starRank, newClub, newRank };

  } catch (e) {
    await session.abortTransaction();
    throw e;
  } finally {
    session.endSession();
  }
}

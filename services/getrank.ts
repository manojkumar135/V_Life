import { User } from "@/models/user";
import { Rank } from "@/models/rank";
import { connectDB } from "@/lib/mongodb";
import { Login } from "@/models/login";
import TreeNode from "@/models/tree";
import mongoose from "mongoose";



// ============================
// 🔐 TYPE DEFINITIONS
// ============================

interface QualifiedUser {
  user_id: string;
  user_name: string;
  team: "left" | "right" | "any";
  payment_id?: string;
}

interface RankLevel {
  qualified_users: QualifiedUser[];
  unused_left: any[];
  unused_right: any[];
  achieved_at?: Date;
}

interface RankDoc {
  user_id: string;
  user_name: string;
  ranks: {
    "1_star": RankLevel;
    "2_star": RankLevel;
    "3_star": RankLevel;
    "4_star": RankLevel;
    "5_star": RankLevel;
  };
  extra?: {
    qualified_users: any[];
  };
}

// =============================================================
// ⭐ 1 — CHECK 5 STAR RANK (Binary Qualification)
// =============================================================
export async function checkIs5StarRank(user_id: string): Promise<boolean> {
  await connectDB();

  const rankDoc = await Rank.findOne({ user_id }).lean<RankDoc | null>();

  // no rank structure / no 5-star key
  if (!rankDoc?.ranks?.["5_star"]) return false;

  const fiveStar = rankDoc.ranks["5_star"];

  // already achieved
  if (fiveStar.achieved_at) return true;

  if (!Array.isArray(fiveStar.qualified_users)) return false;

  // count binary legs
  const left = fiveStar.qualified_users.filter(
    (u: QualifiedUser) => u.team === "left"
  ).length;

  const right = fiveStar.qualified_users.filter(
    (u: QualifiedUser) => u.team === "right"
  ).length;

  // ⭐⭐⭐⭐⭐ REQUIREMENT: 5 left + 5 right
  return left >= 5 && right >= 5;
}

// =============================================================
// 🏆 2 — UPDATE CLUB BASED ON TOTAL PAYOUT
// =============================================================
export async function updateClub(
  user_id: string,
  totalPayout: number,
  isFiveStar: boolean
) {
  await connectDB();

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await User.findOne({ user_id }).session(session);
    if (!user) return null;

    const currentRank = user.rank;
    const currentClub = user.club;

    let newRank = currentRank;
    let newClub = currentClub;

    /** -------------------------
     *   BASE CONDITIONS
     --------------------------*/

    // Must be 5-star to start club system
    if (!isFiveStar && currentRank !== "5") {
      return null;
    }

    /** -------------------------
     *  DIRECTOR CLUB (Top)
     --------------------------*/
    if (totalPayout >= 50_00_00_000) {
      newRank = "Royal Crown Diamond";
      newClub = "Director";
    } else if (totalPayout >= 25_00_00_000) {
      newRank = "Crown Diamond";
      newClub = "Director";
    } else if (totalPayout >= 10_00_00_000) {
      newRank = "Black Diamond";
      newClub = "Director";
    } else if (totalPayout >= 5_00_00_000) {
      newRank = "Blue Diamond";
      newClub = "Director";
    } else if (totalPayout >= 1_00_00_000) {
      newRank = "Diamond";
      newClub = "Director";
    }

    /** -------------------------
     *  EXECUTIVE CLUB
     --------------------------*/
    else if (totalPayout >= 1_00_000) {
      newClub = "Executive";

      if (totalPayout >= 50_00_000) newRank = "Platinum";
      else if (totalPayout >= 25_00_000) newRank = "Emerald";
      else if (totalPayout >= 10_00_000) newRank = "Gold";
      else if (totalPayout >= 5_00_000) newRank = "Silver";
      else newRank = "Bronze";
    }

    /** -------------------------
     *  NO CHANGE — EXIT
     --------------------------*/
    if (newRank === currentRank && newClub === currentClub) {
      await session.abortTransaction();
      session.endSession();
      return null;
    }

    const updateFields = {
      rank: newRank,
      club: newClub,
      last_modified_at: new Date(),
    };

    /** -------------------------
     *  UPDATE ALL THREE
     --------------------------*/

    await User.updateOne(
      { user_id },
      { $set: updateFields },
      { session }
    );

    await Login.updateOne(
      { user_id },
      { $set: { rank: newRank, Club: newClub } },
      { session }
    );

    await TreeNode.updateOne(
      { user_id },
      {
        $set: {
          rank: newRank,
          Club: newClub,
          last_modified_at: new Date(),
        },
      },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return { newRank, newClub };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("updateClub error:", error);
    throw error;
  }
}

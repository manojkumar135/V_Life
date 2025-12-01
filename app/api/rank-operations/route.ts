// /app/api/rank-operations/route.ts

import { NextResponse } from "next/server";
import { Rank } from "@/models/rank";
import { User } from "@/models/user";
import { connectDB } from "@/lib/mongodb";

// -------------------------------------
// Interfaces
// -------------------------------------
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
  extra?: { qualified_users: any[] };
}

// ===================================================
// ⭐ 1 — CHECK 5 STAR RANK (binary/team-based)
// ===================================================
export async function checkIs5StarRank(user_id: string): Promise<boolean> {
  await connectDB();

  const rankDoc = await Rank.findOne({ user_id }).lean() as RankDoc | null;
  if (!rankDoc?.ranks?.["5_star"]) return false;

  const fiveStar = rankDoc.ranks["5_star"];

  // Already marked as achieved
  if (fiveStar.achieved_at) return true;

  if (!Array.isArray(fiveStar.qualified_users)) return false;

  const qu = fiveStar.qualified_users;

  // Count left/right sides
  const left = qu.filter(u => u.team === "left").length;
  const right = qu.filter(u => u.team === "right").length;

  // ⭐⭐⭐⭐⭐ 5 STAR CONDITION:
  return left >= 5 && right >= 5;
}


// ===================================================
// 🏆 2 — UPDATE CLUB BASED ON TOTAL PAYOUT
// ===================================================
export async function updateClub(
  user_id: string,
  totalPayout: number,
  isFiveStar?: boolean
) {
  const user = await User.findOne({ user_id });
  if (!user) return null;

  let newRank = user.rank;
  let newClub = user.club;

  // ⭐ EXPLANATION
  // If user is 5-Star, KEEP the rank but allow CLUB upgrades.
  const isAlreadyFiveStar = isFiveStar || user.rank === "5";

  // ---------------------------------------------
  // EXECUTIVE CLUB (₹1L → ₹50L)
  // ---------------------------------------------
  if (totalPayout >= 50_00_000) {
    newRank = isAlreadyFiveStar ? "5 Star" : "Platinum";
    newClub = "Executive";
  } else if (totalPayout >= 25_00_000) {
    newRank = isAlreadyFiveStar ? "5 Star" : "Emerald";
    newClub = "Executive";
  } else if (totalPayout >= 10_00_000) {
    newRank = isAlreadyFiveStar ? "5 Star" : "Gold";
    newClub = "Executive";
  } else if (totalPayout >= 5_00_000) {
    newRank = isAlreadyFiveStar ? "5 Star" : "Silver";
    newClub = "Executive";
  } else if (totalPayout >= 1_00_000) {
    newRank = isAlreadyFiveStar ? "5 Star" : "Bronze";
    newClub = "Executive";
  }

  // ---------------------------------------------
  // DIRECTOR CLUB (₹1Cr → ₹50Cr)
  // Director club should *override* 5-star
  // ---------------------------------------------
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

  // nothing changed
  if (newRank === user.rank && newClub === user.club) return null;

  await User.updateOne(
    { user_id },
    {
      $set: {
        rank: newRank,
        club: newClub,
        last_modified_at: new Date(),
      },
    }
  );

  return { newRank, newClub };
}

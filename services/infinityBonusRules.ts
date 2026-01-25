// services/infinityBonusRules.ts

import { Rank } from "@/models/rank";

/**
 * Infinity Bonus Percentage Rules
 * --------------------------------
 * - 1_star (left + right)           → 0.25
 * - 1_star + 2_star (both sides)    → 0.50
 * - Anything else                   → 0
 */
export async function getInfinityBonusPercentage(
  userId: string,
): Promise<number> {
  const rankDoc = (await Rank.findOne({ user_id: userId }).lean()) as any;
  if (!rankDoc?.ranks) return 0;

  const hasBothSides = (users: any[] = []) => {
    const teams = users.map((u) => u.team);
    return teams.includes("left") && teams.includes("right");
  };

  const oneStarUsers = rankDoc.ranks["1_star"]?.qualified_users || [];
  const twoStarUsers = rankDoc.ranks["2_star"]?.qualified_users || [];

  const has1Star = hasBothSides(oneStarUsers);
  const has2Star = hasBothSides(twoStarUsers);

  if (has1Star && has2Star) return 0.5;
  if (has1Star) return 0.25;

  return 0;
}

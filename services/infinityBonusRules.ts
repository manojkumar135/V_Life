// services/infinityBonusRules.ts

import { getDirectPV } from "@/services/directPV";
import { getPV } from "@/services/getPV"; // ✅ NEW

/**
 * Infinity Bonus Percentage Rules
 * ------------------------------------------------
 * Infinity Sales Bonus:    No star/PV check → flat 200% (2.0)
 * Infinity Matching Bonus: Must achieve star (min direct PV ≥ 100 on both legs),
 *                          then percentage is based on the user's OWN PV (getPV):
 *                            ≥ 100 PV → 100% (1.0)
 *                            < 100 PV → 50%  (0.5)
 *                          Star not achieved (minPV < 100) → 0 (not eligible)
 */
export async function getInfinityBonusPercentage(
  userId: string,
  bonusType?: string
): Promise<number> {
  // ✅ Direct Sales Bonus → no star/PV requirement, flat 200%
  if (bonusType === "Direct Sales Bonus") {
    return 2.0;
  }

  // ✅ Matching Bonus
  if (bonusType === "Matching Bonus") {
    // Step 1: Star check — untouched, still via directPV (both legs)
    const { leftDirectPV, rightDirectPV } = await getDirectPV(userId);
    const minPV = Math.min(leftDirectPV, rightDirectPV);

    if (minPV < 100) {
      return 0; // star not achieved — not eligible
    }

    // Step 2: Star achieved (minPV >= 100) — decide 50% vs 100% using the user's OWN PV
    const userPV = await getPV(userId);

    if (userPV >= 100) {
      return 1.0; 
    }
    return 0.5; 
  }

  return 0;
}
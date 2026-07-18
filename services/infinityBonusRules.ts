// services/infinityBonusRules.ts

import { getDirectPV } from "@/services/directPV";

/**
 * Infinity Bonus Percentage Rules
 * ------------------------------------------------
 * Infinity Sales Bonus:    No star/PV check → flat 200% (2.0)
 * Infinity Matching Bonus: Star check based on min(left, right) direct PV
 *                            ≥ 100 PV → 100% (1.0)
 *                            ≥ 50 PV  → 50%  (0.5)
 *                            < 50 PV  → 0 (not eligible)
 */
export async function getInfinityBonusPercentage(
  userId: string,
  bonusType?: string
): Promise<number> {
  // ✅ Direct Sales Bonus → no star/PV requirement, flat 200%
  if (bonusType === "Direct Sales Bonus") {
    return 2.0;
  }

  // ✅ Matching Bonus → star check via direct PV on both legs
  if (bonusType === "Matching Bonus") {
    const { leftDirectPV, rightDirectPV } = await getDirectPV(userId);
    const minPV = Math.min(leftDirectPV, rightDirectPV);

    if (minPV >= 100) {
      return 1.0; // 100%
    }
    if (minPV >= 50) {
      return 0.5; // 50%
    }
    return 0; // below 50 PV — not eligible
  }

  return 0;
}
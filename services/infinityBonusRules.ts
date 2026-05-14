// services/infinityBonusRules.ts

import { getDirectPV } from "@/services/directPV";

/**
 * Infinity Bonus Percentage Rules (Direct PV Based)
 * ------------------------------------------------
 * Matching Bonus:  ≥ 100 PV on both sides → 100% (1.0)
 * Sales Bonus:     < 100 PV on either side → 0
 *                  ≥ 100 PV on both sides  → 50% (0.50)
 */
export async function getInfinityBonusPercentage(
  userId: string,
  bonusType?: string  // ← new optional param
): Promise<number> {
  const { leftDirectPV, rightDirectPV } = await getDirectPV(userId);

  // ❌ Less than minimum requirement (applies to both types)
  if (leftDirectPV < 100 || rightDirectPV < 100) {
    return 0;
  }

  // ✅ Infinity Matching Bonus → 100%
  if (bonusType === "Matching Bonus") {
    return 1.0;
  }

  // ✅ Infinity Sales Bonus → 50%
  return 0.50;
}
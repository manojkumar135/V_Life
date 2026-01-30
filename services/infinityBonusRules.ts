// services/infinityBonusRules.ts

import { getDirectPV } from "@/services/directPV";

/**
 * Infinity Bonus Percentage Rules (Direct PV Based)
 * ------------------------------------------------
 * - < 100 PV on either side        → 0
 * - ≥ 100 PV on both sides         → 0.25
 * - ≥ 200 PV on both sides         → 0.50 (max)
 */
export async function getInfinityBonusPercentage(
  userId: string
): Promise<number> {
  const { leftDirectPV, rightDirectPV } = await getDirectPV(userId);

  // ❌ Less than minimum requirement
  if (leftDirectPV < 100 || rightDirectPV < 100) {
    return 0;
  }

  // ✅ Highest slab first (cap)
  if (leftDirectPV >= 200 && rightDirectPV >= 200) {
    return 0.5;
  }

  // ✅ Base qualification
  if (leftDirectPV >= 100 && rightDirectPV >= 100) {
    return 0.25;
  }

  return 0;
}

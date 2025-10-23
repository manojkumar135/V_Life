import axios from "axios";

/**
 * Check if user has paid advance or has admin access.
 * @param user_id string - The user's ID
 * @param minAmount number - Minimum advance amount (default 10000)
 * @returns Promise<{ hasAccess: boolean; hasAdvance: boolean; reason?: string; data?: any; hasPermission: boolean; }>
 */
export async function hasAdvancePaid(
  user_id: string,
  minAmount: number = 10000
): Promise<{
  hasAccess: boolean;
  hasAdvance: boolean;
  reason?: string;
  data?: any;
  hasPermission: boolean; // final combined boolean (advance OR access)
}> {
  if (!user_id) {
    return {
      hasAccess: false,
      hasAdvance: false,
      hasPermission: false,
      reason: "Missing user_id",
    };
  }

  try {
    const res = await axios.get(
      `/api/advance-operations?user_id=${user_id}&minAmount=${minAmount}`
    );

    // ✅ API expected to return: { success, hasAccess, hasAdvance, reason, data }
    const { hasAccess = false, hasAdvance = false, reason = "", data = null } =
      res.data || {};

    return {
      hasAccess,
      hasAdvance,
      reason,
      data,
      hasPermission: hasAdvance || hasAccess,
    };
  } catch (error: any) {
    console.error("Error checking advance payment:", error);

    return {
      hasAccess: false,
      hasAdvance: false,
      hasPermission: false,
      reason: error.message || "API error",
    };
  }
}

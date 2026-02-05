import axios from "axios";

export async function hasAdvancePaid(
  user_id: string,
  minAmount: number = 10000
): Promise<{
  hasAccess: boolean;
  hasAdvance: boolean;
  hasPermission: boolean;
  reason?: string;
  data?: any;
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

    const {
      hasAccess = false,
      hasAdvance = false,
      hasPermission = false,
      reason = "",
      data = null,
    } = res.data || {};

    return {
      hasAccess,
      hasAdvance,
      hasPermission,
      reason,
      data,
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

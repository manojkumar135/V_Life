import axios from "axios";

export async function hasFirstOrder(user_id: string): Promise<{
  activatedByAdmin: boolean;
  isActive: boolean;
  hasFirstOrder: boolean;
  hasPermission: boolean;
  reason?: string;
  data?: any;
}> {
  if (!user_id) {
    return {
      activatedByAdmin: false,
      isActive: false,
      hasFirstOrder: false,
      hasPermission: false,
      reason: "Missing user_id",
    };
  }

  try {
    const res = await axios.get(
      `/api/firstorder-check?user_id=${user_id}`
    );

    const {
      activatedByAdmin = false,
      isActive = false,
      hasFirstOrder = false,
      hasPermission = false,
      data = null,
    } = res.data || {};

    return {
      activatedByAdmin,
      isActive,
      hasFirstOrder,
      hasPermission,
      data,
    };
  } catch (error: any) {
    console.error("hasFirstOrder service error:", error);

    return {
      activatedByAdmin: false,
      isActive: false,
      hasFirstOrder: false,
      hasPermission: false,
      reason: error.message || "API error",
    };
  }
}

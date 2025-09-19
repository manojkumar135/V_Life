import axios from "axios";

/**
 * Check if user has paid advance of at least ₹10,000.
 * @param user_id string - The user's ID
 * @param minAmount number - Minimum advance amount (default 10000)
 * @returns Promise<boolean>
 */
export async function hasAdvancePaid(
  user_id: string,
  minAmount: number = 10000
): Promise<boolean> {
  if (!user_id) return false;

  try {
    const res = await axios.get(
      `/api/advance-operations?user_id=${user_id}&minAmount=${minAmount}`
    );

    // ✅ API returns: { success, hasAdvance, data }
    const { hasAdvance, data } = res.data;

    // Prefer using hasAdvance flag
    if (hasAdvance) return true;

    // Fallback double-check
    return data?.status === "Completed";
  } catch (error) {
    console.error("Error checking advance payment:", error);
    return false;
  }
}

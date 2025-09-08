// utils/hasAdvancePaid.ts
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
      `/api/history-operations?user_id=${user_id}&minAmount=${minAmount}`
    );

    const records = res.data?.data || [];

    // ✅ true if any record with Completed status
    return records.some((r: any) => r.status === "Completed");
  } catch (error) {
    console.error("Error checking advance payment:", error);
    return false;
  }
}

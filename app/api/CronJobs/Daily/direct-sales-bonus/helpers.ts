import { Order } from "@/models/order";
import { DailyPayout } from "@/models/payout";

/**
 * Check if this is user's FIRST EVER order
 */
export async function isUserFirstOrder(user_id: string) {
  const count = await Order.countDocuments({ user_id });
  return count === 1;
}

/**
 * Prevent duplicate referral bonus
 */
export async function referralBonusAlreadyPaid(order_id: string) {
  return await DailyPayout.exists({
    order_id,
    name: "Referral Bonus",
  });
}

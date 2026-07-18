import { Order } from "@/models/order";

/**
 * Calculate a user's PV that counts toward their "star level" —
 * i.e. only PV from orders that were either:
 *   - the user's first (activation) order, OR
 *   - a PV-upgrade order (50 → 100)
 *
 * Repurchase / regular orders do NOT count toward this figure.
 */
export const getPV = async (userId: string): Promise<number> => {
  const orders = await Order.find(
    {
      user_id: userId,
      $or: [{ is_first_order: true }, { is_upgrade_order: true }],
    },
    { order_pv: 1 },
  ).lean();

  const totalPV = orders.reduce(
    (sum, o: any) => sum + (Number(o.order_pv) || 0),
    0,
  );

  return totalPV;
};
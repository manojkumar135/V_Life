import { Order } from "@/models/order";
import { User } from "@/models/user";

/**
 * Calculate a user's PV that counts toward their "star level" —
 * i.e. only PV from orders that were either:
 *   - the user's first (activation) order, OR
 *   - a PV-upgrade order (50 → 100)
 *
 * Repurchase / regular orders do NOT count toward this figure.
 *
 * ✅ SPECIAL CASE — Admin-activated users:
 *   Users activated directly by an admin never place a real first order,
 *   so they have no order-based PV at all. Business rule: treat them as
 *   already having a virtual 50 PV baseline (as if they'd done a 50 PV
 *   first order). If they later place the 50 PV upgrade order, that real
 *   order PV is added on top of the virtual baseline:
 *     - No orders yet            → 50 (virtual baseline)
 *     - + 50 PV upgrade order    → 50 (baseline) + 50 (real) = 100
 */
export const getPV = async (userId: string): Promise<number> => {
  const orders = await Order.find(
    {
      user_id: userId,
      $or: [{ is_first_order: true }, { is_upgrade_order: true }],
    },
    { order_pv: 1 },
  ).lean();

  const orderPV = orders.reduce(
    (sum, o: any) => sum + (Number(o.order_pv) || 0),
    0,
  );

  // ✅ Admin-activated baseline check
  const user = await User.findOne({ user_id: userId })
    .select("status_notes user_status")
    .lean<{ status_notes?: string; user_status?: string }>();

  const isAdminActivated =
    user?.status_notes?.toLowerCase().includes("admin") ?? false;

  if (isAdminActivated && user?.user_status === "active") {
    // Virtual 50 PV baseline + any real order PV (e.g. the upgrade order)
    return 50 + orderPV;
  }

  return orderPV;
};


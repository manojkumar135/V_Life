// services/processPvOrder.ts
//
// ─── Purpose ──────────────────────────────────────────────────────────────
//
//  processPvOrder({ user_id, order_id, pv, order_amount?, month?, order_date?, userInfo? })
//    Main entry point — call from your order API after an order is confirmed.
//
//    Flow:
//      1. Guard: skip if user not yet activated (any path).
//         Three activation paths exist:
//           a. First order placed   → activated_date set, user_status = "active"
//           b. Admin activates      → activated_date set, user_status = "active"
//           c. Advance payment      → NO activated_date, but user_status = "active"
//         If activated_date exists: skip orders placed before it (strictly).
//         If no activated_date but user_status = "active": allow (advance path).
//         If user_status != "active": skip entirely — not yet activated.
//         The activation order itself is already excluded at the call site
//         via !isFirstOrder, so same-day subsequent orders are always allowed.
//      2. Record the full order inside MonthlyPayoutTracker.pv_orders[]
//         (idempotent — safe to call twice for the same order).
//      3. If PV obligation is now fully met → release this month's holds.
//      4. Cascade forward through later months (oldest-first):
//           - still blocked by another prior month? → STOP
//           - own hold_released = true?             → release it, continue
//           - own hold_released = false?            → STOP (own PV unmet)
//      5. If obligation not yet met → alert user with remaining PV needed.
//      6. Log any still-outstanding holds.
//
//  processPvOrderAcrossMonths({ user_id, order_id, pvByMonth, userInfo? })
//    Admin use: split a single PV order across multiple months.
//
// ─── Integration ──────────────────────────────────────────────────────────
//
//   import { processPvOrder } from "@/services/processPvOrder";
//
//   // In your order API route, after the order document is saved:
//   await processPvOrder({
//     user_id:      order.user_id,
//     order_id:     order.order_id,
//     pv:           order.pv,
//     order_amount: order.total_amount, // optional but good for audit
//     order_date:   order.created_at,   // pass so activation-date guard runs
//     userInfo: {                        // optional — saves name/contact/mail
//       user_name: user.user_name,
//       contact:   user.contact,
//       mail:      user.mail,
//     },
//   });
//
// ──────────────────────────────────────────────────────────────────────────

import {
  recordPvFulfillment,
  currentMonth,
  hasPreviousUnresolvedHolds,
} from "@/services/monthlyHoldService";

import {
  releaseHeldPayoutsForMonth,
  getOutstandingHoldSummary,
} from "./releaseHeldPayouts";
import { releaseOnPvFulfilled } from "./payoutHoldService";

import { MonthlyPayoutTracker } from "@/models/monthlyPayoutTracker";
import { Alert }                from "@/models/alert";
import { User }                 from "@/models/user";
import { connectDB }            from "@/lib/mongodb";

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────

export interface UserInfo {
  user_name?: string;
  contact?:   string;
  mail?:      string;
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  const dd   = String(date.getDate()).padStart(2, "0");
  const mm   = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

// ─────────────────────────────────────────────────────────────────────────
// processPvOrder
// ─────────────────────────────────────────────────────────────────────────

export async function processPvOrder({
  user_id,
  order_id,
  pv,
  order_amount = 0,
  month = currentMonth(),
  order_date,
  userInfo,
}: {
  user_id:       string;
  order_id:      string;
  pv:            number;
  /** Monetary value — stored in pv_orders[] for audit, no logic effect */
  order_amount?: number;
  /** Defaults to current month. Pass only for admin backdating. */
  month?:        string;
  /**
   * Date the order was placed.
   * Used to verify the order is on or after the user's activation date.
   * Orders placed before activation date are never counted toward repurchase PV.
   * The activation order itself is already excluded by !isFirstOrder at the call site.
   * Orders placed ON the activation date (other than the activation order) are allowed.
   */
  order_date?:   Date;
  /**
   * Optional user identity fields.
   * Written only on tracker creation ($setOnInsert) — never overwrites.
   * Pass from the order route whenever you have the user object available.
   */
  userInfo?:     UserInfo;
}): Promise<void> {
  await connectDB();

  // ── Guard: only count PV from activated users, after their activation date ──
  //
  // Three activation paths:
  //
  //  a) First order placed → userActivation.ts sets activated_date + user_status="active"
  //     The activation order is blocked at call site (!isFirstOrder).
  //     Same-day subsequent orders: activated_date exists, oDate >= activationDate → allowed ✅
  //
  //  b) Admin activates → getuser-operations sets activated_date + user_status="active"
  //     No order during activation. First order user places → allowed ✅
  //
  //  c) Advance payment → user_status="active" but activated_date is NOT set.
  //     We allow PV counting as long as user_status is "active" ✅
  //
  const userDoc = await User.findOne({ user_id })
    .select("activated_date user_status")
    .lean() as any;

  // Not active at all — skip entirely
  if (!userDoc || userDoc.user_status?.toLowerCase() !== "active") {
    console.log(
      `[processPvOrder] Skipped ${order_id} — user ${user_id} is not active.`
    );
    return;
  }

  // If activated_date is set, enforce: order must be on or after that date.
  // (Covers paths a and b. Path c has no activated_date — passes through.)
  if (userDoc.activated_date && order_date) {
    // Parse "DD-MM-YYYY" → Date at midnight
    const [dd, mm, yyyy] = userDoc.activated_date.split("-").map(Number);
    const activationDate = new Date(yyyy, mm - 1, dd);
    activationDate.setHours(0, 0, 0, 0);

    const oDate = new Date(order_date);
    oDate.setHours(0, 0, 0, 0);

    if (oDate < activationDate) {
      // Order is strictly before activation date — skip
      console.log(
        `[processPvOrder] Skipped ${order_id} — order date ${oDate.toDateString()} ` +
        `is before activation date ${activationDate.toDateString()}.`
      );
      return;
    }
  }

  // ── Step 1: Record full order details + PV fulfillment ────────────────
  const result = await recordPvFulfillment({
    user_id,
    order_id,
    pv,
    order_amount,
    month,
    userInfo,
  });

  if (result.alreadyCounted) {
    console.log(
      `[processPvOrder] Order ${order_id} already counted for ${user_id} in ${month} — skipping.`
    );
    return;
  }

  console.log(
    `[processPvOrder] ${user_id} | ${month} | ` +
    `PV: ${result.fulfilled}/${result.required} | order: ${order_id}`
  );

  // ── Step 2: Release this month if obligation fully met ────────────────
  if (result.canRelease) {
    // Release via payoutHoldService — re-evaluates ALL hold reasons per payout
    // (wallet, active, review, PV) not just the PV condition alone.
    await releaseOnPvFulfilled(user_id);

    // Also run the month-level release for cascade tracking
    const releaseResult = await releaseHeldPayoutsForMonth({ user_id, month });

    console.log(
      `[processPvOrder] Released ${month}: ` +
      `${releaseResult.dailyReleased} daily + ${releaseResult.weeklyReleased} weekly`
    );

    // ── Step 3: Cascade forward through later months ──────────────────
    //
    // This month is now cleared. Walk forward oldest-first.
    //
    // Examples:
    //   March cleared → April PV met         → release April        ✅
    //   March cleared → April PV NOT met     → stop at April        ✅
    //   March cleared → April met → May met  → release April + May  ✅

    const laterTrackers = await MonthlyPayoutTracker.find({
      user_id,
      month: { $gt: month },
    })
      .sort({ month: 1 })
      .lean();

    for (const laterTracker of laterTrackers) {
      // Is this later month still blocked by another uncleared prior month?
      const stillBlocked = await hasPreviousUnresolvedHolds(
        user_id,
        laterTracker.month
      );

      if (stillBlocked) {
        console.log(
          `[processPvOrder] Cascade stopped at ${laterTracker.month} — blocked by a prior month.`
        );
        break;
      }

      if (laterTracker.hold_released) {
        // This month's own PV is met → release it
        const cascadeResult = await releaseHeldPayoutsForMonth({
          user_id,
          month: laterTracker.month,
        });
        if (!cascadeResult.nothingToRelease) {
          console.log(
            `[processPvOrder] Cascade released ${laterTracker.month}: ` +
            `${cascadeResult.dailyReleased} daily + ${cascadeResult.weeklyReleased} weekly`
          );
        }
      } else {
        // This month's own PV is NOT met → stop cascade
        console.log(
          `[processPvOrder] Cascade stopped at ${laterTracker.month} — own PV not yet met.`
        );
        break;
      }
    }
  } else {
    // ── PV not yet fully met → alert user ─────────────────────────────
    const remaining = result.required - result.fulfilled;
    if (remaining > 0) {
      const now = new Date();
      await Alert.create({
        user_id,
        title:       "📦 PV Order Recorded",
        description:
          `Your PV repurchase order has been recorded (${result.fulfilled}/${result.required} PV for this obligation). ` +
          `You need ${remaining} more PV to release your held payouts.`,
        role:        "user",
        priority:    "medium",
        read:        false,
        link:        "/wallet/payout/daily",
        date:        formatDate(now),
        created_at:  now,
      });
    }
  }

  // ── Step 4: Log remaining outstanding holds ───────────────────────────
  const outstanding = await getOutstandingHoldSummary(user_id);

  if (outstanding.length > 0) {
    console.log(
      `[processPvOrder] ${user_id} still has holds: ` +
      outstanding
        .map((o) =>
          `${o.month} (${o.pv_fulfilled}/${o.pv_required} PV, ` +
          `needs ${o.pv_remaining} more, ${o.pv_orders.length} order(s) placed)`
        )
        .join(" | ")
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────
// processPvOrderAcrossMonths  (admin use)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Splits a single PV order across multiple months.
 *
 * Example — user has holds in March (50 PV) and April (100 PV):
 *
 *   await processPvOrderAcrossMonths({
 *     user_id:  "USR001",
 *     order_id: "ORD999",
 *     pvByMonth: {
 *       "2025-03": { pv: 50,  order_amount: 5000  },
 *       "2025-04": { pv: 100, order_amount: 10000 },
 *     },
 *     userInfo: { user_name: "Ravi Kumar", contact: "9876543210", mail: "ravi@example.com" },
 *   });
 *
 * Each month gets a unique sub-order-ID for idempotency.
 * Months are always processed oldest-first so cascade works correctly.
 */
export async function processPvOrderAcrossMonths({
  user_id,
  order_id,
  pvByMonth,
  userInfo,
}: {
  user_id:   string;
  order_id:  string;
  pvByMonth: Record<string, { pv: number; order_amount?: number }>;
  userInfo?: UserInfo;
}): Promise<void> {
  await connectDB();

  const sortedMonths = Object.keys(pvByMonth).sort(); // oldest first

  for (const month of sortedMonths) {
    const { pv, order_amount = 0 } = pvByMonth[month];
    await processPvOrder({
      user_id,
      order_id:     `${order_id}_${month}`,
      pv,
      order_amount,
      month,
      userInfo,
    });
  }
}
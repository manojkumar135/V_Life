// services/releaseHeldPayouts.ts
//
// ─── Purpose ──────────────────────────────────────────────────────────────
//
//  releaseHeldPayoutsForMonth({ user_id, month? })
//    Flips all OnHold DailyPayout + WeeklyPayout records for the given month
//    to Pending, provided MonthlyPayoutTracker.hold_released = true.
//    Guard ensures this is always safe to call — it is a no-op if PV is
//    not yet fully met.
//    Called by processPvOrder.ts after recordPvFulfillment() returns
//    canRelease = true (and again for each cascaded later month).
//
//  getOutstandingHoldSummary(user_id)
//    Returns all months where the user still has an uncleared PV obligation,
//    sorted oldest-first. Includes full pv_orders[] per month for audit /
//    dashboard display.
//    Called by processPvOrder.ts to log remaining holds after processing.
//
// ─── DO NOT call releaseHeldPayoutsForMonth directly ─────────────────────
//  Always go through processPvOrder, which handles the cascade correctly.
//
// ──────────────────────────────────────────────────────────────────────────

import { DailyPayout, WeeklyPayout } from "@/models/payout";
import { MonthlyPayoutTracker }       from "@/models/monthlyPayoutTracker";
import { Alert }                      from "@/models/alert";
import { connectDB }                  from "@/lib/mongodb";
import { currentMonth }               from "@/services/monthlyHoldService";

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  const dd   = String(date.getDate()).padStart(2, "0");
  const mm   = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function monthDateRange(month: string): { $gte: Date; $lt: Date } {
  const [yyyy, mm] = month.split("-").map(Number);
  return {
    $gte: new Date(yyyy, mm - 1, 1),
    $lt:  new Date(yyyy, mm,     1),
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────

export interface ReleaseResult {
  month:            string;
  dailyReleased:    number;
  weeklyReleased:   number;
  nothingToRelease: boolean;
}

// ─────────────────────────────────────────────────────────────────────────
// releaseHeldPayoutsForMonth
// ─────────────────────────────────────────────────────────────────────────

/**
 * Releases all OnHold payouts for a user in a specific month.
 *
 * Guard: only proceeds if MonthlyPayoutTracker.hold_released = true.
 * If PV obligation is not fully met, this is a safe no-op.
 */
export async function releaseHeldPayoutsForMonth({
  user_id,
  month = currentMonth(),
}: {
  user_id: string;
  month?:  string;
}): Promise<ReleaseResult> {
  await connectDB();

  const tracker = (await MonthlyPayoutTracker.findOne({ user_id, month }).lean()) as any;

  if (!tracker || !tracker.hold_released) {
    return {
      month,
      dailyReleased:    0,
      weeklyReleased:   0,
      nothingToRelease: true,
    };
  }

  const dateRange = monthDateRange(month);
  const now       = new Date();

  // Build a readable release note showing exactly which orders cleared the hold
  const orderSummary = (tracker.pv_orders ?? [])
    .map((o: any) => `${o.order_id} (${o.pv} PV on ${o.date})`)
    .join(", ");

  const releaseNote =
    `PV obligation met: ${tracker.pv_fulfilled}/${tracker.pv_required} PV` +
    (orderSummary ? ` via orders: ${orderSummary}` : "");

  // ── Release DailyPayout records ───────────────────────────────────────
  const dailyResult = await DailyPayout.updateMany(
    { user_id, status: "OnHold", created_at: dateRange },
    {
      $set: {
        status:              "pending",
        hold_released_at:    now,
        hold_release_reason: releaseNote,
        last_modified_by:    "system",
        last_modified_at:    now,
      },
    }
  );

  // ── Release WeeklyPayout records ──────────────────────────────────────
  const weeklyResult = await WeeklyPayout.updateMany(
    { user_id, status: "OnHold", created_at: dateRange },
    {
      $set: {
        status:              "pending",
        hold_released_at:    now,
        hold_release_reason: releaseNote,
        last_modified_by:    "system",
        last_modified_at:    now,
      },
    }
  );

  const dailyReleased  = dailyResult.modifiedCount;
  const weeklyReleased = weeklyResult.modifiedCount;
  const totalReleased  = dailyReleased + weeklyReleased;

  if (totalReleased > 0) {
    await Alert.create({
      user_id,
      title:       "💰 Held Payouts Released",
      description: `${totalReleased} payout(s) held in ${month} have been released to Pending after your PV order was verified.`,
      role:        "user",
      priority:    "high",
      read:        false,
      link:        "/wallet/payout/daily",
      date:        formatDate(now),
      created_at:  now,
    });
  }

  return {
    month,
    dailyReleased,
    weeklyReleased,
    nothingToRelease: totalReleased === 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// getOutstandingHoldSummary
// ─────────────────────────────────────────────────────────────────────────

/**
 * Returns all months where the user still has an uncleared PV obligation.
 * Sorted oldest-first.
 * Includes full pv_orders[] so callers can show the complete order history.
 */
export async function getOutstandingHoldSummary(user_id: string): Promise<
  Array<{
    month:        string;
    pv_required:  number;
    pv_fulfilled: number;
    pv_remaining: number;
    total_payout: number;
    pv_orders:    any[];
  }>
> {
  await connectDB();

  const trackers = await MonthlyPayoutTracker.find({
    user_id,
    hold_released: false,
    pv_required:   { $gt: 0 },
  })
    .sort({ month: 1 })
    .lean();

  return trackers.map((t) => ({
    month:        t.month,
    pv_required:  t.pv_required,
    pv_fulfilled: t.pv_fulfilled,
    pv_remaining: Math.max(0, t.pv_required - t.pv_fulfilled),
    total_payout: t.total_payout,
    pv_orders:    t.pv_orders ?? [],
  }));
}
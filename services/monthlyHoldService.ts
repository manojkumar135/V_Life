// services/monthlyHoldService.ts
//
// ─── Purpose ──────────────────────────────────────────────────────────────
//
//  All PV obligation logic lives here.
//  totalpayout.ts is left completely unchanged (getTotalPayout + checkHoldStatus).
//
// ─── Exports ──────────────────────────────────────────────────────────────
//
//  currentMonth()
//    Returns today's month as "YYYY-MM".
//
//  requiredPvForCumulativeTotal(cumulativeTotal)
//    Pure fn: given cumulative (all-time) payout total → returns how many
//    50PV repurchases are required total so far.
//
//  getCumulativeTotalPayout(user_id)
//    Returns sum of total_payout across ALL months for a user.
//
//  getMonthlyTotalPayout(user_id, month?, forceRecalculate?)
//    Returns payout total for a given month from the tracker.
//    Pass forceRecalculate=true to recompute from raw DB (audit / migration).
//
//  getOrCreateMonthlyTracker(user_id, month?)
//    Upserts a MonthlyPayoutTracker for the user + month.
//
//  hasPreviousUnresolvedHolds(user_id, beforeMonth)
//    Returns true if ANY month strictly before `beforeMonth` has
//    pv_required > 0 AND hold_released = false.
//    Enforces: "new-month payouts stay OnHold until all prior PV is cleared."
//
//  evaluateAndUpdateHoldStatus(user_id, newPayoutAmount, month?)
//    Call BEFORE creating any DailyPayout or WeeklyPayout.
//    Updates the tracker total_payout + cumulative pv_required and returns
//    "Pending" | "OnHold".
//
//    Hold priority:
//      1. Any prior month has uncleared PV              → OnHold
//      2. Cumulative total crossed a threshold, PV not met → OnHold
//      3. All clear                                     → Pending
//
//  recordPvFulfillment({ user_id, order_id, pv, order_amount?, month? })
//    Call when a qualifying PV order is placed.
//    Pushes a full order record into pv_orders[] inside the tracker:
//      order_id, pv, order_amount, date, time, placed_at,
//      cumulative_pv_after, triggered_release, pv_required_at_time
//    If pv_fulfilled >= pv_required → marks hold_released = true,
//    sets hold_released_at, and returns canRelease = true.
//    Caller (processPvOrder) then calls releaseHeldPayoutsForMonth().
//
// ─── PV Obligation Rules (CUMULATIVE) ─────────────────────────────────────
//
//  Cumulative Payout Total  │  Total PV Repurchases Required (50PV each)
//  ─────────────────────────┼──────────────────────────────────────────────
//  < ₹50,000                │  0           (no restriction)
//  ₹50,000 – ₹1,49,999      │  1 × 50PV    (1st repurchase)
//  ₹1,50,000 – ₹2,49,999    │  2 × 50PV    (2nd repurchase)
//  ₹2,50,000 – ₹3,49,999    │  3 × 50PV    (3rd repurchase)
//  ₹3,50,000 – ₹4,49,999    │  4 × 50PV    (4th repurchase)
//  ... and so on every ₹1L  │
//
//  Formula:
//    if cumulative < 50,000  → 0 PV required total
//    else                    → 1 + floor((cumulative - 50,000) / 100,000) repurchases
//    total PV required       → repurchases × 50
//
//  Thresholds: ₹50K, ₹1.5L, ₹2.5L, ₹3.5L, ₹4.5L ...
//
//  • The pv_required stored per MonthlyPayoutTracker is the DELTA still
//    owed for THAT month's tracker (the increment caused by crossing a new
//    threshold that month). Global total is managed via cumulative_pv_fulfilled.
//  • Partial PV does NOT release holds — full pv_required must be met.
//  • New-month payouts stay OnHold if ANY prior month's PV is uncleared.
//
// ──────────────────────────────────────────────────────────────────────────

import { DailyPayout, WeeklyPayout } from "@/models/payout";
import { MonthlyPayoutTracker }       from "@/models/monthlyPayoutTracker";
import { connectDB }                  from "@/lib/mongodb";

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────

export interface PvFulfillmentResult {
  tracker:        any;
  /** pv_fulfilled after this order */
  fulfilled:      number;
  /** pv_required for this month */
  required:       number;
  /**
   * true  → pv_fulfilled >= pv_required AND pv_required > 0
   *         Caller should invoke releaseHeldPayoutsForMonth().
   */
  canRelease:     boolean;
  /** true if this order_id was already recorded — no changes made */
  alreadyCounted: boolean;
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

/** Returns the current month as "YYYY-MM" */
export function currentMonth(): string {
  const now  = new Date();
  const yyyy = now.getFullYear();
  const mm   = String(now.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

function formatDate(date: Date): string {
  const dd   = String(date.getDate()).padStart(2, "0");
  const mm   = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function formatTime(date: Date): string {
  return date.toTimeString().slice(0, 5); // "HH:MM"
}

// ─────────────────────────────────────────────────────────────────────────
// PV threshold calculator (CUMULATIVE)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Returns the TOTAL PV repurchases required based on cumulative (all-time)
 * payout total.
 *
 *  Thresholds: ₹50K, ₹1.5L, ₹2.5L, ₹3.5L, ₹4.5L ... (every ₹1L after first)
 *
 *  cumulative < ₹50,000              →  0 PV required
 *  ₹50,000 ≤ cumulative < ₹1,50,000  →  50 PV (1 repurchase)
 *  ₹1,50,000 ≤ cumulative < ₹2,50,000 → 100 PV (2 repurchases)
 *  ₹2,50,000 ≤ cumulative < ₹3,50,000 → 150 PV (3 repurchases)
 *  ... and so on every ₹1L
 *
 *  Returns the total PV that must be fulfilled across ALL time.
 *  The delta (new requirement − already fulfilled) is what gets assigned
 *  to the current month's tracker.
 */
export function requiredPvForCumulativeTotal(cumulativeTotal: number): number {
  if (cumulativeTotal < 60_000) return 0;
  // 1st repurchase at ₹60K, then every ₹60K → floor((cumulative - 60000) / 60000) + 1
  const repurchases = 1 + Math.floor((cumulativeTotal - 60_000) / 60_000);
  return repurchases * 50;
}

/**
 * @deprecated Use requiredPvForCumulativeTotal instead.
 * Kept for backward-compat if anything still imports this symbol.
 * Will be removed in a future cleanup.
 */
export function requiredPvForMonthlyTotal(total: number): number {
  return requiredPvForCumulativeTotal(total);
}

// ─────────────────────────────────────────────────────────────────────────
// Cumulative payout total across ALL months
// ─────────────────────────────────────────────────────────────────────────

/**
 * Returns the sum of total_payout across ALL MonthlyPayoutTracker records
 * for a user — i.e. their all-time cumulative payout total.
 *
 * This drives the new repurchase threshold logic: thresholds are checked
 * against this cumulative figure, not against any single month.
 */
export async function getCumulativeTotalPayout(user_id: string): Promise<number> {
  await connectDB();

  const result = await MonthlyPayoutTracker.aggregate([
    { $match: { user_id } },
    { $group: { _id: null, total: { $sum: "$total_payout" } } },
  ]);

  return result[0]?.total ?? 0;
}

// ─────────────────────────────────────────────────────────────────────────
// Monthly total payout
// ─────────────────────────────────────────────────────────────────────────

/**
 * Returns the running payout total for a specific month.
 *
 * Normally reads from MonthlyPayoutTracker (fast, always in sync).
 * Pass forceRecalculate=true to recompute from raw DailyPayout + WeeklyPayout
 * — useful for audits or after manual data corrections.
 */
export async function getMonthlyTotalPayout(
  user_id: string,
  month: string = currentMonth(),
  forceRecalculate = false
): Promise<number> {
  await connectDB();

  if (!forceRecalculate) {
    const tracker = (await MonthlyPayoutTracker.findOne({ user_id, month }).lean()) as any;
    if (tracker) return tracker.total_payout;
  }

  const [yyyy, mm] = month.split("-").map(Number);
  const start = new Date(yyyy, mm - 1, 1);
  const end   = new Date(yyyy, mm,     1); // exclusive

  const [daily, weekly] = await Promise.all([
    DailyPayout.aggregate([
      { $match: { user_id, created_at: { $gte: start, $lt: end } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    WeeklyPayout.aggregate([
      { $match: { user_id, created_at: { $gte: start, $lt: end } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ]);

  return (daily[0]?.total ?? 0) + (weekly[0]?.total ?? 0);
}

// ─────────────────────────────────────────────────────────────────────────
// Get or create tracker
// ─────────────────────────────────────────────────────────────────────────

/**
 * Upserts a MonthlyPayoutTracker for the given user + month.
 * Creates a fresh record with all zeros if it doesn't exist yet.
 *
 * user_name, contact, mail are written ONLY on insert ($setOnInsert) —
 * they are never overwritten on subsequent calls, keeping the original
 * identity snapshot intact.
 *
 * All three are optional. If not provided, they default to "" (from schema).
 * Pass them whenever you have the user object handy (e.g. from order route)
 * to ensure the tracker is human-readable from day one.
 */
export async function getOrCreateMonthlyTracker(
  user_id: string,
  month: string = currentMonth(),
  userInfo?: {
    user_name?: string;
    contact?:   string;
    mail?:      string;
  }
): Promise<any> {
  await connectDB();

  const insertFields: Record<string, string> = { user_id, month };
  if (userInfo?.user_name) insertFields.user_name = userInfo.user_name;
  if (userInfo?.contact)   insertFields.contact   = userInfo.contact;
  if (userInfo?.mail)      insertFields.mail       = userInfo.mail;

  const tracker = await MonthlyPayoutTracker.findOneAndUpdate(
    { user_id, month },
    { $setOnInsert: insertFields },
    { upsert: true, new: true }
  );

  return tracker!;
}

// ─────────────────────────────────────────────────────────────────────────
// Prior-month unresolved hold check
// ─────────────────────────────────────────────────────────────────────────

/**
 * Returns true if the user has ANY month BEFORE `beforeMonth` where:
 *   - pv_required > 0   (a PV obligation was triggered)
 *   - hold_released = false  (it has NOT been cleared yet)
 *
 * Enforces the rule:
 *   "New-month payouts stay OnHold until ALL previous months' PV is cleared."
 */
export async function hasPreviousUnresolvedHolds(
  user_id: string,
  beforeMonth: string  // "YYYY-MM" — only months strictly before this are checked
): Promise<boolean> {
  await connectDB();

  const count = await MonthlyPayoutTracker.countDocuments({
    user_id,
    month:         { $lt: beforeMonth },
    pv_required:   { $gt: 0 },
    hold_released: false,
  });

  return count > 0;
}

// ─────────────────────────────────────────────────────────────────────────
// Core: evaluate hold status before creating a payout
// ─────────────────────────────────────────────────────────────────────────

/**
 * Call this RIGHT BEFORE creating a DailyPayout or WeeklyPayout record.
 *
 * CHANGED TO CUMULATIVE: PV thresholds are now based on the user's
 * ALL-TIME cumulative payout total, not the monthly total.
 *
 * Steps:
 *  1. Check if any PREVIOUS month has an uncleared PV obligation.
 *     If yes → new payout is OnHold regardless of cumulative total.
 *  2. Load (or create) the MonthlyPayoutTracker for this user + month.
 *  3. Add newPayoutAmount to this month's running total.
 *  4. Compute the new cumulative total (this month + all previous months).
 *  5. Compute how many total PV repurchases are required cumulatively.
 *  6. Compute how many PV have already been fulfilled across ALL months.
 *  7. If cumulative requirement exceeds cumulative fulfilled:
 *       a. Assign the delta as this month's pv_required.
 *       b. Set hold_released = false.
 *  8. Save the tracker.
 *  9. Return "Pending" | "OnHold".
 *
 * Hold priority order:
 *  1. OnHold  → any previous month has pv_required > 0 AND hold_released = false
 *  2. OnHold  → cumulative PV required > cumulative PV fulfilled
 *  3. Pending → all clear
 *
 * ─── Example scenarios ───────────────────────────────────────────────────
 *
 *  Scenario A: User cumulative crosses ₹50K — 1st repurchase triggered
 *    prevCumulative = ₹40,000, newCumulative = ₹55,000
 *    totalPvRequired = 50, totalPvFulfilled = 0 → delta = 50
 *    pv_required = 50 on this month's tracker → return OnHold ✅
 *
 *  Scenario B: User already did 50PV repurchase, cumulative crosses ₹1.5L
 *    prevCumulative = ₹1,40,000, newCumulative = ₹1,60,000
 *    totalPvRequired = 100, totalPvFulfilled = 50 → delta = 50
 *    pv_required = 50 on this month's tracker → return OnHold ✅
 *
 *  Scenario C: cumulative crosses ₹1.5L but user already placed 100 PV total
 *    totalPvRequired = 100, totalPvFulfilled = 100 → delta = 0
 *    pv_required = 0 → return Pending ✅
 *
 *  Scenario D: cumulative still under ₹50K — no PV needed
 *    totalPvRequired = 0 → return Pending ✅
 */
export async function evaluateAndUpdateHoldStatus(
  user_id: string,
  newPayoutAmount: number,
  month: string = currentMonth()
): Promise<{ status: "Pending" | "OnHold"; tracker: any }> {
  await connectDB();

  // ── 1. Block if any prior month is still uncleared ────────────────────
  const blockedByPreviousMonth = await hasPreviousUnresolvedHolds(user_id, month);

  // ── 2. Update this month's tracker ────────────────────────────────────
  const tracker = await getOrCreateMonthlyTracker(user_id, month);

  const prevMonthTotal = tracker.total_payout;
  const newMonthTotal  = prevMonthTotal + newPayoutAmount;
  tracker.total_payout = newMonthTotal;

  // ── 3. Compute cumulative total across ALL months (including this update) ──
  const prevCumulativeTotal = await getCumulativeTotalPayout(user_id);
  // prevCumulativeTotal already includes prevMonthTotal for this month (from DB)
  // We need to account for the new amount being added now
  const newCumulativeTotal = prevCumulativeTotal + newPayoutAmount;

  // ── 4. Compute total PV required cumulatively ─────────────────────────
  const totalPvRequired = requiredPvForCumulativeTotal(newCumulativeTotal);

  // ── 5. Compute total PV fulfilled across ALL months ───────────────────
  const pvFulfilledResult = await MonthlyPayoutTracker.aggregate([
    { $match: { user_id } },
    { $group: { _id: null, total: { $sum: "$pv_fulfilled" } } },
  ]);
  const totalPvFulfilled = pvFulfilledResult[0]?.total ?? 0;

  // ── 6. Delta = how much more PV is still needed globally ─────────────
  const globalPvDelta = Math.max(0, totalPvRequired - totalPvFulfilled);

  // ── 7. Assign delta as this month's obligation ────────────────────────
  const prevPvReq = tracker.pv_required;

  if (globalPvDelta > prevPvReq) {
    // New cumulative threshold crossed — assign additional requirement here
    tracker.pv_required  = globalPvDelta;
    tracker.hold_released    = false;
    tracker.hold_released_at = undefined;
  } else if (globalPvDelta === 0 && prevPvReq === 0) {
    // No obligation — nothing to do
  }
  // If globalPvDelta <= prevPvReq, no change needed on this tracker

  // Record threshold crossing timestamps (cumulative)
  const now = new Date();
  if (prevCumulativeTotal < 60_000 && newCumulativeTotal >= 60_000 && !tracker.crossed_1lakh_at) {
    tracker.crossed_1lakh_at = now; // first threshold (₹60K cumulative)
  }
  if (prevCumulativeTotal < 120_000 && newCumulativeTotal >= 120_000 && !tracker.crossed_3lakh_at) {
    tracker.crossed_3lakh_at = now; // 2nd threshold (₹1.2L cumulative)
  }

  await tracker.save();

  // ── 8. Determine final status ─────────────────────────────────────────
  const thisMonthOnHold = tracker.pv_required > 0 && !tracker.hold_released;
  const isOnHold = blockedByPreviousMonth || thisMonthOnHold;

  return {
    status:  isOnHold ? "OnHold" : "Pending",
    tracker,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// PV Fulfillment — stores full order record inside the tracker
// ─────────────────────────────────────────────────────────────────────────

/**
 * Call when a qualifying PV order is placed.
 *
 * Pushes a complete order record into pv_orders[] inside the tracker:
 *   order_id, pv, order_amount, date, time, placed_at,
 *   cumulative_pv_after, triggered_release, pv_required_at_time
 *
 * Idempotent — if order_id already exists in pv_orders[], returns the
 * current state without making any changes.
 *
 * Does NOT release holds itself — returns canRelease = true so the caller
 * (processPvOrder) can call releaseHeldPayoutsForMonth().
 *
 * NOTE: pv_required on the tracker is the delta assigned to this month when
 * a cumulative threshold was crossed. The user fulfils it by placing PV orders
 * (tracked in pv_orders[]). Once pv_fulfilled >= pv_required for this tracker,
 * hold_released = true and canRelease = true.
 *
 * ─── canRelease conditions ────────────────────────────────────────────────
 *
 *  canRelease = true ONLY when ALL of:
 *    1. pv_required > 0          (an obligation existed for this tracker)
 *    2. newFulfilled >= pv_required  (this order pushed fulfilled over the line)
 *
 *  canRelease = false when:
 *    - No PV obligation (pv_required = 0) — nothing to release
 *    - Partial fulfillment — user still needs more PV
 */
export async function recordPvFulfillment({
  user_id,
  order_id,
  pv,
  order_amount = 0,
  month = currentMonth(),
  userInfo,
}: {
  user_id:       string;
  order_id:      string;
  pv:            number;
  /** Monetary value of the order — stored for audit, does not affect PV logic */
  order_amount?: number;
  month?:        string;
  /**
   * Optional user identity — written only on tracker creation ($setOnInsert).
   * Pass from the order route so the tracker is human-readable from day one.
   */
  userInfo?: {
    user_name?: string;
    contact?:   string;
    mail?:      string;
  };
}): Promise<PvFulfillmentResult> {
  await connectDB();

  const tracker = await getOrCreateMonthlyTracker(user_id, month, userInfo);

  // ── Idempotency guard ─────────────────────────────────────────────────
  const alreadyExists = tracker.pv_orders.some(
    (o: any) => o.order_id === order_id
  );

  if (alreadyExists) {
    return {
      tracker,
      fulfilled:      tracker.pv_fulfilled,
      required:       tracker.pv_required,
      canRelease:
        tracker.pv_required > 0 &&
        tracker.pv_fulfilled >= tracker.pv_required,
      alreadyCounted: true,
    };
  }

  // ── Accumulate PV ─────────────────────────────────────────────────────
  const newFulfilled        = tracker.pv_fulfilled + pv;
  const cumulative_pv_after = newFulfilled;

  const canRelease =
    tracker.pv_required > 0 &&
    newFulfilled >= tracker.pv_required;

  // ── Build full order record ───────────────────────────────────────────
  const now = new Date();

  tracker.pv_fulfilled = newFulfilled;
  tracker.pv_orders.push({
    order_id,
    pv,
    order_amount,
    date:                formatDate(now),
    time:                formatTime(now),
    placed_at:           now,
    cumulative_pv_after,
    triggered_release:   canRelease,    // true only on the order that clears the hold
    pv_required_at_time: tracker.pv_required,
  });

  if (canRelease) {
    tracker.hold_released    = true;
    tracker.hold_released_at = now;
  }

  await tracker.save();

  return {
    tracker,
    fulfilled:      tracker.pv_fulfilled,
    required:       tracker.pv_required,
    canRelease,
    alreadyCounted: false,
  };
}
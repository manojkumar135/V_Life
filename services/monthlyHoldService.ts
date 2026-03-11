// services/monthlyHoldService.ts
//
// ─── Purpose ──────────────────────────────────────────────────────────────
//
//  All monthly PV obligation logic lives here.
//  totalpayout.ts is left completely unchanged (getTotalPayout + checkHoldStatus).
//
// ─── Exports ──────────────────────────────────────────────────────────────
//
//  currentMonth()
//    Returns today's month as "YYYY-MM".
//
//  requiredPvForMonthlyTotal(total)
//    Pure fn: given a monthly payout total → returns 0 | 50 | 100 PV required.
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
//    Updates the tracker total_payout + pv_required and returns
//    "Pending" | "OnHold".
//
//    Hold priority:
//      1. Any prior month has uncleared PV              → OnHold
//      2. This month crossed a threshold, PV not met    → OnHold
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
// ─── PV Obligation Rules ──────────────────────────────────────────────────
//
//  Monthly Payout Total   │  PV Required  │  Notes
//  ───────────────────────┼───────────────┼────────────────────────────────
//  < ₹1,00,000            │  0 PV         │  No restriction
//  ₹1,00,000 – ₹2,99,999  │  50 PV        │  Must place 50 PV order
//  ≥ ₹3,00,000            │  100 PV       │  Must place 100 PV total
//
//  • If user already placed 50 PV at ₹1L and later crosses ₹3L,
//    pv_required jumps to 100 but only 50 more PV is needed.
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
// PV threshold calculator
// ─────────────────────────────────────────────────────────────────────────

/**
 * Returns the PV a user must order for a given monthly payout total.
 *
 *  < ₹1,00,000  →  0 PV  (no restriction)
 *  ≥ ₹1,00,000  → 50 PV
 *  ≥ ₹3,00,000  → 100 PV  (cumulative — if 50 already placed, only 50 more needed)
 */
export function requiredPvForMonthlyTotal(total: number): 0 | 50 | 100 {
  if (total >= 300_000) return 100;
  if (total >= 100_000) return 50;
  return 0;
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
 * Steps:
 *  1. Check if any PREVIOUS month has an uncleared PV obligation.
 *     If yes → new payout is OnHold regardless of this month's total.
 *  2. Load (or create) the MonthlyPayoutTracker for this user + month.
 *  3. Add newPayoutAmount to the running total.
 *  4. Recalculate pv_required based on the new total.
 *  5. If pv_required increased:
 *       a. If pv_fulfilled already meets the NEW requirement → keep hold_released = true.
 *       b. Otherwise → flip hold_released = false (user must place more PV).
 *  6. Save the tracker.
 *  7. Return the status the new payout record should be saved with.
 *
 * Hold priority order:
 *  1. OnHold  → any previous month has pv_required > 0 AND hold_released = false
 *  2. OnHold  → this month's pv_required > 0 AND pv_fulfilled < pv_required
 *  3. Pending → all clear
 *
 * ─── Example scenarios ───────────────────────────────────────────────────
 *
 *  Scenario A: User crosses ₹1L — 50 PV now required
 *    prevTotal = ₹90,000, newTotal = ₹1,10,000
 *    prevPvReq = 0, newPvReq = 50
 *    pv_fulfilled = 0 → hold_released = false → return OnHold ✅
 *
 *  Scenario B: User already placed 50 PV at ₹1L, total now crosses ₹3L
 *    prevTotal = ₹2,80,000, newTotal = ₹3,10,000
 *    prevPvReq = 50, newPvReq = 100
 *    pv_fulfilled = 50 → 50 < 100 → hold_released = false → return OnHold ✅
 *    (User needs 50 more PV to reach 100 total)
 *
 *  Scenario C: User placed 100 PV, total crosses ₹3L
 *    prevTotal = ₹2,80,000, newTotal = ₹3,10,000
 *    prevPvReq = 50, newPvReq = 100
 *    pv_fulfilled = 100 → 100 >= 100 → keep hold_released = true → return Pending ✅
 *
 *  Scenario D: Total still under ₹1L — no PV needed
 *    prevTotal = ₹50,000, newTotal = ₹80,000
 *    newPvReq = 0 → return Pending ✅
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

  const prevTotal = tracker.total_payout;
  const newTotal  = prevTotal + newPayoutAmount;
  const prevPvReq = tracker.pv_required;
  const newPvReq  = requiredPvForMonthlyTotal(newTotal);

  tracker.total_payout = newTotal;

  // Record exact moment each threshold was first crossed
  const now = new Date();
  if (prevTotal < 100_000 && newTotal >= 100_000 && !tracker.crossed_1lakh_at) {
    tracker.crossed_1lakh_at = now;
  }
  if (prevTotal < 300_000 && newTotal >= 300_000 && !tracker.crossed_3lakh_at) {
    tracker.crossed_3lakh_at = now;
  }

  // ── FIX: Handle PV requirement increase correctly ─────────────────────
  //
  // If the PV obligation increased (e.g. ₹1L → ₹3L threshold crossed):
  //   - Update pv_required to the new higher value.
  //   - Check if pv_fulfilled ALREADY meets the new requirement.
  //     • If yes → hold remains released (user had proactively placed enough PV).
  //     • If no  → invalidate hold_released so user must place more PV.
  //
  // BUG IN ORIGINAL: always set hold_released = false without checking
  // if pv_fulfilled already satisfies the new pv_required.
  // ─────────────────────────────────────────────────────────────────────
  if (newPvReq > prevPvReq) {
    tracker.pv_required = newPvReq;

    if (tracker.pv_fulfilled < newPvReq) {
      // User hasn't met the new threshold yet → put on hold
      tracker.hold_released    = false;
      tracker.hold_released_at = undefined;
    }
    // else: pv_fulfilled >= newPvReq → hold stays released, nothing to do
  }

  await tracker.save();

  // ── 3. Determine final status ─────────────────────────────────────────
  //
  // thisMonthOnHold is true when:
  //   - A PV obligation exists for this month (pv_required > 0), AND
  //   - That obligation hasn't been fully met yet (hold_released = false)
  //
  // Note: we use tracker.hold_released (not pv_fulfilled < pv_required directly)
  // because hold_released is the canonical flag — it accounts for the case where
  // pv_required was 0 and then became non-zero (hold_released starts false by
  // default and is only set true by recordPvFulfillment).
  const thisMonthOnHold =
    tracker.pv_required > 0 && !tracker.hold_released;

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
 * ─── canRelease conditions ────────────────────────────────────────────────
 *
 *  canRelease = true ONLY when ALL of:
 *    1. pv_required > 0          (an obligation existed)
 *    2. newFulfilled >= pv_required  (this order pushed fulfilled over the line)
 *
 *  canRelease = false when:
 *    - No PV obligation (pv_required = 0) — nothing to release
 *    - Partial fulfillment — user still needs more PV
 *
 * ─── Example ─────────────────────────────────────────────────────────────
 *
 *  Month: 2025-03, pv_required = 100, pv_fulfilled = 50
 *  User places order of 50 PV → newFulfilled = 100 → canRelease = true ✅
 *
 *  Month: 2025-03, pv_required = 100, pv_fulfilled = 0
 *  User places order of 50 PV → newFulfilled = 50 → canRelease = false ✅
 *  (user still needs 50 more)
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
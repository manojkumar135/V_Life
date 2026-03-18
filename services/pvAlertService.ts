// services/pvAlertService.ts
//
// ═══════════════════════════════════════════════════════════════════════════
// PURPOSE
// ═══════════════════════════════════════════════════════════════════════════
//
//  Single responsibility: calculate and return PV obligation summary
//  for a user across ALL uncleared months.
//
//  Used to:
//    • Show alert on user dashboard / wallet page
//    • Display per-month breakdown of PV required vs fulfilled
//    • Tell user exactly how much PV they need to place to release holds
//
// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════
//
//  getPvAlertSummary(user_id)
//    Returns full PV obligation summary across all uncleared months.
//    Includes per-month breakdown + totals + alert message.
//
//  hasPvAlert(user_id)
//    Lightweight check — returns true if user has ANY uncleared PV obligation.
//    Use this for badge/dot indicators without fetching full summary.
//
// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════
//
//  PvMonthBreakdown
//    Per-month PV obligation detail.
//
//  PvAlertSummary
//    Full summary returned by getPvAlertSummary().
//    Contains months[] + totals + alertMessage + hasAlert flag.
//
// ═══════════════════════════════════════════════════════════════════════════

import { MonthlyPayoutTracker } from "@/models/monthlyPayoutTracker";
import { connectDB }            from "@/lib/mongodb";

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────

export interface PvMonthBreakdown {
    /** "YYYY-MM" */
    month:        string;
    pv_required:  number;
    pv_fulfilled: number;
    /** pv_required - pv_fulfilled */
    pv_remaining: number;
    /** true if pv_remaining === 0 */
    cleared:      boolean;
}

export interface PvAlertSummary {
    /** true if user has ANY uncleared PV obligation */
    hasAlert:         boolean;
    /** sum of pv_required across ALL uncleared months */
    totalPvRequired:  number;
    /** sum of pv_fulfilled across ALL uncleared months */
    totalPvFulfilled: number;
    /** sum of pv_remaining across ALL uncleared months */
    totalPvRemaining: number;
    /** per-month breakdown — oldest month first */
    months:           PvMonthBreakdown[];
    /** human-readable message to show user */
    alertMessage:     string;
}

// ─────────────────────────────────────────────────────────────────────────
// getPvAlertSummary
// ─────────────────────────────────────────────────────────────────────────

/**
 * Returns full PV obligation summary for a user.
 *
 * Fetches ALL months where:
 *   - pv_required > 0    (a PV obligation was triggered)
 *   - hold_released = false  (not yet cleared)
 *
 * ─── Example: Single month pending ───────────────────────────────────────
 *
 *  {
 *    hasAlert:         true,
 *    totalPvRequired:  50,
 *    totalPvFulfilled: 0,
 *    totalPvRemaining: 50,
 *    months: [
 *      {
 *        month:        "2026-03",
 *        pv_required:  50,
 *        pv_fulfilled: 0,
 *        pv_remaining: 50,
 *        cleared:      false
 *      }
 *    ],
 *    alertMessage: "You need to place 50 PV to release your held payouts."
 *  }
 *
 * ─── Example: Multiple months pending ────────────────────────────────────
 *
 *  {
 *    hasAlert:         true,
 *    totalPvRequired:  150,
 *    totalPvFulfilled: 50,
 *    totalPvRemaining: 100,
 *    months: [
 *      { month: "2026-01", pv_required: 50, pv_fulfilled: 50, pv_remaining: 0,  cleared: true  },
 *      { month: "2026-02", pv_required: 50, pv_fulfilled: 0,  pv_remaining: 50, cleared: false },
 *      { month: "2026-03", pv_required: 50, pv_fulfilled: 0,  pv_remaining: 50, cleared: false }
 *    ],
 *    alertMessage: "You need to place 100 PV across 2 month(s) to release your held payouts."
 *  }
 *
 * ─── Example: No pending obligations ─────────────────────────────────────
 *
 *  {
 *    hasAlert:         false,
 *    totalPvRequired:  0,
 *    totalPvFulfilled: 0,
 *    totalPvRemaining: 0,
 *    months:           [],
 *    alertMessage:     "All PV obligations fulfilled. No holds pending."
 *  }
 */
export async function getPvAlertSummary(
    user_id: string
): Promise<PvAlertSummary> {
    await connectDB();

    // ── Fetch all uncleared months ────────────────────────────────────────
    const trackers = await MonthlyPayoutTracker.find({
        user_id,
        pv_required:   { $gt: 0 },
        hold_released: false,
    })
    .sort({ month: 1 })  // oldest first
    .lean() as any[];

    // ── No obligations ────────────────────────────────────────────────────
    if (trackers.length === 0) {
        return {
            hasAlert:         false,
            totalPvRequired:  0,
            totalPvFulfilled: 0,
            totalPvRemaining: 0,
            months:           [],
            alertMessage:     "All PV obligations fulfilled. No holds pending.",
        };
    }

    // ── Build per-month breakdown ─────────────────────────────────────────
    const months: PvMonthBreakdown[] = trackers.map((t) => {
        const pv_remaining = t.pv_required - t.pv_fulfilled;
        return {
            month:        t.month,
            pv_required:  t.pv_required,
            pv_fulfilled: t.pv_fulfilled,
            pv_remaining: pv_remaining,
            cleared:      pv_remaining === 0,
        };
    });

    // ── Calculate totals ──────────────────────────────────────────────────
    const totalPvRequired  = months.reduce((s, m) => s + m.pv_required,  0);
    const totalPvFulfilled = months.reduce((s, m) => s + m.pv_fulfilled, 0);
    const totalPvRemaining = months.reduce((s, m) => s + m.pv_remaining, 0);

    // ── Count how many months still need PV ──────────────────────────────
    const pendingMonthsCount = months.filter((m) => !m.cleared).length;

    // ── Build alert message ───────────────────────────────────────────────
    const alertMessage = totalPvRemaining > 0
        ? `You need to place ${totalPvRemaining} PV across ` +
          `${pendingMonthsCount} month(s) to release your held payouts.`
        : "All PV obligations fulfilled. No holds pending.";

    return {
        hasAlert:         totalPvRemaining > 0,
        totalPvRequired,
        totalPvFulfilled,
        totalPvRemaining,
        months,
        alertMessage,
    };
}

// ─────────────────────────────────────────────────────────────────────────
// hasPvAlert  — lightweight check (no full summary needed)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Returns true if the user has ANY uncleared PV obligation.
 *
 * Use this for:
 *   - Badge / dot indicators on nav icons
 *   - Quick conditional rendering without loading full summary
 *
 * Much cheaper than getPvAlertSummary() — only does a countDocuments().
 *
 * ─── Example usage ────────────────────────────────────────────────────────
 *
 *   const showBadge = await hasPvAlert("IND2215728");
 *   // true → show red dot on wallet icon
 */
export async function hasPvAlert(user_id: string): Promise<boolean> {
    await connectDB();

    const count = await MonthlyPayoutTracker.countDocuments({
        user_id,
        pv_required:   { $gt: 0 },
        hold_released: false,
    });

    return count > 0;
}
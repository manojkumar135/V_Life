// services/releaseHoldHelper.ts
//
// ─── Purpose ──────────────────────────────────────────────────────────────
//
//  Called when a user sets up their wallet (adds bank account / verifies PAN).
//  Attempts to release all their OnHold payouts, but only if BOTH conditions
//  are satisfied:
//
//    1. Wallet condition  → account_number exists
//
//    2. Monthly PV condition → every month that has OnHold payouts must have
//                              its PV obligation fully met (hold_released = true
//                              in MonthlyPayoutTracker) AND no prior month
//                              blocks it.
//
//  If a month's PV obligation is still uncleared, those payouts remain OnHold
//  even if the wallet is now set up. They will be released later by
//  processPvOrder → releaseHeldPayoutsForMonth when the user places the
//  required PV order.
//
// ─── Change from original ─────────────────────────────────────────────────
//
//  REMOVED (wallet-side hold logic):
//    const totalPayout   = await getTotalPayout(user_id);    // lifetime total
//    const pv            = wallet.pv || 0;                   // wallet.pv field
//    const walletClear   = isPanVerified || !checkHoldStatus(totalPayout, pv);
//    if (!walletClear) return;
//
//  WHY: checkHoldStatus used the LIFETIME total payout and the wallet.pv
//  field (a legacy one-time field). This conflicted with the new monthly
//  PV tracking system. The monthly tracker already handles ALL hold/release
//  decisions; the wallet check only needs to confirm the bank account exists.
//
//  REPLACED WITH:
//    Simple wallet presence check only — if account_number exists, proceed.
//    All PV-related hold decisions are delegated to the monthly tracker logic.
//
//  ALSO FIXED: Untracked months query
//    Original used `created_at: { $exists: false }` in updateMany which
//    never matched real documents (all have created_at). Now correctly
//    queries by the actual set of untracked created_at timestamps.
//
// ─── When to call ─────────────────────────────────────────────────────────
//
//   // After user saves bank details or PAN is verified:
//   import { releaseOnHoldPayouts } from "@/services/releaseHoldHelper";
//   await releaseOnHoldPayouts(user_id);
//
// ─── What it does NOT do ──────────────────────────────────────────────────
//
//  It does NOT release payouts for months where the PV obligation is unmet.
//  Those are handled exclusively by processPvOrder.ts.
//
// ──────────────────────────────────────────────────────────────────────────

import { DailyPayout, WeeklyPayout } from "@/models/payout";
import { Wallet }                    from "@/models/wallet";
import { MonthlyPayoutTracker }      from "@/models/monthlyPayoutTracker";
import { Alert }                     from "@/models/alert";
import { hasPreviousUnresolvedHolds } from "@/services/monthlyHoldService";

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

/** Converts a Date to its "YYYY-MM" month string */
function toMonthString(date: Date): string {
  const yyyy = date.getFullYear();
  const mm   = String(date.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

// ─────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────

/**
 * Release all OnHold payouts for a user once their wallet is set up,
 * respecting the monthly PV obligations.
 *
 * Wallet condition (simplified):
 *   - account_number must exist. That's the only wallet-side gate.
 *   - PAN verified or not does NOT affect hold release here — it only
 *     affects the TDS split when the payout was created.
 *
 * For each month that has OnHold payouts:
 *   - If that month's PV obligation is unmet → skip (leave OnHold)
 *   - If that month is blocked by a prior uncleared month → skip (leave OnHold)
 *   - If wallet condition passes AND PV is clear → release
 */
export async function releaseOnHoldPayouts(user_id: string) {
  // ── 1. Wallet check ───────────────────────────────────────────────────
  //
  // Only gate: does the user have a bank account set up?
  // All PV hold logic is handled by the monthly tracker — we no longer
  // use getTotalPayout + checkHoldStatus here.
  const wallet = await Wallet.findOne({ user_id });
  if (!wallet || !wallet.account_number) return; // no wallet yet → skip

  const walletFields = {
    wallet_id:           wallet.wallet_id,
    account_holder_name: wallet.account_holder_name,
    bank_name:           wallet.bank_name,
    account_number:      wallet.account_number,
    ifsc_code:           wallet.ifsc_code,
    pan_verified:        wallet.pan_verified,
  };

  const now           = new Date();
  let   totalReleased = 0;
  let   totalSkipped  = 0;

  // ── 2. Find all tracked months for this user ──────────────────────────
  const trackers = await MonthlyPayoutTracker.find({ user_id })
    .sort({ month: 1 })
    .lean();

  const trackedMonths = new Set(trackers.map((t) => t.month));

  // ── 3. Process each tracked month ─────────────────────────────────────
  for (const tracker of trackers) {
    const month = tracker.month;

    // Is this month's own PV obligation met?
    const pvObligationMet =
      tracker.pv_required === 0 ||     // no obligation for this month
      tracker.hold_released === true;   // obligation was fully met

    if (!pvObligationMet) {
      console.log(
        `[releaseOnHoldPayouts] Skipping ${month} for ${user_id} — ` +
        `PV obligation not met (${tracker.pv_fulfilled}/${tracker.pv_required} PV).`
      );
      totalSkipped++;
      continue;
    }

    // Is this month blocked by a prior uncleared month?
    const blockedByPrior = await hasPreviousUnresolvedHolds(user_id, month);
    if (blockedByPrior) {
      console.log(
        `[releaseOnHoldPayouts] Skipping ${month} for ${user_id} — ` +
        `blocked by a prior month's uncleared PV obligation.`
      );
      totalSkipped++;
      continue;
    }

    // ── Both conditions clear → release this month ─────────────────────
    const dateRange = monthDateRange(month);

    const releaseNote =
      tracker.pv_required > 0
        ? `Wallet set up + PV obligation met (${tracker.pv_fulfilled}/${tracker.pv_required} PV)`
        : `Wallet set up — no PV obligation for ${month}`;

    const dailyResult = await DailyPayout.updateMany(
      { user_id, status: "OnHold", created_at: dateRange },
      {
        $set: {
          status:              "Pending",
          hold_released_at:    now,
          hold_release_reason: releaseNote,
          last_modified_by:    "system",
          last_modified_at:    now,
          ...walletFields,
        },
      }
    );

    const weeklyResult = await WeeklyPayout.updateMany(
      { user_id, status: "OnHold", created_at: dateRange },
      {
        $set: {
          status:              "Pending",
          hold_released_at:    now,
          hold_release_reason: releaseNote,
          last_modified_by:    "system",
          last_modified_at:    now,
          ...walletFields,
        },
      }
    );

    const released = dailyResult.modifiedCount + weeklyResult.modifiedCount;
    totalReleased += released;

    if (released > 0) {
      console.log(
        `[releaseOnHoldPayouts] Released ${released} payouts for ${user_id} in ${month}.`
      );
    }
  }

  // ── 4. Handle untracked months (pre-system payouts) ───────────────────
  //
  // Payouts that pre-date the MonthlyPayoutTracker system won't have a
  // tracker entry. Identify their months from created_at timestamps and
  // release them — they were created before PV tracking existed so no
  // PV obligation applies.
  //
  // FIX from original: the original code used `created_at: { $exists: false }`
  // which never matches real documents. We now correctly identify untracked
  // payouts by their month and query them using actual date ranges.

  // Collect all distinct months that have OnHold payouts but no tracker
  const allOnHoldPayouts = await DailyPayout.find({
    user_id,
    status: "OnHold",
  })
    .select("created_at")
    .lean();

  const untrackedMonthsSet = new Set<string>();
  for (const p of allOnHoldPayouts) {
    if (!p.created_at) continue;
    const monthStr = toMonthString(new Date(p.created_at));
    if (!trackedMonths.has(monthStr)) {
      untrackedMonthsSet.add(monthStr);
    }
  }

  for (const month of untrackedMonthsSet) {
    const dateRange   = monthDateRange(month);
    const releaseNote = `Wallet set up — pre-system payout released (${month})`;

    const dailyResult = await DailyPayout.updateMany(
      { user_id, status: "OnHold", created_at: dateRange },
      {
        $set: {
          status:              "Pending",
          hold_released_at:    now,
          hold_release_reason: releaseNote,
          last_modified_by:    "system",
          last_modified_at:    now,
          ...walletFields,
        },
      }
    );

    const weeklyResult = await WeeklyPayout.updateMany(
      { user_id, status: "OnHold", created_at: dateRange },
      {
        $set: {
          status:              "Pending",
          hold_released_at:    now,
          hold_release_reason: releaseNote,
          last_modified_by:    "system",
          last_modified_at:    now,
          ...walletFields,
        },
      }
    );

    const released = dailyResult.modifiedCount + weeklyResult.modifiedCount;
    totalReleased += released;

    if (released > 0) {
      console.log(
        `[releaseOnHoldPayouts] Released ${released} pre-system payouts for ${user_id} in ${month}.`
      );
    }
  }

  // ── 5. Alert user if anything was released ────────────────────────────
  if (totalReleased > 0) {
    await Alert.create({
      user_id,
      title:       "💰 Held Payouts Released",
      description: `${totalReleased} held payout(s) have been released to Pending after your wallet was set up.`,
      role:        "user",
      priority:    "high",
      read:        false,
      link:        "/wallet/payout/daily",
      date:        formatDate(now),
      created_at:  now,
    });
  }

  if (totalSkipped > 0) {
    console.log(
      `[releaseOnHoldPayouts] ${user_id} — ${totalSkipped} month(s) still on hold due to unmet PV obligation.`
    );
  }

  console.log(
    `[releaseOnHoldPayouts] Done for ${user_id} — released: ${totalReleased}, skipped months: ${totalSkipped}`
  );
}
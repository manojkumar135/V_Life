// services/payoutHoldService.ts
//
// ═══════════════════════════════════════════════════════════════════════════
// PURPOSE
// ═══════════════════════════════════════════════════════════════════════════
//
//  Single source of truth for ALL payout hold and release decisions.
//
//  Every payout goes through TWO phases:
//
//   PHASE 1 — CREATION  →  determineHoldReasons()
//     Before saving a payout, call this to know:
//       • Should this payout be OnHold or Pending?
//       • If OnHold, exactly WHY? (saved on the payout record itself)
//
//   PHASE 2 — RELEASE   →  releasePayoutsForUser()
//     When any blocking condition is resolved, call this to:
//       • Re-check all OnHold payouts for this user
//       • Release ones whose every blocking reason is now cleared
//       • Update remaining reasons on still-blocked payouts
//       • Record exactly WHY and WHEN each payout was released
//
// ═══════════════════════════════════════════════════════════════════════════
// FOUR HOLD REASONS
// ═══════════════════════════════════════════════════════════════════════════
//
//  Code                  │ When it applies
//  ──────────────────────┼────────────────────────────────────────────────
//  NO_WALLET             │ No wallet document exists for this user
//  WALLET_INACTIVE       │ Wallet exists but wallet.status ≠ "active"
//  WALLET_UNDER_REVIEW   │ A WalletChangeRequest with status="pending" exists
//  PV_NOT_FULFILLED      │ Monthly PV obligation not met OR prior month uncleared
//
//  A payout can be held for MULTIPLE reasons simultaneously.
//  ALL reasons must be cleared before the payout is released.
//
// ═══════════════════════════════════════════════════════════════════════════
// RELEASE TRIGGERS
// ═══════════════════════════════════════════════════════════════════════════
//
//  Event                          │ Call
//  ───────────────────────────────┼──────────────────────────────────────────
//  Wallet created (first save)    │ releaseOnWalletCreated(user_id)
//  Wallet status → "active"       │ releaseOnWalletActivated(user_id)
//  WalletChangeRequest approved   │ releaseOnWalletReviewApproved(user_id)
//  PV order fulfilled             │ releaseOnPvFulfilled(user_id)
//
// ═══════════════════════════════════════════════════════════════════════════
// PAYOUT SCHEMA — NEW FIELDS TO ADD
// ═══════════════════════════════════════════════════════════════════════════
//
//  hold_reasons:         { type: [String], default: [] }
//    Array of HoldReason codes saved when payout is created OnHold.
//    Updated as conditions are resolved (even before full release).
//    Empty array = no hold / fully released.
//
//  hold_reason_labels:   { type: [String], default: [] }
//    Human-readable version of hold_reasons. For display only.
//
//  hold_released_at:     { type: Date }
//    Timestamp when payout moved OnHold → Pending.
//
//  hold_release_reason:  { type: String }
//    On creation (OnHold): "Payout held: reason1; reason2"
//    On release:           "Released by: X. Original hold: Y. Released at: Z"
//
//  hold_release_trigger: { type: String }
//    Which event triggered the release. One of the ReleaseTrigger codes.
//
// ═══════════════════════════════════════════════════════════════════════════

import { DailyPayout, WeeklyPayout } from "@/models/payout";
import { Wallet } from "@/models/wallet";
import { WalletChangeRequest } from "@/models/walletChangeRequest";
import { MonthlyPayoutTracker } from "@/models/monthlyPayoutTracker";
import { Alert } from "@/models/alert";
import { connectDB } from "@/lib/mongodb";
import {
  hasPreviousUnresolvedHolds,
  currentMonth,
} from "@/services/monthlyHoldService";

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────

export type HoldReason =
  | "NO_WALLET"
  | "WALLET_INACTIVE"
  | "WALLET_UNDER_REVIEW"
  | "PV_NOT_FULFILLED";

export type ReleaseTrigger =
  | "wallet_created"
  | "wallet_activated"
  | "wallet_review_approved"
  | "pv_fulfilled";

const HOLD_LABELS: Record<HoldReason, string> = {
  NO_WALLET: "No wallet set up",
  WALLET_INACTIVE: "Wallet is inactive",
  WALLET_UNDER_REVIEW: "Wallet is under review (change request pending)",
  PV_NOT_FULFILLED: "Monthly PV purchase obligation not fulfilled",
};

const TRIGGER_LABELS: Record<ReleaseTrigger, string> = {
  wallet_created: "Wallet was created",
  wallet_activated: "Wallet was activated",
  wallet_review_approved: "Wallet change request was approved",
  pv_fulfilled: "Monthly PV obligation was fulfilled",
};

export interface HoldDecision {
  status: "Pending" | "OnHold";
  reasons: HoldReason[];
  labels: string[];
  /** Single string summarising all hold reasons — save as hold_release_reason on payout */
  summary: string;
  /** Wallet bank fields to embed in payout. null if no wallet exists. */
  walletFields: Record<string, any> | null;
}

export interface ReleaseResult {
  trigger: ReleaseTrigger;
  totalReleased: number;
  totalSkipped: number;
  releasedMonths: string[];
  skippedMonths: Array<{ month: string; reasons: string[] }>;
}

// ─────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function toMonthString(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

async function walletHasPendingReview(wallet_id: string): Promise<boolean> {
  const pending = await WalletChangeRequest.findOne({
    wallet_id,
    status: "pending",
  }).lean();
  return !!pending;
}

// ─────────────────────────────────────────────────────────────────────────
// Core: evaluate all 4 conditions for a user
// Returns per-condition booleans + the wallet object
// ─────────────────────────────────────────────────────────────────────────

interface WalletConditions {
  wallet: any | null;
  walletMissing: boolean;
  walletInactive: boolean;
  walletUnderReview: boolean;
}

async function evaluateWalletConditions(
  user_id: string,
): Promise<WalletConditions> {
  const wallet = (await Wallet.findOne({ user_id }).lean()) as any;

  const walletMissing = !wallet || !wallet.account_number;
  const walletInactive =
    !walletMissing && wallet.status && wallet.status !== "active";
  const walletUnderReview = !walletMissing
    ? await walletHasPendingReview(wallet.wallet_id)
    : false;

  return { wallet, walletMissing, walletInactive, walletUnderReview };
}

async function evaluatePvCondition(
  user_id: string,
  month: string,
): Promise<boolean> {
  const blockedByPrior = await hasPreviousUnresolvedHolds(user_id, month);
  if (blockedByPrior) return true;

  const tracker = (await MonthlyPayoutTracker.findOne({
    user_id,
    month,
  }).lean()) as any;
  return !!(
    tracker &&
    tracker.pv_required > 0 &&
    tracker.hold_released === false
  );
}

// ─────────────────────────────────────────────────────────────────────────
// PHASE 1 — determineHoldReasons
// ─────────────────────────────────────────────────────────────────────────

/**
 * Call this RIGHT BEFORE creating any DailyPayout or WeeklyPayout.
 *
 * Checks all four hold conditions and returns:
 *   • status       — "Pending" or "OnHold"
 *   • reasons      — array of HoldReason codes  (save as hold_reasons)
 *   • labels       — human-readable reasons      (save as hold_reason_labels)
 *   • summary      — single string               (save as hold_release_reason)
 *   • walletFields — bank details to embed in payout
 *
 * NOTE: This does NOT update MonthlyPayoutTracker totals.
 * You must still call evaluateAndUpdateHoldStatus() from monthlyHoldService
 * separately to keep total_payout and pv_required in sync on the tracker.
 * This function only READS the tracker to check PV block status.
 *
 * ─── Example usage in a bonus service ────────────────────────────────────
 *
 *   // 1. Update monthly tracker total (from monthlyHoldService)
 *   const { status: pvStatus } = await evaluateAndUpdateHoldStatus(
 *     sponsorId, BONUS_AMOUNT
 *   );
 *
 *   // 2. Get full hold decision with all reasons (from this service)
 *   const hold = await determineHoldReasons(sponsorId, currentMonth());
 *
 *   // 3. Create payout with all hold metadata saved
 *   await DailyPayout.create({
 *     ...payoutData,
 *     status:               hold.status,
 *     hold_reasons:         hold.reasons,
 *     hold_reason_labels:   hold.labels,
 *     hold_release_reason:  hold.summary,
 *     ...hold.walletFields,
 *   });
 */
export async function determineHoldReasons(
  user_id: string,
  month: string = currentMonth(),
): Promise<HoldDecision> {
  await connectDB();

  const reasons: HoldReason[] = [];

  // ── Evaluate all 4 conditions ─────────────────────────────────────────
  const { wallet, walletMissing, walletInactive, walletUnderReview } =
    await evaluateWalletConditions(user_id);

  if (walletMissing) reasons.push("NO_WALLET");
  if (walletInactive) reasons.push("WALLET_INACTIVE");
  if (walletUnderReview) reasons.push("WALLET_UNDER_REVIEW");

  const pvBlocked = await evaluatePvCondition(user_id, month);
  if (pvBlocked) reasons.push("PV_NOT_FULFILLED");

  // ── Build result ──────────────────────────────────────────────────────
  const labels = reasons.map((r) => HOLD_LABELS[r]);
  const isOnHold = reasons.length > 0;

  const summary = isOnHold
    ? `Payout held: ${labels.join("; ")}`
    : "All conditions met";

  const isPanVerified =
    wallet?.pan_verified === true ||
    String(wallet?.pan_verified).toLowerCase() === "yes";

  const walletFields: Record<string, any> | null = wallet
    ? {
        wallet_id: wallet.wallet_id ?? "",
        account_holder_name: wallet.account_holder_name ?? "",
        bank_name: wallet.bank_name ?? "",
        account_number: wallet.account_number ?? "",
        ifsc_code: wallet.ifsc_code ?? "",
        pan_verified: isPanVerified,
      }
    : null;

  return {
    status: isOnHold ? "OnHold" : "Pending",
    reasons,
    labels,
    summary,
    walletFields,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// PHASE 2 — releasePayoutsForUser
// ─────────────────────────────────────────────────────────────────────────

/**
 * Re-evaluates every OnHold payout for a user after a blocking condition
 * has been resolved. Releases payouts whose ALL hold reasons are now cleared.
 *
 * For still-blocked payouts, updates hold_reasons to reflect current state
 * (e.g. wallet is now fine but PV still unmet → removes NO_WALLET,
 *  keeps PV_NOT_FULFILLED). This keeps admin dashboard reasons accurate.
 *
 * ─── When to call ─────────────────────────────────────────────────────────
 *
 *   Wallet API — after wallet is first created:
 *     await releasePayoutsForUser(user_id, "wallet_created");
 *
 *   Wallet API — after wallet.status set to "active":
 *     await releasePayoutsForUser(user_id, "wallet_activated");
 *
 *   WalletChangeRequest API — after request is approved:
 *     await releasePayoutsForUser(user_id, "wallet_review_approved");
 *
 *   processPvOrder — after pv_fulfilled >= pv_required:
 *     await releasePayoutsForUser(user_id, "pv_fulfilled");
 *
 * ─── What is saved on release ─────────────────────────────────────────────
 *
 *   status               → "Pending"
 *   hold_reasons         → []
 *   hold_reason_labels   → []
 *   hold_released_at     → now
 *   hold_release_reason  → "Released by: <trigger>. Original hold: <reasons>. At: <datetime>"
 *   hold_release_trigger → trigger code (e.g. "wallet_activated")
 *   + wallet bank fields updated to latest values
 */
export async function releasePayoutsForUser(
  user_id: string,
  trigger: ReleaseTrigger,
): Promise<ReleaseResult> {
  await connectDB();

  const now = new Date();
  const triggerLabel = TRIGGER_LABELS[trigger];
  let totalReleased = 0;
  let totalSkipped = 0;
  const releasedMonths = new Set<string>();
  const skippedMonths: Array<{ month: string; reasons: string[] }> = [];

  // ── 1. Fetch wallet + pre-compute wallet-level conditions ─────────────
  //  These are the same for all payouts of this user — compute once.
  const { wallet, walletMissing, walletInactive, walletUnderReview } =
    await evaluateWalletConditions(user_id);

    const isPanVerified =
  wallet?.pan_verified === true ||
  String(wallet?.pan_verified).toLowerCase() === "yes";

  const walletFields: Record<string, any> = wallet
    ? {
        wallet_id: wallet.wallet_id ?? "",
        account_holder_name: wallet.account_holder_name ?? "",
        bank_name: wallet.bank_name ?? "",
        account_number: wallet.account_number ?? "",
        ifsc_code: wallet.ifsc_code ?? "",
        pan_verified: isPanVerified,
      }
    : {};

  // ── 2. Fetch all OnHold payouts for this user ─────────────────────────
  const [dailyOnHold, weeklyOnHold] = await Promise.all([
    DailyPayout.find({ user_id, status: "OnHold" })
      .select("_id payout_id created_at hold_reasons hold_reason_labels")
      .lean(),
    WeeklyPayout.find({ user_id, status: "OnHold" })
      .select("_id payout_id created_at hold_reasons hold_reason_labels")
      .lean(),
  ]);

  const allOnHold = [
    ...dailyOnHold.map((p: any) => ({ ...p, _model: DailyPayout })),
    ...weeklyOnHold.map((p: any) => ({ ...p, _model: WeeklyPayout })),
  ];

  if (allOnHold.length === 0) {
    return {
      trigger,
      totalReleased: 0,
      totalSkipped: 0,
      releasedMonths: [],
      skippedMonths: [],
    };
  }

  // ── 3. Cache PV check per month ───────────────────────────────────────
  //  PV check involves DB queries — cache results to avoid N×2 queries
  //  when many payouts fall in the same month.
  const pvCache = new Map<string, boolean>(); // month → isBlocked

  async function pvBlockedForMonth(month: string): Promise<boolean> {
    if (pvCache.has(month)) return pvCache.get(month)!;
    const blocked = await evaluatePvCondition(user_id, month);
    pvCache.set(month, blocked);
    return blocked;
  }

  // ── 4. Process each OnHold payout ────────────────────────────────────
  for (const payout of allOnHold) {
    const payoutMonth = payout.created_at
      ? toMonthString(new Date(payout.created_at))
      : currentMonth();

    // Re-evaluate all 4 conditions fresh
    const remainingReasons: HoldReason[] = [];
    if (walletMissing) remainingReasons.push("NO_WALLET");
    if (walletInactive) remainingReasons.push("WALLET_INACTIVE");
    if (walletUnderReview) remainingReasons.push("WALLET_UNDER_REVIEW");

    const pvBlocked = await pvBlockedForMonth(payoutMonth);
    if (pvBlocked) remainingReasons.push("PV_NOT_FULFILLED");

    if (remainingReasons.length === 0) {
      // ── All clear → RELEASE ──────────────────────────────────────────
      const originalReasons =
        ((payout.hold_reasons as string[]) ?? []).join(", ") || "not recorded";

      const releaseNote =
        `Released by: ${triggerLabel}. ` +
        `Original hold reasons: [${originalReasons}]. ` +
        `Released at: ${formatDate(now)} ${now.toTimeString().slice(0, 5)}`;

      await payout._model.updateOne(
        { _id: payout._id },
        {
          $set: {
            status: "Pending",
            hold_reasons: [],
            hold_reason_labels: [],
            hold_released_at: now,
            hold_release_reason: releaseNote,
            hold_release_trigger: trigger,
            last_modified_by: "system",
            last_modified_at: now,
            ...walletFields,
          },
        },
      );

      totalReleased++;
      releasedMonths.add(payoutMonth);

      console.log(
        `[releasePayoutsForUser] ✅ Released ${payout.payout_id} ` +
          `(${payoutMonth}) — trigger: ${trigger}`,
      );
    } else {
      // ── Still blocked → UPDATE reasons to current state ───────────────
      //
      // Some original reasons may now be cleared (e.g. wallet is set up)
      // but others remain (e.g. PV still needed).
      // Update hold_reasons so the admin dashboard always shows
      // the CURRENT blocking reasons, not stale ones from creation time.
      const updatedLabels = remainingReasons.map((r) => HOLD_LABELS[r]);

      await payout._model.updateOne(
        { _id: payout._id },
        {
          $set: {
            hold_reasons: remainingReasons,
            hold_reason_labels: updatedLabels,
            hold_release_reason: `Still held: ${updatedLabels.join("; ")}`,
            last_modified_by: "system",
            last_modified_at: now,
          },
        },
      );

      totalSkipped++;
      skippedMonths.push({
        month: payoutMonth,
        reasons: updatedLabels,
      });

      console.log(
        `[releasePayoutsForUser] ⏳ Still held ${payout.payout_id} ` +
          `(${payoutMonth}) — remaining: ${remainingReasons.join(", ")}`,
      );
    }
  }

  // ── 5. Alert user if anything was released ───────────────────────────
  if (totalReleased > 0) {
    await Alert.create({
      user_id,
      title: "💰 Held Payouts Released",
      description: `${totalReleased} payout(s) moved to Pending. Reason: ${triggerLabel}.`,
      role: "user",
      priority: "high",
      read: false,
      link: "/wallet/payout/daily",
      date: formatDate(now),
      created_at: now,
    });
  }

  console.log(
    `[releasePayoutsForUser] Done | user: ${user_id} | trigger: ${trigger} | ` +
      `released: ${totalReleased} | skipped: ${totalSkipped}`,
  );

  return {
    trigger,
    totalReleased,
    totalSkipped,
    releasedMonths: [...releasedMonths],
    skippedMonths,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Named convenience exports — use these in your API routes
// ─────────────────────────────────────────────────────────────────────────

/** After wallet document is first created */
export const releaseOnWalletCreated = (user_id: string) =>
  releasePayoutsForUser(user_id, "wallet_created");

/** After wallet.status is updated to "active" */
export const releaseOnWalletActivated = (user_id: string) =>
  releasePayoutsForUser(user_id, "wallet_activated");

/** After a WalletChangeRequest is approved */
export const releaseOnWalletReviewApproved = (user_id: string) =>
  releasePayoutsForUser(user_id, "wallet_review_approved");

/** After PV order fulfills the monthly obligation — call from processPvOrder */
export const releaseOnPvFulfilled = (user_id: string) =>
  releasePayoutsForUser(user_id, "pv_fulfilled");

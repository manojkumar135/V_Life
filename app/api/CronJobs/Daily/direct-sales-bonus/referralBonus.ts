// services/releaseReferralBonus.ts
//
// ─── Change from original ─────────────────────────────────────────────────
//
//  REMOVED:
//    const user = await User.findOne({ user_id: sponsorId });
//    const previous = await getTotalPayout(sponsorId);
//    const afterThis = previous + REFERRAL_AMOUNT;
//    else if (checkHoldStatus(afterThis, user?.pv ?? 0)) status = "OnHold";
//
//  REPLACED WITH:
//    const { status: monthlyStatus } = await evaluateAndUpdateHoldStatus(
//      sponsorId, REFERRAL_AMOUNT
//    );
//    if (status !== "OnHold") status = monthlyStatus;
//
//  Also removed `checkHoldStatus` from the totalpayout import
//  (getTotalPayout is still imported — used for club/rank update below).
//  User.findOne for sponsorId is still present for club/rank update.
//
// ─── Latest change ────────────────────────────────────────────────────────
//
//  PROBLEM: hold_reasons and hold_reason_labels were always saved as []
//           even when status was OnHold, making it impossible to know WHY
//           a payout was held.
//
//  FIX:
//    ADDED import: determineHoldReasons from payoutHoldService
//    ADDED import: currentMonth from monthlyHoldService
//
//    REPLACED status-determination block:
//      Before: manual wallet check + evaluateAndUpdateHoldStatus separately
//      After:  evaluateAndUpdateHoldStatus (writes tracker) first,
//              then determineHoldReasons (reads all 4 conditions) for full
//              hold metadata.
//
//    ADDED to DailyPayout.create():
//      hold_reasons, hold_reason_labels, hold_release_reason
//
//  EVERYTHING ELSE IS IDENTICAL TO THE ORIGINAL.
//
// ──────────────────────────────────────────────────────────────────────────

import { DailyPayout } from "@/models/payout";
import { Wallet } from "@/models/wallet";
import { User } from "@/models/user";
import TreeNode from "@/models/tree";
import { History } from "@/models/history";
import { Alert } from "@/models/alert";
import { addRewardScore } from "@/services/updateRewardScore";
import { updateClub } from "@/services/clubrank";
import { generateUniqueCustomId } from "@/utils/server/customIdGenerator";
import { getTotalPayout } from "@/services/totalpayout";
import {
  evaluateAndUpdateHoldStatus,
  currentMonth,
} from "@/services/monthlyHoldService";
import { determineHoldReasons } from "@/services/payoutHoldService";

function formatDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

const REFERRAL_AMOUNT = 2500;

export async function releaseReferralBonus({
  sponsorId,
  buyerId,
  orderId,
}: {
  sponsorId: string;
  buyerId: string;
  orderId: string;
}) {
  // ─────────────────────────────────────────────────────────────
  // ✅ INTERNAL DUPLICATE GUARD
  // This is the last line of defense. Even if the caller
  // (direct-sales-bonus) somehow calls this twice for the same
  // orderId + sponsorId, this check will block the second call.
  // Checks DailyPayout (where this function saves its record).
  // ─────────────────────────────────────────────────────────────
  const alreadyExists = await DailyPayout.findOne({
    order_id: orderId,
    user_id: sponsorId,
    name: "Referral Bonus",
  }).lean();

  if (alreadyExists) {
    console.log(
      `⚠️ [releaseReferralBonus] Already paid for order ${orderId} → sponsor ${sponsorId}, skipping.`,
    );
    return;
  }

  const node = await TreeNode.findOne({ user_id: sponsorId });
  if (!node || node.status !== "active") return;

  const wallet = await Wallet.findOne({ user_id: sponsorId });

  // ── Determine payout status ────────────────────────────────────────────
  //
  //  Hold priority (all 4 conditions checked via determineHoldReasons):
  //   1. No wallet / no account_number             → OnHold (NO_WALLET)
  //   2. Wallet exists but inactive                → OnHold (WALLET_INACTIVE)
  //   3. Wallet change request pending             → OnHold (WALLET_UNDER_REVIEW)
  //   4. Prior month PV uncleared / this month
  //      crossed threshold with PV unmet           → OnHold (PV_NOT_FULFILLED)
  //   5. All clear                                 → Pending
  //
  //  evaluateAndUpdateHoldStatus MUST be called first so that
  //  MonthlyPayoutTracker.total_payout is updated BEFORE
  //  determineHoldReasons reads it for the PV check.

  // Step 1: Update monthly tracker total (WRITE)
  await evaluateAndUpdateHoldStatus(sponsorId, REFERRAL_AMOUNT);

  // Step 2: Read all 4 hold conditions with full metadata (READ)
  const hold = await determineHoldReasons(sponsorId, currentMonth());

  let status: "Pending" | "OnHold" | "Completed" = hold.status;

  /* ------------------- Amount Split ------------------- */

  let withdraw = 0;
  let reward = 0;
  let tds = 0;
  let admin = 0;

  const isPanVerified =
    wallet?.pan_verified === true ||
    ["yes", "true"].includes(String(wallet?.pan_verified).toLowerCase());

  if (isPanVerified) {
    withdraw = Math.round(REFERRAL_AMOUNT * 0.8); // 80%
    reward = Math.round(REFERRAL_AMOUNT * 0.08); // 8%
    tds = Math.round(REFERRAL_AMOUNT * 0.02); // 2%
    admin = Math.round(REFERRAL_AMOUNT * 0.1); // 10%
  } else {
    withdraw = Math.round(REFERRAL_AMOUNT * 0.62); // 62%
    reward = Math.round(REFERRAL_AMOUNT * 0.08); // 8%
    tds = Math.round(REFERRAL_AMOUNT * 0.2); // 20%
    admin = Math.round(REFERRAL_AMOUNT * 0.1); // 10%
  }

  const payout_id = await generateUniqueCustomId("PY", DailyPayout, 8, 8);
  const istNow = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
  );

  const formattedDate = formatDate(istNow);
  /* ------------------- Detect Type ------------------- */
  const sourceHistory = await History.findOne({
    transaction_id: orderId,
    advance: true,
    first_payment: true,
  }).lean();

  const isAdvance = !!sourceHistory;

  /* ------------------- Create Daily Payout ------------------- */

  const payout = await DailyPayout.create({
    transaction_id: payout_id,
    payout_id,
    user_id: sponsorId,
    user_name: node.name,
    contact: node.contact,
    mail: node.mail,
    user_status: node.status,
    wallet_id: wallet?.wallet_id,
    rank: wallet?.rank,
    pan_verified: isPanVerified,

    name: "Referral Bonus",
    title: "Referral Bonus",
    date: formattedDate,
    time: istNow.toTimeString().slice(0, 5),

    amount: REFERRAL_AMOUNT,
    totalamount: REFERRAL_AMOUNT,
    withdraw_amount: withdraw,
    reward_amount: reward,
    tds_amount: tds,
    admin_charge: admin,

    to: sponsorId,
    from: buyerId,
    order_id: orderId,
    transaction_type: "Credit",
    status,

    // ✅ Hold metadata — now correctly populated so admin knows WHY
    hold_reasons: hold.reasons,
    hold_reason_labels: hold.labels,
    hold_release_reason: hold.summary,

    details: isAdvance
      ? `Referral Bonus for activation ${buyerId}`
      : `Referral Bonus for first order ${orderId}`,

    created_by: "system",
    last_modified_by: "system",
    last_modified_at: istNow,
  });

  /* ------------------- Create History Entry ------------------- */

  await History.create({
    transaction_id: payout.transaction_id,
    wallet_id: payout.wallet_id,
    user_id: payout.user_id,
    user_name: node.name,

    // ✅ name field added so isReferralAlreadyPaid() can find it
    name: "Referral Bonus",
    title: "Referral Bonus",

    order_id: orderId,

    date: formattedDate,
    time: istNow.toTimeString().slice(0, 5),

    amount: payout.amount,
    total_amount: payout.amount,
    withdraw_amount: payout.withdraw_amount,
    reward_amount: payout.reward_amount,
    tds_amount: payout.tds_amount,
    admin_charge: payout.admin_charge,

    to: payout.to,
    from: payout.from,
    transaction_type: "Credit",

    status: payout.status,
    details: payout.details,

    first_payment: isAdvance ? true : false,
    first_order: isAdvance ? false : true,
    advance: isAdvance ? true : false,

    ischecked: false,
    isReferralChecked: true, // 🔥 VERY IMPORTANT — prevents advance referral reprocessing

    created_by: "system",
    last_modified_by: "system",
    created_at: istNow,
    last_modified_at: istNow,
  });

  /* ------------------- Reward Points ------------------- */

  await addRewardScore({
    user_id: sponsorId,
    points: withdraw,
    source: "referral_bonus",
    reference_id: orderId,
    remarks: payout.details,
    type: "referral",
  });

  await addRewardScore({
    user_id: sponsorId,
    points: reward,
    source: "referral_bonus",
    reference_id: orderId,
    remarks: `${payout.details} (reward portion)`,
    type: "reward",
  });

  /* ------------------- User Alert ------------------- */

  await Alert.create({
    user_id: sponsorId,
    title: "Referral Bonus Earned 🎉",
    description: `You earned ₹${REFERRAL_AMOUNT} referral bonus.`,
    role: "user",
    priority: "medium",
    read: false,
    link: "/wallet/payout/daily",
    date: formattedDate,
    created_at: istNow,
  });

  /* ------------------- Club + Rank Update ------------------- */

  const totalPayout = await getTotalPayout(sponsorId);

  const beforeUser = (await User.findOne({ user_id: sponsorId })
    .select("rank club")
    .lean()) as any;

  const updatedClub = await updateClub(sponsorId, totalPayout);

  if (updatedClub && beforeUser) {
    if (beforeUser.club !== updatedClub.newClub) {
      await Alert.create({
        user_id: sponsorId,
        title: `🎉 ${updatedClub.newClub} Club Achieved`,
        description: `Congrats! Welcome to the ${updatedClub.newClub} Club 🎉`,
        role: "user",
        priority: "high",
        read: false,
        link: "/dashboards",
        date: formattedDate,
        created_at: istNow,
      });
    }

    if (beforeUser.rank !== updatedClub.newRank) {
      await Alert.create({
        user_id: sponsorId,
        title: `🎖️ ${updatedClub.newRank} Rank Achieved`,
        description: `Congratulations! You achieved ${updatedClub.newRank} rank 🎖️`,
        role: "user",
        priority: "high",
        read: false,
        link: "/dashboards",
        date: formattedDate,
        created_at: istNow,
      });
    }
  }
}

// app/api/CronJobs/Daily/direct-sales-bonus/logic.ts

import { connectDB } from "@/lib/mongodb";
import { History } from "@/models/history";
import { DailyPayout } from "@/models/payout";
import { Order } from "@/models/order";
import TreeNode from "@/models/tree";
import { User } from "@/models/user";
import { Wallet } from "@/models/wallet";
import { generateUniqueCustomId } from "@/utils/server/customIdGenerator";
import { addRewardScore } from "@/services/updateRewardScore";
import { Alert } from "@/models/alert";

import { getTotalPayout } from "@/services/totalpayout";
import {
  evaluateAndUpdateHoldStatus,
  currentMonth,
} from "@/services/monthlyHoldService";
import { updateClub } from "@/services/clubrank";
import { determineHoldReasons } from "@/services/payoutHoldService";

import { releaseReferralBonus } from "./referralBonus";

/* ------------------------------------------------------------------ */
/* 🔹 Helper - format date                                             */
/* ------------------------------------------------------------------ */

function formatDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

/* ------------------------------------------------------------------ */
/* 🔹 IST Window Logic                                                 */
/* ------------------------------------------------------------------ */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // 330 min in ms

export function getCurrentWindowIST(): { startUTC: Date; endUTC: Date } {
  const nowIST = new Date(Date.now() + IST_OFFSET_MS);

  const year = nowIST.getUTCFullYear();
  const month = nowIST.getUTCMonth();
  const date = nowIST.getUTCDate();
  const hours = nowIST.getUTCHours(); // IST hour 0-23

  let startIST_wall: number;
  let endIST_wall: number;

  if (hours < 12) {
    startIST_wall = Date.UTC(year, month, date, 0, 0, 0, 0);
    endIST_wall = Date.UTC(year, month, date, 11, 59, 59, 999);
  } else {
    startIST_wall = Date.UTC(year, month, date, 12, 0, 0, 0);
    endIST_wall = Date.UTC(year, month, date, 23, 59, 59, 999);
  }

  return {
    startUTC: new Date(startIST_wall - IST_OFFSET_MS),
    endUTC: new Date(endIST_wall - IST_OFFSET_MS),
  };
}

/* ------------------------------------------------------------------ */
/* 🔹 Convert Order payment_date / payment_time → real UTC Date       */
/* ------------------------------------------------------------------ */

export function orderToUTCDate(order: any): Date {
  const [day, month, year] = order.payment_date.split("-").map(Number);

  let timeStr = order.payment_time.trim();
  const isPM = /pm/i.test(timeStr);
  const isAM = /am/i.test(timeStr);

  timeStr = timeStr.replace(/am|pm/i, "").trim();
  let [hours, minutes, seconds] = timeStr.split(":").map(Number);
  seconds = seconds ?? 0;

  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;

  const istWallMs = Date.UTC(year, month - 1, day, hours, minutes, seconds);
  return new Date(istWallMs - IST_OFFSET_MS);
}

/* ------------------------------------------------------------------ */
/* 🔹 Get Orders In Window                                             */
/* ------------------------------------------------------------------ */

export async function getOrdersInWindow() {
  await connectDB();
  const { startUTC, endUTC } = getCurrentWindowIST();

  const orders = await Order.find({
    direct_bonus_checked: { $ne: true },
  }).lean();

  return orders.filter((o: any) => {
    try {
      const orderUTC = orderToUTCDate(o);
      return orderUTC >= startUTC && orderUTC <= endUTC;
    } catch {
      return false;
    }
  });
}

/* ------------------------------------------------------------------ */
/* 🔹 Get Advance History In Window                                    */
/* ------------------------------------------------------------------ */

export async function getAdvanceHistoryInWindow() {
  await connectDB();
  const { startUTC, endUTC } = getCurrentWindowIST();

  const histories = await History.find({
    advance: true,
    first_payment: true,
    transaction_type: "Debit",
    isReferralChecked: { $ne: true },
    created_at: { $gte: startUTC, $lte: endUTC },
  }).lean();

  return histories;
}

/* ------------------------------------------------------------------ */
/* 🔹 Helper — Robust referral already-paid check                     */
/*                                                                     */
/*  Checks BOTH History and DailyPayout because releaseReferralBonus  */
/*  may write to either collection depending on its implementation.   */
/*  This prevents duplicate referral bonuses regardless of where      */
/*  the record is stored.                                              */
/* ------------------------------------------------------------------ */

async function isReferralAlreadyPaid(orderId: string): Promise<boolean> {
  // Check History collection
  const inHistory = await History.findOne({
    order_id: orderId,
    name: { $regex: /referral bonus/i },
  }).lean();
  if (inHistory) return true;

  // Check DailyPayout collection
  const inPayout = await DailyPayout.findOne({
    order_id: orderId,
    name: { $regex: /referral bonus/i },
  }).lean();
  if (inPayout) return true;

  return false;
}

/* ------------------------------------------------------------------ */
/* 🔹 Process Advance Referral                                         */
/* ------------------------------------------------------------------ */

async function processAdvanceReferral(): Promise<number> {
  const advances = await getAdvanceHistoryInWindow();
  let count = 0;

  for (const advance of advances) {
    try {
      const buyerId = advance.user_id;
      if (!buyerId) continue;

      const buyer = (await User.findOne({ user_id: buyerId }).lean()) as any;
      const sponsorId = buyer?.referBy;

      if (!sponsorId) {
        await History.updateOne(
          { transaction_id: advance.transaction_id },
          { $set: { isReferralChecked: true } },
        );
        continue;
      }

      const node = await TreeNode.findOne({ user_id: sponsorId });
      if (!node || node.status !== "active") {
        await History.updateOne(
          { transaction_id: advance.transaction_id },
          { $set: { isReferralChecked: true } },
        );
        continue;
      }

      // ✅ Use robust check before releasing
      const alreadyPaid = await isReferralAlreadyPaid(advance.transaction_id);
      if (alreadyPaid) {
        console.log(
          `⚠️ Referral bonus already paid for advance ${advance.transaction_id}, skipping.`,
        );
        await History.updateOne(
          { transaction_id: advance.transaction_id },
          { $set: { isReferralChecked: true } },
        );
        continue;
      }

      await releaseReferralBonus({
        sponsorId,
        buyerId,
        orderId: advance.transaction_id,
      });

      count++;

      await History.updateOne(
        { transaction_id: advance.transaction_id },
        { $set: { isReferralChecked: true } },
      );
    } catch (err) {
      console.error("Advance referral error:", err);
    }
  }

  return count;
}

/* ------------------------------------------------------------------ */
/* 🔹 Run Direct Sales Bonus                                           */
/* ------------------------------------------------------------------ */

export async function runDirectSalesBonus(): Promise<{
  totalPayouts: number;
  referralBonusCount: number;
}> {
  try {
    const orders = await getOrdersInWindow();
    let totalPayouts = 0;
    let referralBonusCount = 0;

    // ✅ In-memory set to prevent duplicate referral bonuses within this run
    // Key: orderId — ensures one referral bonus per order per cron run
    const referralProcessedThisRun = new Set<string>();

    for (const order of orders) {
      try {
        /* ── Resolve sponsor: always User.referBy of the buyer ─────── */
        const buyer = (await User.findOne({
          user_id: order.user_id,
        }).lean()) as any;
        const referBy = buyer?.referBy;

        /* ── No referrer → mark checked and skip ─────────────────── */
        if (!referBy) {
          await Order.updateOne(
            { order_id: order.order_id },
            { $set: { direct_bonus_checked: true } },
          );
          continue;
        }

        const node = await TreeNode.findOne({ user_id: referBy });
        if (!node || node.status !== "active") {
          await Order.updateOne(
            { order_id: order.order_id },
            { $set: { direct_bonus_checked: true } },
          );
          continue;
        }

        /* ---------------------------------------------------------- */
        /* 🔹 CASE 1: FIRST ORDER → REFERRAL BONUS                    */
        /* ---------------------------------------------------------- */

        if (order.is_first_order === true) {
          // ✅ GUARD 1 — In-memory: already processed this order in this run
          if (referralProcessedThisRun.has(order.order_id)) {
            console.log(
              `⚠️ [In-Memory] Referral bonus already processed this run for order ${order.order_id}`,
            );
            await Order.updateOne(
              { order_id: order.order_id },
              { $set: { direct_bonus_checked: true } },
            );
            continue;
          }

          // ✅ GUARD 2 — DB: already paid in History or DailyPayout
          const alreadyPaid = await isReferralAlreadyPaid(order.order_id);

          if (!alreadyPaid) {
            // Register in-memory BEFORE releasing to block any re-entry
            referralProcessedThisRun.add(order.order_id);

            await releaseReferralBonus({
              sponsorId: referBy,
              buyerId: order.user_id,
              orderId: order.order_id,
            });

            referralBonusCount++;
          } else {
            console.log(
              `⚠️ [DB] Referral bonus already paid for order ${order.order_id}, skipping.`,
            );
          }

          await Order.updateOne(
            { order_id: order.order_id },
            { $set: { direct_bonus_checked: true } },
          );

          continue;
        }

        /* ---------------------------------------------------------- */
        /* 🔹 CASE 2: DIRECT SALES BONUS                              */
        /*    Applies to: non-first, non-advance normal orders         */
        /*    with BV > 0 and an active referrer.                      */
        /* ---------------------------------------------------------- */

        const orderBV = Number(order.order_bv || 0);
        if (orderBV <= 0) {
          await Order.updateOne(
            { order_id: order.order_id },
            { $set: { direct_bonus_checked: true } },
          );
          continue;
        }

        const totalAmount = Number(orderBV.toFixed(2));

        const now = new Date();
        const istNow = new Date(
          new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
        );
        const payout_id = await generateUniqueCustomId("PY", DailyPayout, 8, 8);
        const formattedDate = formatDate(
          new Date(
            new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
          ),
        );
        // ✅ FIX: fetch full wallet object (was already fetched as lean — keep lean for reads)
        const wallet = (await Wallet.findOne({
          user_id: referBy,
        }).lean()) as any;

        // ── Determine payout status ──────────────────────────────────────
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
        await evaluateAndUpdateHoldStatus(referBy, totalAmount);

        // Step 2: Read all 4 hold conditions with full metadata (READ)
        const hold = await determineHoldReasons(referBy, currentMonth());

        const payoutStatus: "Pending" | "OnHold" | "Completed" = hold.status;

        /* ── Amount splits ────────────────────────────────────────── */
        const isPanVerified =
          wallet?.pan_verified === true ||
          ["yes", "true"].includes(String(wallet?.pan_verified).toLowerCase());
        const withdrawAmount = isPanVerified
          ? totalAmount * 0.8
          : totalAmount * 0.62;
        const rewardAmount = totalAmount * 0.08;
        const tdsAmount = isPanVerified
          ? totalAmount * 0.02
          : totalAmount * 0.2;
        const adminCharge = totalAmount * 0.1;

        /* ── Create payout record ─────────────────────────────────── */
        const payout = await DailyPayout.create({
          transaction_id: payout_id,
          payout_id,

          // ✅ FIX: wallet & user identity fields — mirrors releaseReferralBonus
          user_id: referBy,
          user_name: node?.name || "",
          contact: node?.contact || "",
          mail: node?.mail || "",
          user_status: node?.status || "",
          wallet_id: wallet?.wallet_id ?? undefined,
          rank: wallet?.rank ?? undefined,
          pan_verified: isPanVerified,

          amount: totalAmount,
          totalamount: totalAmount,
          withdraw_amount: withdrawAmount,
          reward_amount: rewardAmount,
          tds_amount: tdsAmount,
          admin_charge: adminCharge,

          order_id: order.order_id,
          to: referBy,
          from: order.user_id,

          status: payoutStatus,
          date: formattedDate,
          time: istNow.toTimeString().slice(0, 5),
          transaction_type: "Credit",
          name: "Direct Sales Bonus",
          title: "Direct Sales Bonus",
          details: `Direct Sales Bonus from ${order.user_id}`,
          // ✅ Hold metadata — so admin knows WHY payout is OnHold
          hold_reasons: hold.reasons,
          hold_reason_labels: hold.labels,
          hold_release_reason: hold.summary,

          created_by: "system",
          created_at: istNow,
          last_modified_by: "system",
          last_modified_at: istNow,
        });

        if (payout) {
          totalPayouts++;

          /* ── Mirror into History ────────────────────────────────── */
          await History.create({
            transaction_id: payout.transaction_id,
            payout_id: payout.payout_id,
            wallet_id: payout.wallet_id,
            user_id: referBy,
            user_name: node?.name || "",
            order_id: payout.order_id,
            to: payout.to,
            from: payout.from,
            amount: payout.amount,
            total_amount: payout.amount,
            withdraw_amount: payout.withdraw_amount,
            reward_amount: payout.reward_amount,
            tds_amount: payout.tds_amount,
            admin_charge: payout.admin_charge,
            status: payout.status,
            date: payout.date,
            time: payout.time,
            name: "Direct Sales Bonus",
            title: "Direct Sales Bonus",
            transaction_type: "Credit",
            created_by: "system",
            details: payout.details,
            created_at: istNow,
            last_modified_at: istNow,
          });

          await addRewardScore({
            user_id: referBy,
            points: rewardAmount,
            source: "direct_sales_bonus",
            reference_id: order.order_id,
            type: "daily",
          });

          await updateClub(referBy, totalAmount);

          if (payoutStatus === "OnHold") {
            await Alert.create({
              role: "user",
              user_id: referBy,
              title: "Direct Sales Bonus On Hold",
              description: `Your Direct Sales Bonus of ₹${totalAmount.toFixed(2)} is on hold. ${hold.labels.length > 0 ? `Reason: ${hold.labels.join(", ")}.` : "Please complete your KYC / bank details to release it."}`,
              priority: "medium",
              date: formattedDate,
              created_at: istNow,
            });
          }
        }

        await Order.updateOne(
          { order_id: order.order_id },
          { $set: { direct_bonus_checked: true } },
        );
      } catch (errInner) {
        console.error(
          `[Direct Sales Bonus] Order ${order.order_id} error:`,
          errInner,
        );
      }
    }

    /* ---------- PROCESS ADVANCE REFERRALS ---------- */

    const advanceReferralCount = await processAdvanceReferral();
    referralBonusCount += advanceReferralCount;

    /* ---------- ADMIN ALERTS ---------- */

    if (totalPayouts > 0) {
      await Alert.create({
        role: "admin",
        title: "Direct Sales Bonus Payouts Released",
        description: `${totalPayouts} payout(s) processed successfully.`,
        priority: "high",
        date: formatDate(new Date()),
        created_at: new Date(),
      });
    }

    if (referralBonusCount > 0) {
      await Alert.create({
        role: "admin",
        title: "Referral Bonus Payouts Released",
        description: `${referralBonusCount} referral bonus payout(s) processed successfully.`,
        priority: "high",
        date: formatDate(new Date()),
        created_at: new Date(),
      });
    }

    return { totalPayouts, referralBonusCount };
  } catch (err) {
    console.error("[Direct Sales Bonus] Fatal error:", err);
    throw err;
  }
}

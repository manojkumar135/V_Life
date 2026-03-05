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

import { getTotalPayout, checkHoldStatus } from "@/services/totalpayout";
import { updateClub } from "@/services/clubrank";

import { releaseReferralBonus } from "./referralBonus";

/* ------------------------------------------------------------------ */
/* 🔹 Helper - format date                                             */
/* ------------------------------------------------------------------ */

function formatDate(date: Date): string {
  const dd   = String(date.getDate()).padStart(2, "0");
  const mm   = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

/* ------------------------------------------------------------------ */
/* 🔹 IST Window Logic                                                 */
/*                                                                     */
/*  FIX: The original used toLocaleString() to get IST digits, then   */
/*  passed them to `new Date(y, m, d, h...)` which creates a LOCAL-   */
/*  TIME object. On a UTC server (Vercel / AWS) that is UTC-based,    */
/*  making the window wrong by 5h30m.                                 */
/*                                                                     */
/*  Fix: shift by IST_OFFSET_MS, read via getUTC*, build boundaries   */
/*  with Date.UTC(), then subtract the offset → real UTC instants.    */
/* ------------------------------------------------------------------ */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // 330 min in ms

export function getCurrentWindowIST(): { startUTC: Date; endUTC: Date } {
  const nowIST = new Date(Date.now() + IST_OFFSET_MS);

  const year  = nowIST.getUTCFullYear();
  const month = nowIST.getUTCMonth();
  const date  = nowIST.getUTCDate();
  const hours = nowIST.getUTCHours(); // IST hour 0-23

  let startIST_wall: number;
  let endIST_wall: number;

  if (hours < 12) {
    startIST_wall = Date.UTC(year, month, date,  0,  0,  0,   0);
    endIST_wall   = Date.UTC(year, month, date, 11, 59, 59, 999);
  } else {
    startIST_wall = Date.UTC(year, month, date, 12,  0,  0,   0);
    endIST_wall   = Date.UTC(year, month, date, 23, 59, 59, 999);
  }

  return {
    startUTC: new Date(startIST_wall - IST_OFFSET_MS),
    endUTC:   new Date(endIST_wall   - IST_OFFSET_MS),
  };
}

/* ------------------------------------------------------------------ */
/* 🔹 Convert Order payment_date / payment_time → real UTC Date       */
/*                                                                     */
/*  FIX: payment_date/payment_time are IST wall-clock strings.        */
/*  Original built a local-time Date from those digits — wrong on     */
/*  UTC servers. Fix: Date.UTC() treats digits as IST, subtract       */
/*  offset → true UTC instant.                                        */
/* ------------------------------------------------------------------ */

export function orderToUTCDate(order: any): Date {
  const [day, month, year] = order.payment_date.split("-").map(Number);

  let timeStr = order.payment_time.trim();
  const isPM  = /pm/i.test(timeStr);
  const isAM  = /am/i.test(timeStr);

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
/*                                                                     */
/*  FIX: h.created_at from MongoDB is real UTC. Original compared it  */
/*  against local-time IST objects — different reference frames,      */
/*  silent mismatch on UTC servers. Push filter into MongoDB using    */
/*  correct UTC bounds; no in-memory filtering needed.                */
/* ------------------------------------------------------------------ */

export async function getAdvanceHistoryInWindow() {
  await connectDB();
  const { startUTC, endUTC } = getCurrentWindowIST();

  const histories = await History.find({
    advance:           true,
    first_payment:     true,
    transaction_type:  "Debit",
    isReferralChecked: { $ne: true },
    created_at:        { $gte: startUTC, $lte: endUTC },
  }).lean();

  return histories;
}

/* ------------------------------------------------------------------ */
/* 🔹 Process Advance Referral                                         */
/*                                                                     */
/*  FIX: Original used `advance.placed_by` as the sponsor — this      */
/*  field does not exist on advance History records (it was always     */
/*  undefined → every record silently skipped via `if (!sponsorId)`). */
/*                                                                     */
/*  Correct logic (confirmed):                                         */
/*    - Advance is always paid by the buyer themselves (user_id).     */
/*    - Sponsor = User.referBy looked up by buyer's user_id.          */
/*    - Same pattern used for orders.                                  */
/* ------------------------------------------------------------------ */

async function processAdvanceReferral(): Promise<number> {
  const advances = await getAdvanceHistoryInWindow();
  let count = 0;

  for (const advance of advances) {
    try {
      const buyerId = advance.user_id;
      if (!buyerId) continue;

      // FIX: look up sponsor from the buyer's User record via referBy
      const buyer = (await User.findOne({ user_id: buyerId }).lean()) as any;
      const sponsorId = buyer?.referBy;

      if (!sponsorId) {
        // No referrer — mark as checked so it is not retried
        await History.updateOne(
          { transaction_id: advance.transaction_id },
          { $set: { isReferralChecked: true } }
        );
        continue;
      }

      const node = await TreeNode.findOne({ user_id: sponsorId });
      if (!node || node.status !== "active") {
        // Sponsor inactive — mark as checked so it is not retried
        await History.updateOne(
          { transaction_id: advance.transaction_id },
          { $set: { isReferralChecked: true } }
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
        { $set: { isReferralChecked: true } }
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
    let totalPayouts       = 0;
    let referralBonusCount = 0;

    for (const order of orders) {
      try {
        /* ── Resolve sponsor: always User.referBy of the buyer ─────── */
        const buyer = (await User.findOne({ user_id: order.user_id }).lean()) as any;
        const referBy = buyer?.referBy;

        /* ── No referrer → mark checked and skip ─────────────────── */
        if (!referBy) {
          await Order.updateOne(
            { order_id: order.order_id },
            { $set: { direct_bonus_checked: true } }
          );
          continue;
        }

        const node = await TreeNode.findOne({ user_id: referBy });
        if (!node || node.status !== "active") {
          await Order.updateOne(
            { order_id: order.order_id },
            { $set: { direct_bonus_checked: true } }
          );
          continue;
        }

        /* ---------------------------------------------------------- */
        /* 🔹 CASE 1: FIRST ORDER → REFERRAL BONUS                    */
        /* ---------------------------------------------------------- */

        if (order.is_first_order === true) {
          const alreadyPaid = await History.findOne({
            order_id: order.order_id,
            name:     "Referral Bonus",
          }).lean();

          if (!alreadyPaid) {
            await releaseReferralBonus({
              sponsorId: referBy,
              buyerId:   order.user_id,
              orderId:   order.order_id,
            });

            referralBonusCount++;
          }

          await Order.updateOne(
            { order_id: order.order_id },
            { $set: { direct_bonus_checked: true } }
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
            { $set: { direct_bonus_checked: true } }
          );
          continue;
        }

        const totalAmount    = Number(orderBV.toFixed(2));
        const previousPayout = await getTotalPayout(referBy);
        const afterThis      = previousPayout + totalAmount;

        const now           = new Date();
        const payout_id     = await generateUniqueCustomId("PY", DailyPayout, 8, 8);
        const formattedDate = formatDate(now);

        const wallet = (await Wallet.findOne({ user_id: referBy }).lean()) as any;
        const sponsor = (await User.findOne({ user_id: referBy }).lean()) as any;

        /* Determine payout hold status */
        let payoutStatus: "Pending" | "OnHold" | "Completed" = "Pending";

        if (!wallet || !wallet.account_number) {
          payoutStatus = "OnHold";
        } else if (checkHoldStatus(afterThis, sponsor?.pv ?? 0)) {
          payoutStatus = "OnHold";
        }

        /* ── Amount splits ────────────────────────────────────────── */
        const panVerified    = !!wallet?.pan_verified;
        const withdrawAmount = panVerified ? totalAmount * 0.80 : totalAmount * 0.62;
        const rewardAmount   = totalAmount * 0.08;
        const tdsAmount      = panVerified ? totalAmount * 0.02 : totalAmount * 0.20;
        const adminCharge    = totalAmount * 0.10;

        /* ── Create payout record ─────────────────────────────────── */
        const payout = await DailyPayout.create({
          transaction_id:   payout_id,
          payout_id,
          user_id:          referBy,
          user_name:        node?.name || "",
          amount:           totalAmount,
          withdraw_amount:  withdrawAmount,
          reward_amount:    rewardAmount,
          tds_amount:       tdsAmount,
          admin_charge:     adminCharge,
          order_id:         order.order_id,
          status:           payoutStatus,
          date:             formattedDate,
          time:             now.toTimeString().slice(0, 5),
          transaction_type: "Credit",
          name:             "Direct Sales Bonus",
          title:            "Direct Sales Bonus",
          created_by:       "system",
          created_at:       now,
          last_modified_at: now,
        });

        if (payout) {
          totalPayouts++;

          /* ── Mirror into History with all matching fields ───────── */
          await History.create({
            transaction_id:   payout.transaction_id,
            payout_id:        payout.payout_id,
            user_id:          referBy,
            user_name:        node?.name || "",
            order_id:         payout.order_id,
            amount:           payout.amount,
            withdraw_amount:  payout.withdraw_amount,
            reward_amount:    payout.reward_amount,
            tds_amount:       payout.tds_amount,
            admin_charge:     payout.admin_charge,
            status:           payout.status,
            date:             payout.date,
            time:             payout.time,
            name:             "Direct Sales Bonus",
            title:            "Direct Sales Bonus",
            transaction_type: "Credit",
            created_by:       "system",
            created_at:       now,
            last_modified_at: now,
          });

          /* FIX: was passing withdrawAmount (~80%) instead of         */
          /* rewardAmount (8%), inflating reward scores ~10x           */
          await addRewardScore({
            user_id:      referBy,
            points:       rewardAmount,
            source:       "direct_sales_bonus",
            reference_id: order.order_id,
            type:         "daily",
          });

          /* updateClub: pass userId + earned amount                   */
          /* ⚠️  Replace totalAmount with correct 2nd arg if different */
          await updateClub(referBy, totalAmount);

          /* Notify sponsor when their payout is held */
          if (payoutStatus === "OnHold") {
            await Alert.create({
              role:        "user",
              user_id:     referBy,
              title:       "Direct Sales Bonus On Hold",
              description: `Your Direct Sales Bonus of ₹${totalAmount.toFixed(2)} is on hold. Please complete your KYC / bank details to release it.`,
              priority:    "medium",
              date:        formattedDate,
              created_at:  now,
            });
          }
        }

        await Order.updateOne(
          { order_id: order.order_id },
          { $set: { direct_bonus_checked: true } }
        );
      } catch (errInner) {
        console.error(`[Direct Sales Bonus] Order ${order.order_id} error:`, errInner);
      }
    }

    /* ---------- PROCESS ADVANCE REFERRALS ---------- */

    const advanceReferralCount = await processAdvanceReferral();
    referralBonusCount += advanceReferralCount;

    /* ---------- ADMIN ALERTS ---------- */

    if (totalPayouts > 0) {
      await Alert.create({
        role:        "admin",
        title:       "Direct Sales Bonus Payouts Released",
        description: `${totalPayouts} payout(s) processed successfully.`,
        priority:    "high",
        date:        formatDate(new Date()),
        created_at:  new Date(),
      });
    }

    if (referralBonusCount > 0) {
      await Alert.create({
        role:        "admin",
        title:       "Referral Bonus Payouts Released",
        description: `${referralBonusCount} referral bonus payout(s) processed successfully.`,
        priority:    "high",
        date:        formatDate(new Date()),
        created_at:  new Date(),
      });
    }

    return { totalPayouts, referralBonusCount };

  } catch (err) {
    console.error("[Direct Sales Bonus] Fatal error:", err);
    throw err;
  }
}
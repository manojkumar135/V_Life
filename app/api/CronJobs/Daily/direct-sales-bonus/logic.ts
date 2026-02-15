// app/api/CronJobs/Daily/direct-sales-bonus/logic.ts
import { connectDB } from "@/lib/mongodb";
import { History } from "@/models/history";
import { DailyPayout } from "@/models/payout";
import { Order } from "@/models/order"; // ensure path matches your project
import TreeNode from "@/models/tree";
import { User } from "@/models/user";
import { Wallet } from "@/models/wallet";
import { generateUniqueCustomId } from "@/utils/server/customIdGenerator";
// import { hasAdvancePaid } from "@/services/hasAdvancePaid";
import { hasFirstOrder } from "@/services/hasFirstOrder";
import { addRewardScore } from "@/services/updateRewardScore";
import { Alert } from "@/models/alert";

import { getTotalPayout, checkHoldStatus } from "@/services/totalpayout";
import { updateClub } from "@/services/clubrank";

import { isUserFirstOrder, referralBonusAlreadyPaid } from "./helpers";

import { releaseReferralBonus } from "./referralBonus";

/**
 * Helper - format date as DD-MM-YYYY
 */
function formatDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

/**
 * Reuse same 12-hour IST window logic as matching bonus
 */
export function getCurrentWindowIST() {
  const now = new Date();

  // Convert current time to IST
  const nowIST = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
  );

  const year = nowIST.getFullYear();
  const month = nowIST.getMonth();
  const date = nowIST.getDate();
  const hours = nowIST.getHours();

  let startIST: Date;
  let endIST: Date;

  if (hours < 12) {
    // 12 AM – 12 PM IST
    startIST = new Date(year, month, date, 0, 0, 0);
    endIST = new Date(year, month, date, 11, 59, 59, 999);
  } else {
    // 12 PM – 12 AM IST
    startIST = new Date(year, month, date, 12, 0, 0);
    endIST = new Date(year, month, date, 23, 59, 59, 999);
  }

  return { startIST, endIST };
}

function generateTransactionId(prefix = "MB") {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");

  return `${prefix}-${yyyy}${mm}${dd}${hh}${min}${ss}`;
}

const txId = generateTransactionId("DS");

async function checkFirstOrder(user_id: string) {
  if (!user_id) {
    return {
      hasFirstOrder: false,
      hasPermission: false,
      reason: "Missing user_id",
    };
  }

  // Fetch user
  const user = await User.findOne({ user_id })
    .select("status_notes")
    .lean<{ status_notes?: string }>();
  if (!user) {
    return {
      hasFirstOrder: false,
      hasPermission: false,
      reason: "User not found",
    };
  }

  // 🔹 Admin activation check
  const note = user?.status_notes?.toLowerCase()?.trim();
  const activatedByAdmin =
    note === "activated by admin" || note === "activated";

  // 🔹 First order check
  const hasFirstOrder = await Order.exists({ user_id });
  console.log(hasFirstOrder, "hasFirstOrder");

  return {
    hasFirstOrder: !!hasFirstOrder,
    activatedByAdmin,
    hasPermission: activatedByAdmin || !!hasFirstOrder,
    reason: activatedByAdmin
      ? "Activated by admin"
      : hasFirstOrder
        ? "First order placed"
        : "No orders placed",
  };
}

/**
 * Convert Order payment date/time (IST) to UTC Date
 * order.payment_date = "DD-MM-YYYY", order.payment_time = "HH:MM:SS" (IST)
 */
export function orderToISTDate(order: any) {
  const [day, month, year] = order.payment_date.split("-").map(Number);

  let timeStr = order.payment_time.trim();

  const isPM = timeStr.toLowerCase().includes("pm");
  const isAM = timeStr.toLowerCase().includes("am");

  timeStr = timeStr.replace(/am|pm/i, "").trim();

  let [hours, minutes, seconds] = timeStr.split(":").map(Number);

  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;

  return new Date(year, month - 1, day, hours, minutes, seconds);
}

/**
 * Compute order BV: sum of item.bv * item.quantity
 */
function computeOrderBV(order: any): number {
  if (!order.items || !Array.isArray(order.items)) return 0;
  return order.items.reduce((sum: number, it: any) => {
    const itemBV = Number(it.bv || 0);
    const qty = Number(it.quantity || 1);
    return sum + itemBV * qty;
  }, 0);
}

/**
 * Get orders in current 12-hour window and not yet bonus-checked
 */
export async function getOrdersInWindow() {
  await connectDB();
  const { startIST, endIST } = getCurrentWindowIST();

  // Get candidate orders that are not processed for direct sales bonus
  // We fetch recent orders and then filter by converted UTC date range
  const orders = await Order.find({
    direct_bonus_checked: { $ne: true },
    // payment: "completed",
    // optionally filter payment flag if you have: payment: "paid"
  }).lean();

  const ordersInWindow = orders.filter((o: any) => {
    try {
      const orderIST = orderToISTDate(o);
      return orderIST >= startIST && orderIST <= endIST;
    } catch (err) {
      return false;
    }
  });

  console.log(ordersInWindow, "Orders in current direct sales bonus window");
  return ordersInWindow;
}

/**
 * Run Direct Sales Bonus
 * - For each order in window, get referBy
 * - Check referBy node active & hasAdvancePaid >= 10000
 * - Compute bonus using order BV (10% of BV)
 * - Create DailyPayout + History, update user score, mark order.bonus_checked = true
 */
export async function runDirectSalesBonus() {
  try {
    const orders = await getOrdersInWindow();

    if (!orders || orders.length === 0) {
      return;
    }

    let totalPayouts = 0;

    for (const order of orders) {
      try {
        const referBy = order.referBy;

        if (!referBy) {
          await Order.findOneAndUpdate(
            { order_id: order.order_id },
            {
              $set: {
                direct_bonus_checked: true,
                last_modified_at: new Date(),
              },
            },
          );
          continue;
        }

        const node = await TreeNode.findOne({ user_id: referBy });
        if (!node || node.status !== "active") {
          await Order.findOneAndUpdate(
            { order_id: order.order_id },
            {
              $set: {
                direct_bonus_checked: true,
                last_modified_at: new Date(),
              },
            },
          );
          continue;
        }

        const firstOrderPermission = await checkFirstOrder(referBy);
        if (!firstOrderPermission.hasPermission) {
          await Order.findOneAndUpdate(
            { order_id: order.order_id },
            {
              $set: {
                direct_bonus_checked: true,
                last_modified_at: new Date(),
              },
            },
          );
          continue;
        }

        /* -------------------------------------------------- */
        /* 🔹 CASE 1: FIRST ORDER + ADVANCE NOT USED → REFERRAL BONUS */
        /* -------------------------------------------------- */

        if (order.is_first_order === true) {
          if (order.advance_used === false) {
            const alreadyPaid = await referralBonusAlreadyPaid(order.order_id);

            if (!alreadyPaid) {
              console.log("Releasing Referral Bonus:", order.order_id);

              await releaseReferralBonus({
                sponsorId: order.referBy,
                buyerId: order.user_id,
                orderId: order.order_id,
              });
            }
          }

          // Mark processed
          await Order.findOneAndUpdate(
            { order_id: order.order_id },
            {
              $set: {
                direct_bonus_checked: true,
                last_modified_at: new Date(),
              },
            },
          );

          continue; // ❌ DO NOT run direct bonus
        }

        /* -------------------------------------------------- */
        /* 🔹 CASE 2: NOT FIRST ORDER → DIRECT SALES BONUS */
        /* -------------------------------------------------- */

        const orderBV = Number(order.order_bv || 0);

        if (orderBV <= 0) {
          await Order.findOneAndUpdate(
            { order_id: order.order_id },
            {
              $set: {
                direct_bonus_checked: true,
                last_modified_at: new Date(),
              },
            },
          );
          continue;
        }

        const totalAmount = Number(orderBV.toFixed(2));

        const previousPayout = await getTotalPayout(referBy);
        const afterThis = previousPayout + totalAmount;

        const now = new Date();
        const payout_id = await generateUniqueCustomId(
          "PY",
          DailyPayout,
          8,
          8,
        );
        const formattedDate = formatDate(now);

        const wallet = (await Wallet.findOne({
          user_id: referBy,
        }).lean()) as any;

        const user = (await User.findOne({
          user_id: referBy,
        }).lean()) as any;

        const walletId = wallet ? wallet.wallet_id : null;

        let payoutStatus: "Pending" | "OnHold" | "Completed" = "Pending";

        if (!wallet) payoutStatus = "OnHold";
        else if (!wallet.account_number) payoutStatus = "OnHold";
        else if (checkHoldStatus(afterThis, user?.pv ?? 0))
          payoutStatus = "OnHold";

        let withdrawAmount = 0;
        let rewardAmount = 0;
        let tdsAmount = 0;
        let adminCharge = 0;

        if (wallet && wallet.pan_verified) {
          withdrawAmount = Number((totalAmount * 0.8).toFixed(2));
          rewardAmount = Number((totalAmount * 0.08).toFixed(2));
          tdsAmount = Number((totalAmount * 0.02).toFixed(2));
          adminCharge = Number((totalAmount * 0.1).toFixed(2));
        } else {
          withdrawAmount = Number((totalAmount * 0.62).toFixed(2));
          rewardAmount = Number((totalAmount * 0.08).toFixed(2));
          tdsAmount = Number((totalAmount * 0.2).toFixed(2));
          adminCharge = Number((totalAmount * 0.1).toFixed(2));
        }

        const payout = await DailyPayout.create({
          transaction_id: payout_id,
          payout_id,
          user_id: referBy,
          user_name: node?.name || "",
          contact: node?.contact || "",
          mail: node?.mail || "",
          user_status: node?.status || "active",
          rank: wallet?.rank,
          pan_verified: wallet?.pan_verified || false,
          wallet_id: walletId,
          name: "Direct Sales Bonus",
          title: "Direct Sales Bonus",
          account_holder_name: wallet?.account_holder_name || "",
          bank_name: wallet?.bank_name || "",
          account_number: wallet?.account_number || "",
          ifsc_code: wallet?.ifsc_code || "",
          date: formattedDate,
          time: now.toTimeString().slice(0, 5),
          available_balance: wallet?.balance || 0,
          amount: totalAmount,
          totalamount: totalAmount,
          withdraw_amount: withdrawAmount,
          reward_amount: rewardAmount,
          tds_amount: tdsAmount,
          admin_charge: adminCharge,
          to: referBy,
          from: order.user_id,
          transaction_type: "Credit",
          status: payoutStatus,
          details: `Direct Sales Bonus for order ${order.order_id}`,
          order_id: order.order_id,
          created_by: "system",
          last_modified_by: "system",
          last_modified_at: now,
        });

        if (payout) {
          totalPayouts++;

           await History.create({
            transaction_id: payout.transaction_id,
            wallet_id: payout.wallet_id,
            user_id: payout.user_id,
            user_name: payout.user_name,
            mail: payout.mail,
            contact: payout.contact,
            rank: payout.rank,
            user_status: payout.user_status,
            pan_verified: payout.pan_verified,
            order_id: payout.order_id,

            account_holder_name: payout.account_holder_name,
            bank_name: payout.bank_name,
            account_number: payout.account_number,
            ifsc_code: payout.ifsc_code,
            date: payout.date,
            time: payout.time,
            available_balance: payout.available_balance,
            amount: payout.amount,
            total_amount: payout.amount,
            withdraw_amount: payout.withdraw_amount,
            reward_amount: payout.reward_amount,
            tds_amount: payout.tds_amount,
            admin_charge: payout.admin_charge,
            to: payout.to,
            from: payout.from,
            transaction_type: payout.transaction_type,
            details: payout.details,
            status: payout.status,
            first_payment: false,
            advance: false,
            ischecked: false,
            created_by: "system",
            last_modified_by: "system",
            last_modified_at: now,
          });


          await addRewardScore({
            user_id: referBy,
            points: withdrawAmount,
            source: "direct_sales_bonus",
            reference_id: order.order_id,
            remarks: `Direct sales bonus for order ${order.order_id}`,
            type: "daily",
          });

          await addRewardScore({
            user_id: referBy,
            points: rewardAmount,
            source: "direct_sales_bonus",
            reference_id: order.order_id,
            remarks: `Direct sales bonus (reward) for order ${order.order_id}`,
            type: "reward",
          });
        }

        await Order.findOneAndUpdate(
          { order_id: order.order_id },
          { $set: { bonus_checked: true, last_modified_at: new Date() } },
        );
      } catch (errInner) {
        console.error(
          "[Direct Sales Bonus] error processing order:",
          order?.order_id,
          errInner,
        );
      }
    }
  } catch (err) {
    console.error("[Direct Sales Bonus] Error:", err);
    throw err;
  }
}


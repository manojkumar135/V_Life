// app/api/CronJobs/Daily/direct-sales-bonus/logic.ts
import { connectDB } from "@/lib/mongodb";
import { History } from "@/models/history";
import { DailyPayout } from "@/models/payout";
import { Order } from "@/models/order"; // ensure path matches your project
import TreeNode from "@/models/tree";
import { User } from "@/models/user";
import { Wallet } from "@/models/wallet";
import { generateUniqueCustomId } from "@/utils/server/customIdGenerator";
import { hasAdvancePaid } from "@/utils/hasAdvancePaid";

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
export function getCurrentWindow() {
  const now = new Date();

  let start: Date;
  let end: Date;

  // Get IST hours
  const istHours =
    now.getUTCHours() + 5 + (now.getUTCMinutes() + 30 >= 60 ? 1 : 0);

  if (istHours < 12) {
    // 12:00 AM - 11:59 AM IST
    start = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0,
        0,
        0
      )
    );
    end = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        5,
        59,
        59,
        999
      )
    ); // 11:59 AM IST = 5:59 UTC
  } else {
    // 12:00 PM - 11:59 PM IST
    start = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        6,
        0,
        0
      )
    ); // 12:00 PM IST = 6:00 UTC
    end = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        17,
        59,
        59,
        999
      )
    ); // 11:59 PM IST = 17:59 UTC
  }

  return { start, end };
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

async function checkAdvancePaid(user_id: string, minAmount: number = 10000) {
  if (!user_id) {
    return {
      hasAdvance: false,
      hasPermission: false,
      reason: "Missing user_id",
    };
  }

  // Fetch user (optional, but kept in case of invalid user)
  const user = await User.findOne({ user_id });
  if (!user) {
    return {
      hasAdvance: false,
      hasPermission: false,
      reason: "User not found",
    };
  }

  // ✅ Only check if advance >= minAmount (no admin access allowed)
  const historyRecord = await History.findOne({
    user_id,
    amount: { $gte: minAmount },
  });

  const hasAdvance = !!historyRecord;

  return {
    hasAdvance,
    hasPermission: hasAdvance, // ✅ Only advance matters now
    reason: hasAdvance ? "Advance paid" : "Advance not paid",
  };
}

/**
 * Convert Order payment date/time (IST) to UTC Date
 * order.payment_date = "DD-MM-YYYY", order.payment_time = "HH:MM:SS" (IST)
 */
export function orderToUTCDate(order: any) {
  const [day, month, year] = order.payment_date.split("-").map(Number);
  const [hours, minutes, seconds] = order.payment_time
    .split(":")
    .map((v: string) => Number(v));

  // IST -> UTC by subtracting 5h30m
  let utcHours = hours - 5;
  let utcMinutes = minutes - 30;

  // JS Date.UTC handles negative minutes/hours as expected (it will roll back date)
  return new Date(
    Date.UTC(year, month - 1, day, utcHours, utcMinutes, seconds)
  );
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
  const { start, end } = getCurrentWindow();

  // Get candidate orders that are not processed for direct sales bonus
  // We fetch recent orders and then filter by converted UTC date range
  const orders = await Order.find({
    bonus_checked: { $ne: true },
    // optionally filter payment flag if you have: payment: "paid"
  }).lean();

  const ordersInWindow = orders.filter((o: any) => {
    try {
      const orderDate = orderToUTCDate(o);
      return orderDate >= start && orderDate <= end;
    } catch (err) {
      return false;
    }
  });

  // console.log(ordersInWindow, "Orders in current direct sales bonus window");
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
      // nothing to process
      return;
    }

    for (const order of orders) {
      try {
        const referBy = order.referBy;
        if (!referBy) {
          // mark as checked so it won't be reconsidered
          await Order.findOneAndUpdate(
            { order_id: order.order_id },
            { $set: { bonus_checked: true, last_modified_at: new Date() } }
          );
          continue;
        }

        // Ensure referBy is active in tree
        console.log("ReferBy for order", order.order_id, "is", referBy);
        const node = await TreeNode.findOne({ user_id: referBy });
        if (!node || node.status !== "active") {
          // mark order as checked to avoid reprocessing
          await Order.findOneAndUpdate(
            { order_id: order.order_id },
            { $set: { bonus_checked: true, last_modified_at: new Date() } }
          );
          continue;
        }

        // Check hasAdvancePaid >= 10000
        // const advancePaid = await hasAdvancePaid(referBy, 10000);
        const advancePaid = await checkAdvancePaid(referBy);
        // if (!advancePaid.hasPermission) continue;

        if (!advancePaid.hasPermission) {
          // mark order as checked
          await Order.findOneAndUpdate(
            { order_id: order.order_id },
            { $set: { bonus_checked: true, last_modified_at: new Date() } }
          );
          continue;
        }

        // Compute BV and bonus amounts
        const orderBV = Number(order.order_bv || 0);
        if (orderBV <= 0) {
          await Order.findOneAndUpdate(
            { order_id: order.order_id },
            { $set: { bonus_checked: true, last_modified_at: new Date() } }
          );
          continue;
        }

        // Bonus percentage from BV (default 10%)
        const totalAmount = Number(orderBV.toFixed(2)); // 10% of BV
        if (totalAmount <= 0) {
          await Order.findOneAndUpdate(
            { order_id: order.order_id },
            { $set: { bonus_checked: true, last_modified_at: new Date() } }
          );
          continue;
        }

        const withdrawAmount = Number((totalAmount * 0.8).toFixed(2)); // 80%
        const rewardAmount = Number((totalAmount * 0.1).toFixed(2)); // 10%
        const tdsAmount = Number((totalAmount * 0.05).toFixed(2)); // 5%
        const adminCharge = Number((totalAmount * 0.05).toFixed(2)); // 5%

        const now = new Date();
        const payout_id = await generateUniqueCustomId("PY", DailyPayout, 8, 8);
        const formattedDate = formatDate(now);

        // Find referBy's wallet
        const wallet = await Wallet.findOne({ user_id: referBy });
        const walletId = wallet ? wallet.wallet_id : null;

        let payoutStatus: "Pending" | "OnHold" | "Completed" = "Pending";
        if (!wallet || !wallet.pan_verified) {
          payoutStatus = "OnHold";
        } else {
          payoutStatus = "Pending";
        }

        // Create DailyPayout for referBy
        const payout = await DailyPayout.create({
          // transaction_id: `${txId}-${node.user_id}`,
          transaction_id:payout_id,
          payout_id,
          user_id: referBy,
          user_name: node?.name || "",
          rank: wallet?.rank,
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

        // Create History record if payout created
        if (payout) {
          await History.create({
            transaction_id: payout.transaction_id,
            wallet_id: payout.wallet_id,
            user_id: payout.user_id,
            user_name: payout.user_name,
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

          // update user score by rewardAmount (same as matching)
          await User.findOneAndUpdate(
            { user_id: referBy },
            { $inc: { score: rewardAmount } }
          );
        }

        // Mark order as processed for direct sales bonus
        await Order.findOneAndUpdate(
          { order_id: order.order_id },
          { $set: { bonus_checked: true, last_modified_at: new Date() } }
        );

        await History.findOneAndUpdate(
          { order_id: order.order_id },
          { $set: {ischecked: true, last_modified_at: new Date() } }
        );
      } catch (errInner) {
        console.error(
          "[Direct Sales Bonus] error processing order:",
          order?.order_id,
          errInner
        );
        // mark as checked to avoid infinite retry if you prefer, or leave to manual
        try {
          await Order.findOneAndUpdate(
            { order_id: order.order_id },
            { $set: { bonus_checked: true, last_modified_at: new Date() } }
          );
        } catch {}
      }
    }
  } catch (err) {
    console.error("[Direct Sales Bonus] Error:", err);
    throw err;
  }
}

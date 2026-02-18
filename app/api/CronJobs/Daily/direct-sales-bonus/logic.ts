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

import { referralBonusAlreadyPaid } from "./helpers";
import { releaseReferralBonus } from "./referralBonus";

/* -------------------------------------------------- */
/* 🔹 Helper - format date */
/* -------------------------------------------------- */

function formatDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

/* -------------------------------------------------- */
/* 🔹 IST Window Logic */
/* -------------------------------------------------- */

export function getCurrentWindowIST() {
  const now = new Date();

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
    startIST = new Date(year, month, date, 0, 0, 0);
    endIST = new Date(year, month, date, 11, 59, 59, 999);
  } else {
    startIST = new Date(year, month, date, 12, 0, 0);
    endIST = new Date(year, month, date, 23, 59, 59, 999);
  }

  return { startIST, endIST };
}

/* -------------------------------------------------- */
/* 🔹 Convert Order to IST Date */
/* -------------------------------------------------- */

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

/* -------------------------------------------------- */
/* 🔹 Get Orders In Window */
/* -------------------------------------------------- */

export async function getOrdersInWindow() {
  await connectDB();
  const { startIST, endIST } = getCurrentWindowIST();

  const orders = await Order.find({
    direct_bonus_checked: { $ne: true },
  }).lean();

  return orders.filter((o: any) => {
    try {
      const orderIST = orderToISTDate(o);
      return orderIST >= startIST && orderIST <= endIST;
    } catch {
      return false;
    }
  });
}

/* -------------------------------------------------- */
/* 🔹 Run Direct Sales Bonus */
/* -------------------------------------------------- */

export async function runDirectSalesBonus() {
  try {
    const orders = await getOrdersInWindow();
    if (!orders?.length) return;

    let totalPayouts = 0;

    for (const order of orders) {
      try {
        const referBy = order.referBy;
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

        /* -------------------------------------------------- */
        /* 🔹 CASE 1: FIRST ORDER → REFERRAL BONUS ONLY */
        /* -------------------------------------------------- */

        if (order.is_first_order === true) {
          if (order.advance_used === false) {
            const alreadyPaid = await referralBonusAlreadyPaid(order.order_id);
            if (!alreadyPaid) {
              await releaseReferralBonus({
                sponsorId: referBy,
                buyerId: order.user_id,
                orderId: order.order_id,
              });
            }
          }

          await Order.updateOne(
            { order_id: order.order_id },
            { $set: { direct_bonus_checked: true } },
          );

          continue;
        }

        /* -------------------------------------------------- */
        /* 🔹 CASE 2: DIRECT SALES BONUS */
        /* -------------------------------------------------- */

        const orderBV = Number(order.order_bv || 0);
        if (orderBV <= 0) {
          await Order.updateOne(
            { order_id: order.order_id },
            { $set: { direct_bonus_checked: true } },
          );
          continue;
        }

        const totalAmount = Number(orderBV.toFixed(2));
        const previousPayout = await getTotalPayout(referBy);
        const afterThis = previousPayout + totalAmount;

        const now = new Date();
        const payout_id = await generateUniqueCustomId("PY", DailyPayout, 8, 8);

        const formattedDate = formatDate(now);

        const wallet = (await Wallet.findOne({
          user_id: referBy,
        }).lean()) as any;
        const user = (await User.findOne({ user_id: referBy }).lean()) as any;

        let payoutStatus: "Pending" | "OnHold" | "Completed" = "Pending";

        if (!wallet) payoutStatus = "OnHold";
        else if (!wallet.account_number) payoutStatus = "OnHold";
        else if (checkHoldStatus(afterThis, user?.pv ?? 0))
          payoutStatus = "OnHold";

        const withdrawAmount = wallet?.pan_verified
          ? totalAmount * 0.8
          : totalAmount * 0.62;

        const rewardAmount = totalAmount * 0.08;
        const tdsAmount = wallet?.pan_verified
          ? totalAmount * 0.02
          : totalAmount * 0.2;

        const adminCharge = totalAmount * 0.1;

        const payout = await DailyPayout.create({
          transaction_id: payout_id,
          payout_id,
          user_id: referBy,
          user_name: node?.name || "",
          mail: node?.mail || "",
          contact: node?.contact || "",
          amount: totalAmount,
          withdraw_amount: withdrawAmount,
          reward_amount: rewardAmount,
          tds_amount: tdsAmount,
          admin_charge: adminCharge,
          order_id: order.order_id,
          status: payoutStatus,
          date: formattedDate,
          time: now.toTimeString().slice(0, 5),
          transaction_type: "Credit",
          name: "Direct Sales Bonus",
          title: "Direct Sales Bonus",
          created_by: "system",
          last_modified_by: "system",
          last_modified_at: now,
        });

        if (payout) {
          totalPayouts++;

          /* ---------- HISTORY ---------- */
          await History.create({
            transaction_id: payout.transaction_id,
            user_id: referBy,
            amount: payout.amount,
            withdraw_amount: payout.withdraw_amount,
            reward_amount: payout.reward_amount,
            tds_amount: payout.tds_amount,
            admin_charge: payout.admin_charge,
            order_id: payout.order_id,
            status: payout.status,
            date: payout.date,
            time: payout.time,
            created_by: "system",
            last_modified_at: now,
          });

          /* ---------- REWARD SCORE ---------- */
          await addRewardScore({
            user_id: referBy,
            points: withdrawAmount,
            source: "direct_sales_bonus",
            reference_id: order.order_id,
            type: "daily",
          });

          /* ---------- CLUB + RANK UPDATE ---------- */

          const totalPayout = await getTotalPayout(referBy);
          const beforeUser = (await User.findOne({ user_id: referBy })
            .select("rank club")
            .lean() as any);

          const updatedClub = await updateClub(referBy, totalPayout);

          if (updatedClub && beforeUser) {
            if (beforeUser.club !== updatedClub.newClub) {
              await Alert.create({
                user_id: referBy,
                title: `🎉 ${updatedClub.newClub} Club Achieved`,
                description: `Congrats! Welcome to ${updatedClub.newClub} Club 🎉`,
                role: "user",
                priority: "high",
                date: formattedDate,
                created_at: now,
              });
            }

            if (beforeUser.rank !== updatedClub.newRank) {
              await Alert.create({
                user_id: referBy,
                title: `🎖️ ${updatedClub.newRank} Rank Achieved`,
                description: `Congratulations! You achieved ${updatedClub.newRank} rank 🎖️`,
                role: "user",
                priority: "high",
                date: formattedDate,
                created_at: now,
              });
            }
          }

          /* ---------- USER ALERT ---------- */

          await Alert.create({
            user_id: referBy,
            title: "Direct Sales Bonus Released 🎉",
            description: `You earned ₹${totalAmount} from Direct Sales Bonus.`,
            role: "user",
            priority: "medium",
            date: formattedDate,
            created_at: now,
          });
        }

        await Order.updateOne(
          { order_id: order.order_id },
          { $set: { direct_bonus_checked: true } },
        );
      } catch (errInner) {
        console.error(
          "[Direct Sales Bonus] error processing:",
          order.order_id,
          errInner,
        );
      }
    }

    /* ---------- ADMIN ALERT ---------- */

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
  } catch (err) {
    console.error("[Direct Sales Bonus] Error:", err);
    throw err;
  }
}

import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/order";
import { User } from "@/models/user";
import TreeNode from "@/models/tree";
import { Wallet } from "@/models/wallet";
import { History } from "@/models/history";
import { DailyPayout } from "@/models/payout";
import { Alert } from "@/models/alert";
import { generateUniqueCustomId } from "@/utils/server/customIdGenerator";

/* ---------------- DATE HELPERS ---------------- */

function formatDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

/* ---------------- SAME 12-HOUR WINDOW ---------------- */

export function getCurrentWindow() {
  const now = new Date();
  let start: Date;
  let end: Date;

  const istHours =
    now.getUTCHours() + 5 + (now.getUTCMinutes() + 30 >= 60 ? 1 : 0);

  if (istHours < 12) {
    start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
    end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 5, 59, 59, 999));
  } else {
    start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 6, 0, 0));
    end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 17, 59, 59, 999));
  }

  return { start, end };
}

/* ---------------- ORDER DATE (IST → UTC) ---------------- */

function orderToUTCDate(order: any) {
  const [d, m, y] = order.payment_date.split("-").map(Number);
  const [hh, mm, ss] = order.payment_time.split(":").map(Number);
  return new Date(Date.UTC(y, m - 1, d, hh - 5, mm - 30, ss));
}

/* ---------------- GET FIRST ORDERS IN WINDOW ---------------- */

async function getFirstOrdersInWindow() {
  await connectDB();
  const { start, end } = getCurrentWindow();

  const orders = await Order.find({}).lean();

  return orders.filter((o: any) => {
    try {
      const dt = orderToUTCDate(o);
      return dt >= start && dt <= end;
    } catch {
      return false;
    }
  });
}

/* ---------------- MAIN LOGIC ---------------- */

export async function runReferralBonus() {
  try {
    const orders = await getFirstOrdersInWindow();
    if (!orders.length) return;

    let processed = 0;

    for (const order of orders) {
      try {
        /* 1️⃣ Ensure FIRST ORDER ONLY */
        const orderCount = await Order.countDocuments({
          user_id: order.user_id,
        });

        if (orderCount !== 1) continue;

        /* 2️⃣ Check already rewarded */
        const alreadyPaid = await History.exists({
          order_id: order.order_id,
          details: "Referral Bonus",
        });

        if (alreadyPaid) continue;

        /* 3️⃣ Get referBy */
        const referBy = order.referBy;
        if (!referBy) continue;

        /* 4️⃣ Ensure referBy active in tree */
        const node = await TreeNode.findOne({ user_id: referBy });
        if (!node || node.status !== "active") continue;

        /* 5️⃣ Calculate bonus */
        const orderPV = Number(order.order_pv || 0);
        if (orderPV <= 0) continue;

        const bonusAmount = orderPV * 10;
        if (bonusAmount <= 0) continue;

        /* 6️⃣ Wallet & user */
        const wallet = (await Wallet.findOne({ user_id: referBy }).lean()) as any;
        const user = await User.findOne({ user_id: referBy }).lean();

        const now = new Date();
        const payout_id = await generateUniqueCustomId("PY", DailyPayout, 8, 8);

        let status: "Pending" | "OnHold" | "Completed" = "Pending";
        if (!wallet || !wallet.account_number) status = "OnHold";

        /* 7️⃣ Amount splits */
        let withdraw = 0,
          reward = 0,
          tds = 0,
          admin = 0;

        if (wallet?.pan_verified) {
          withdraw = bonusAmount * 0.8;
          reward = bonusAmount * 0.08;
          tds = bonusAmount * 0.02;
          admin = bonusAmount * 0.1;
        } else {
          withdraw = bonusAmount * 0.62;
          reward = bonusAmount * 0.08;
          tds = bonusAmount * 0.2;
          admin = bonusAmount * 0.1;
        }

        /* 8️⃣ Create payout */
        const payout = await DailyPayout.create({
          transaction_id: payout_id,
          payout_id,
          user_id: referBy,
          user_name: node.name,
          contact: node.contact,
          mail: node.mail,
          user_status: node.status,
          rank: wallet?.rank,
          pan_verified: wallet?.pan_verified || false,
          wallet_id: wallet?.wallet_id,
          name: "Referral Bonus",
          title: "Referral Bonus",
          date: formatDate(now),
          time: now.toTimeString().slice(0, 5),
          available_balance: wallet?.balance || 0,
          amount: bonusAmount,
          withdraw_amount: withdraw,
          reward_amount: reward,
          tds_amount: tds,
          admin_charge: admin,
          to: referBy,
          from: order.user_id,
          transaction_type: "Credit",
          status,
          details: "Referral Bonus",
          order_id: order.order_id,
          created_by: "system",
          last_modified_at: now,
        });

        /* 9️⃣ History */
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
          date: payout.date,
          time: payout.time,
          amount: payout.amount,
          withdraw_amount: payout.withdraw_amount,
          reward_amount: payout.reward_amount,
          tds_amount: payout.tds_amount,
          admin_charge: payout.admin_charge,
          to: payout.to,
          from: payout.from,
          transaction_type: payout.transaction_type,
          details: "Referral Bonus",
          status: payout.status,
          created_by: "system",
          last_modified_at: now,
        });

        /* 🔔 Alert */
        await Alert.create({
          user_id: referBy,
          title: "Referral Bonus Credited 🎉",
          description: `You earned ₹${bonusAmount} from referral ${order.user_id}`,
          link: "/wallet/payout/daily",
          role: "user",
          priority: "medium",
          read: false,
          date: formatDate(now),
          created_at: now,
        });

        processed++;
      } catch (inner) {
        console.error("[Referral Bonus] Order error:", order?.order_id, inner);
      }
    }

    if (processed > 0) {
      await Alert.create({
        role: "admin",
        title: "Referral Bonus Processed",
        description: `${processed} referral bonus payouts released.`,
        priority: "high",
        read: false,
        date: formatDate(new Date()),
        created_at: new Date(),
      });
    }
  } catch (err) {
    console.error("[Referral Bonus] Fatal error:", err);
    throw err;
  }
}

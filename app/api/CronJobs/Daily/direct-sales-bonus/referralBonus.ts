import { DailyPayout } from "@/models/payout";
import { Wallet } from "@/models/wallet";
import { User } from "@/models/user";
import TreeNode from "@/models/tree";
import { History } from "@/models/history";
import { Alert } from "@/models/alert";

import { generateUniqueCustomId } from "@/utils/server/customIdGenerator";
import { getTotalPayout, checkHoldStatus } from "@/services/totalpayout";

function formatDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

const REFERRAL_AMOUNT = 1000;

export async function releaseReferralBonus({
  sponsorId,
  buyerId,
  orderId,
}: {
  sponsorId: string;
  buyerId: string;
  orderId: string;
}) {
  const node = await TreeNode.findOne({ user_id: sponsorId });
  if (!node || node.status !== "active") return;

  const wallet = await Wallet.findOne({ user_id: sponsorId });
  const user = await User.findOne({ user_id: sponsorId });

  const previous = await getTotalPayout(sponsorId);
  const afterThis = previous + REFERRAL_AMOUNT;

  let status: "Pending" | "OnHold" | "Completed" = "Pending";

  if (!wallet || !wallet.account_number) status = "OnHold";
  else if (checkHoldStatus(afterThis, user?.pv ?? 0)) status = "OnHold";

  let withdraw = 0,
    reward = 0,
    tds = 0,
    admin = 0;

  if (wallet?.pan_verified) {
    withdraw = 800;
    reward = 80;
    tds = 20;
    admin = 100;
  } else {
    withdraw = 620;
    reward = 80;
    tds = 200;
    admin = 100;
  }

  const payout_id = await generateUniqueCustomId("PY", DailyPayout, 8, 8);
  const now = new Date();

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
    pan_verified: wallet?.pan_verified ?? false,

    name: "Referral Bonus",
    title: "Referral Bonus",
    date: formatDate(now),
    time: now.toTimeString().slice(0, 5),

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
    details: `Referral Bonus for first order ${orderId}`,

    created_by: "system",
    last_modified_by: "system",
    last_modified_at: now,
  });

  await History.create({
    transaction_id: payout.transaction_id,
    wallet_id: payout.wallet_id,
    user_id: payout.user_id,
    user_name: node.name,

    order_id: orderId,

    date: formatDate(now),
    time: now.toTimeString().slice(0, 5),

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

    first_payment: false,
    advance: false,
    ischecked: false,

    created_by: "system",
    last_modified_by: "system",
    last_modified_at: now,
  });

  await Alert.create({
    user_id: sponsorId,
    title: "Referral Bonus Earned 🎉",
    description: `You earned ₹1000 referral bonus for first order ${orderId}.`,
    role: "user",
    priority: "medium",
    read: false,
    link: "/wallet/payout/daily",
    date: formatDate(now),
    created_at: now,
  });
}

import { DailyPayout } from "@/models/payout";
import { Wallet } from "@/models/wallet";
import { User } from "@/models/user";
import TreeNode from "@/models/tree";
import { History } from "@/models/history";
import { Alert } from "@/models/alert";
import { addRewardScore } from "@/services/updateRewardScore";
import { updateClub } from "@/services/clubrank";

import { generateUniqueCustomId } from "@/utils/server/customIdGenerator";
import { getTotalPayout, checkHoldStatus } from "@/services/totalpayout";

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
  const node = await TreeNode.findOne({ user_id: sponsorId });
  if (!node || node.status !== "active") return;

  const wallet = await Wallet.findOne({ user_id: sponsorId });
  const user = await User.findOne({ user_id: sponsorId });

  const previous = await getTotalPayout(sponsorId);
  const afterThis = previous + REFERRAL_AMOUNT;

  let status: "Pending" | "OnHold" | "Completed" = "Pending";

  if (!wallet || !wallet.account_number)
    status = "OnHold";
  else if (checkHoldStatus(afterThis, user?.pv ?? 0))
    status = "OnHold";

  /* ------------------- Amount Split ------------------- */

  let withdraw = 0;
  let reward = 0;
  let tds = 0;
  let admin = 0;

  if (wallet?.pan_verified) {
    withdraw = Math.round(REFERRAL_AMOUNT * 0.8);  // 80%
    reward = Math.round(REFERRAL_AMOUNT * 0.08);   // 8%
    tds = Math.round(REFERRAL_AMOUNT * 0.02);      // 2%
    admin = Math.round(REFERRAL_AMOUNT * 0.1);     // 10%
  } else {
    withdraw = Math.round(REFERRAL_AMOUNT * 0.62); // 62%
    reward = Math.round(REFERRAL_AMOUNT * 0.08);   // 8%
    tds = Math.round(REFERRAL_AMOUNT * 0.2);       // 20%
    admin = Math.round(REFERRAL_AMOUNT * 0.1);     // 10%
  }

  const payout_id = await generateUniqueCustomId("PY", DailyPayout, 8, 8);
  const now = new Date();
  const formattedDate = formatDate(now);

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
    pan_verified: wallet?.pan_verified ?? false,

    name: "Referral Bonus",
    title: "Referral Bonus",
    date: formattedDate,
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
    details: isAdvance
      ? `Referral Bonus for activation ${orderId}`
      : `Referral Bonus for first order ${orderId}`,

    created_by: "system",
    last_modified_by: "system",
    last_modified_at: now,
  });

  /* ------------------- Create History Entry ------------------- */

  await History.create({
    transaction_id: payout.transaction_id,
    wallet_id: payout.wallet_id,
    user_id: payout.user_id,
    user_name: node.name,

    order_id: orderId,

    date: formattedDate,
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

    first_payment: isAdvance ? true : false,
    first_order: isAdvance ? false : true,
    advance: isAdvance ? true : false,

    ischecked: false,
    isReferralChecked: true,  // 🔥 VERY IMPORTANT

    created_by: "system",
    last_modified_by: "system",
    last_modified_at: now,
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
    created_at: now,
  });

  /* ------------------- Club + Rank Update ------------------- */

  const totalPayout = await getTotalPayout(sponsorId);

  const beforeUser =( await User.findOne({ user_id: sponsorId })
    .select("rank club")
    .lean() ) as any;

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
        created_at: now,
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
        created_at: now,
      });
    }
  }
}
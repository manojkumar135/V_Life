import { connectDB } from "@/lib/mongodb";
import { DailyPayout, WeeklyPayout } from "@/models/payout";
import { User } from "@/models/user";
import { Wallet } from "@/models/wallet";
import { History } from "@/models/history";
import { generateUniqueCustomId } from "@/utils/server/customIdGenerator";

// ---------------- Helper Functions ----------------
function formatDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
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
const txId = generateTransactionId("MB");

function parseDDMMYYYY(dateStr: string): Date {
  const [dd, mm, yyyy] = dateStr.split("-").map(Number);
  return new Date(yyyy, mm - 1, dd);
}

// ✅ Fetch last 15 days payouts (matching + direct sales)
async function getLast15DaysEligiblePayouts() {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - 15);

  const payouts = await DailyPayout.find({
    name: { $in: ["Matching Bonus", "Direct Sales Bonus"] },
    is_checked: false,
  });

  const filtered = payouts.filter((p) => {
    const payoutDate = parseDDMMYYYY(p.date);
    return payoutDate >= start && payoutDate <= now;
  });

  console.log(
    `[Infinity Bonus] Found ${filtered.length} payouts (Matching + Direct Sales) in last 15 days`
  );
  return filtered;
}

// ✅ Find sponsor if user.infinity is missing
async function findSponsorByInfinityUsers(userId: string): Promise<any | null> {
  return await User.findOne({
    infinity_users: { $elemMatch: { users: userId } },
    user_status: "active",
  });
}

// ✅ Main Logic
export async function runInfinityBonus() {
  try {
    await connectDB();
    console.log("🚀 [Infinity Bonus] Starting...");

    const payouts = await getLast15DaysEligiblePayouts();
    if (!payouts.length) {
      console.log("⚠️ [Infinity Bonus] No eligible payouts found.");
      return;
    }

    let totalCreated = 0;

    for (const payout of payouts) {
      const user = await User.findOne({ user_id: payout.user_id });
      if (!user) continue;

      let sponsor: any = null;

      // 1️⃣ Try direct assigned infinity sponsor
      if (user.infinity) {
        sponsor = await User.findOne({
          user_id: user.infinity,
          user_status: "active",
        });
      }

      // 2️⃣ If missing, find by infinity_users array
      if (!sponsor) {
        sponsor = await findSponsorByInfinityUsers(user.user_id);
      }

      if (!sponsor) {
        console.log(
          `⚠️ No sponsor found for ${user.user_id}, skipping Infinity Bonus.`
        );
        continue;
      }

      const rank = sponsor.rank;
      if (!rank || rank === "none") {
        console.log(
          `⚠️ Sponsor ${sponsor.user_id} has no rank, skipping Infinity Bonus.`
        );
        continue;
      }

      const rankPercentages: Record<string, number> = {
        "1": 0.25,
        "2": 0.35,
        "3": 0.4,
        "4": 0.45,
        "5": 0.5,
      };
      const bonusPercentage = rankPercentages[rank] || 0;
      const wallet = await Wallet.findOne({ user_id: sponsor.user_id });

      let payoutStatus: "Pending" | "OnHold" | "Completed" = "Pending";
      if (!wallet || !wallet.pan_verified) payoutStatus = "OnHold";

      if (!wallet) {
        console.log(
          `⚠️ No wallet found for ${sponsor.user_id}, skipping Infinity Bonus.`
        );
        continue;
      }

      const now = new Date();
      const payout_id = await generateUniqueCustomId("FP", WeeklyPayout, 8, 8);
      const bonusAmount = payout.amount * bonusPercentage;

      const withdrawAmount = bonusAmount * 0.8;
      const rewardAmount = bonusAmount * 0.1;
      const tdsAmount = bonusAmount * 0.05;
      const adminCharge = bonusAmount * 0.05;

      const infinityPayout = await WeeklyPayout.create({
        transaction_id: `${txId}-${sponsor.user_id}`,
        payout_id,
        user_id: sponsor.user_id,
        user_name: sponsor.user_name,
        rank: wallet?.rank,
        wallet_id: wallet.wallet_id,
        name: "Infinity Bonus",
        title: "Infinity Bonus",
        account_holder_name: wallet?.account_holder_name || "",
        bank_name: wallet?.bank_name || "",
        account_number: wallet?.account_number || "",
        ifsc_code: wallet?.ifsc_code || "",
        date: formatDate(now),
        time: now.toTimeString().slice(0, 5),
        available_balance: wallet?.balance || 0,
        amount: bonusAmount,
        total: bonusAmount,
        transaction_type: "Credit",
        status: payoutStatus,
        details: `${payout.name} from ${user.user_id}`,

        withdraw_amount: withdrawAmount,
        reward_amount: rewardAmount,
        tds_amount: tdsAmount,
        admin_charge: adminCharge,

        team_users: [
          {
            user_id: payout.user_id,
            amount: payout.amount,
            bonus_type: payout.name,
            transaction_id: payout.transaction_id,
          },
        ],

        created_by: "system",
        last_modified_by: "system",
        last_modified_at: now,
      });

      await History.create({
        transaction_id: infinityPayout.transaction_id,
        wallet_id: infinityPayout.wallet_id,
        user_id: infinityPayout.user_id,
        user_name: infinityPayout.user_name,
        account_holder_name: infinityPayout.account_holder_name,
        bank_name: infinityPayout.bank_name,
        account_number: infinityPayout.account_number,
        ifsc_code: infinityPayout.ifsc_code,
        date: infinityPayout.date,
        time: infinityPayout.time,
        available_balance: infinityPayout.available_balance,
        amount: infinityPayout.amount,
        transaction_type: infinityPayout.transaction_type,
        details: infinityPayout.details,
        status: infinityPayout.status,
        first_payment: false,
        advance: false,
        ischecked: false,
        created_by: "system",
        last_modified_by: "system",
        last_modified_at: now,
      });

      await User.findOneAndUpdate(
        { user_id: sponsor.user_id },
        { $inc: { score: rewardAmount } }
      );

      await DailyPayout.updateOne(
        { _id: payout._id },
        { $set: { is_checked: true } }
      );

      totalCreated++;
      console.log(
        `✅ Infinity Bonus released for ${sponsor.user_id} - ₹${bonusAmount} (${payout.name} from ${user.user_id})`
      );
    }

    console.log(
      `\n✅ [Infinity Bonus] Completed. Total payouts created: ${totalCreated}`
    );
  } catch (err) {
    console.error("❌ [Infinity Bonus] Error:", err);
    throw err;
  }
}

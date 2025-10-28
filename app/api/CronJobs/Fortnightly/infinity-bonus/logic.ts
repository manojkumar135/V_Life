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

function parseDDMMYYYY(dateStr: string): Date {
  const [dd, mm, yyyy] = dateStr.split("-").map(Number);
  return new Date(yyyy, mm - 1, dd);
}

// ✅ Get Matching Bonus payouts from last 15 days, is_checked: false
async function getLast15DaysMatchingPayouts() {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - 15);

  const payouts = await DailyPayout.find({
    name: "Matching Bonus",
    // status: "Completed",
    is_checked: false, // Only consider unchecked payouts
  });
  const filtered = payouts.filter((p) => {
    const payoutDate = parseDDMMYYYY(p.date);
    return payoutDate >= start && payoutDate <= now;
  });

  console.log(
    `[Infinity Bonus] Found ${filtered.length} Matching Bonus payouts in last 15 days`
  );
  return filtered;
}

// ✅ Find sponsor by infinity_users if user.infinity is not set
async function findSponsorByInfinityUsers(userId: string): Promise<any | null> {
  const sponsors = await User.find({
    infinity_users: {
      $elemMatch: {
        users: userId,
      },
    },
    user_status: "active",
  });
  return sponsors.length > 0 ? sponsors[0] : null;
}

// ✅ Run Infinity Bonus Logic
export async function runInfinityBonus() {
  try {
    await connectDB();
    console.log("🚀 [Infinity Bonus] Starting execution...");

    const last15DaysPayouts = await getLast15DaysMatchingPayouts();
    if (!last15DaysPayouts.length) {
      console.log(
        "⚠️ [Infinity Bonus] No Matching Bonus payouts found in last 15 days."
      );
      return;
    }

    let totalCreated = 0;

    for (const payout of last15DaysPayouts) {
      // Find the user who received the matching bonus
      const user = await User.findOne({ user_id: payout.user_id });
      if (!user) continue;

      let sponsor: any = null;

      // 1️⃣ Try user.infinity
      if (user.infinity) {
        sponsor = await User.findOne({
          user_id: user.infinity,
          user_status: "active",
        });
      }

      // 2️⃣ If not found, search in infinity_users
      if (!sponsor) {
        sponsor = await findSponsorByInfinityUsers(user.user_id);
      }

      if (!sponsor) {
        console.log(
          `⚠️ No sponsor found for ${user.user_id}, skipping Infinity Bonus.`
        );
        continue;
      }

      // ✅ Check sponsor rank
      const rank = sponsor.rank; // rank can be "1" | "2" | "3" | "4" | "5" or empty/none
      if (!rank || rank === "none") {
        console.log(
          `⚠️ Sponsor ${sponsor.user_id} has no rank, skipping Infinity Bonus.`
        );
        continue;
      }

      // Determine bonus percentage based on rank
      const rankPercentages: Record<string, number> = {
        "1": 0.25,
        "2": 0.35,
        "3": 0.4,
        "4": 0.45,
        "5": 0.5,
      };
      const bonusPercentage = rankPercentages[rank] || 0;

      // Find sponsor's wallet
      const wallet = await Wallet.findOne({ user_id: sponsor.user_id });

      // Determine payout status
      let payoutStatus: "Pending" | "OnHold" | "Completed" = "Pending";
      if (!wallet || !wallet.pan_verified) {
        payoutStatus = "OnHold"; // wallet missing or PAN not verified
      } else {
        payoutStatus = "Pending"; // all checks passed
      }

      if (!wallet) {
        console.log(
          `⚠️ No wallet found for ${sponsor.user_id}, skipping Infinity Bonus.`
        );
        continue;
      }

      // Release 50% of matching bonus to sponsor
      const now = new Date();
      const payout_id = await generateUniqueCustomId("FP", WeeklyPayout, 8, 8);
      const bonusAmount = payout.amount * bonusPercentage;

      // ✅ Split Bonus Amount
      const withdrawAmount = bonusAmount * 0.8; // 80%
      const rewardAmount = bonusAmount * 0.1; // 10%
      const tdsAmount = bonusAmount * 0.05; // 5%
      const adminCharge = bonusAmount * 0.05; // 5%

      const infinityPayout = await WeeklyPayout.create({
        transaction_id: "",
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
        details: `Infinity Bonus from ${user.user_id}`,

        // ✅ Split fields
        withdraw_amount: withdrawAmount,
        reward_amount: rewardAmount,
        tds_amount: tdsAmount,
        admin_charge: adminCharge,

        team_users: [
          {
            user_id: payout.user_id,
            amount: payout.amount,
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

      // ✅ Add reward to sponsor's score
      await User.findOneAndUpdate(
        { user_id: sponsor.user_id },
        { $inc: { score: rewardAmount } }
      );

      // ✅ Mark payout as checked
      await DailyPayout.updateOne(
        { _id: payout._id },
        { $set: { is_checked: true } }
      );

      totalCreated++;
      console.log(
        `✅ Infinity Bonus released for ${sponsor.user_id} - ₹${bonusAmount} (from ${user.user_id})`
      );
    }

    console.log(
      `\n✅ [Infinity Bonus] Execution completed. Total payouts created: ${totalCreated}`
    );
  } catch (err) {
    console.error("❌ [Infinity Bonus] Error:", err);
    throw err;
  }
}

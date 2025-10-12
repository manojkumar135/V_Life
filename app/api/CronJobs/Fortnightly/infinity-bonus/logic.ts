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
    is_checked: false // Only consider unchecked payouts
  });
  const filtered = payouts.filter((p) => {
    const payoutDate = parseDDMMYYYY(p.date);
    return payoutDate >= start && payoutDate <= now;
  });

  console.log(`[Infinity Bonus] Found ${filtered.length} Matching Bonus payouts in last 15 days`);
  return filtered;
}

// ✅ Find sponsor by infinity_users if user.infinity is not set
async function findSponsorByInfinityUsers(userId: string): Promise<any | null> {
  const sponsors = await User.find({
    infinity_users: {
      $elemMatch: {
        users: userId
      }
    },
    user_status: "active"
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
      console.log("⚠️ [Infinity Bonus] No Matching Bonus payouts found in last 15 days.");
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
        sponsor = await User.findOne({ user_id: user.infinity, user_status: "active" });
      }

      // 2️⃣ If not found, search in infinity_users
      if (!sponsor) {
        sponsor = await findSponsorByInfinityUsers(user.user_id);
      }

      if (!sponsor) {
        console.log(`⚠️ No sponsor found for ${user.user_id}, skipping Infinity Bonus.`);
        continue;
      }

      // Find sponsor's wallet
      const wallet = await Wallet.findOne({ user_id: sponsor.user_id });
      if (!wallet) {
        console.log(`⚠️ No wallet found for ${sponsor.user_id}, skipping Infinity Bonus.`);
        continue;
      }

      // Release 50% of matching bonus to sponsor
      const now = new Date();
      const payout_id = await generateUniqueCustomId("FP", WeeklyPayout, 8, 8);
      const bonusAmount = payout.amount * 0.5;

      const infinityPayout = await WeeklyPayout.create({
        transaction_id: `IB${Date.now()}`,
        payout_id,
        user_id: sponsor.user_id,
        user_name: sponsor.user_name,
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
        transaction_type: "Credit",
        status: "Completed",
        details: `Infinity Bonus from ${user.user_id}`,
        team_users: [{
          user_id: payout.user_id,
          amount: payout.amount,
          transaction_id: payout.transaction_id,
        }],
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

      // ✅ Mark payout as checked
      await DailyPayout.updateOne(
        { _id: payout._id },
        { $set: { is_checked: true } }
      );

      totalCreated++;
      console.log(`✅ Infinity Bonus released for ${sponsor.user_id} - ₹${bonusAmount} (from ${user.user_id})`);
    }

    console.log(`\n✅ [Infinity Bonus] Execution completed. Total payouts created: ${totalCreated}`);
  } catch (err) {
    console.error("❌ [Infinity Bonus] Error:", err);
    throw err;
  }
}
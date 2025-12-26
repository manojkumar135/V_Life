import { connectDB } from "@/lib/mongodb";
import { DailyPayout, WeeklyPayout } from "@/models/payout";
import { User } from "@/models/user";
import { Wallet } from "@/models/wallet";
import { History } from "@/models/history";
import { generateUniqueCustomId } from "@/utils/server/customIdGenerator";
import { Alert } from "@/models/alert";
import { getTotalPayout, checkHoldStatus } from "@/services/totalpayout";
import { checkIs5StarRank, updateClub } from "@/services/getrank";
import { addRewardScore } from "@/services/updateRewardScore";

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
const txId = generateTransactionId("IB");

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
  // console.log(filtered )

  console.log(
    `[Infinity Bonus] Found ${filtered.length} payouts (Matching + Direct Sales) in last 15 days`
  );
  // console.log(filtered)
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

      console.log(sponsor);
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

      const now = new Date();
      const payout_id = await generateUniqueCustomId("FP", WeeklyPayout, 8, 8);
      const bonusAmount = payout.amount * bonusPercentage;

      const previousPayout = await getTotalPayout(sponsor.user_id);
      const afterThis = previousPayout + bonusAmount;

      let payoutStatus: "Pending" | "OnHold" | "Completed" = "Pending";

      // 1️⃣ If wallet not created → Hold
      if (!wallet) {
        payoutStatus = "OnHold";
      }

      // 2️⃣ If wallet exists but bank details missing → Hold
      else if (!wallet.account_number) {
        payoutStatus = "OnHold";
      }

      // 3️⃣ Apply PV-based hold rules
      else if (checkHoldStatus(afterThis, user?.pv ?? 0)) {
        payoutStatus = "OnHold";
      }

      let withdrawAmount = 0;
      let rewardAmount = 0;
      let tdsAmount = 0;
      let adminCharge = 0;

      if (wallet && wallet.pan_verified) {
        // PAN Verified
        withdrawAmount = Number((bonusAmount * 0.8).toFixed(2));
        rewardAmount = Number((bonusAmount * 0.08).toFixed(2));
        tdsAmount = Number((bonusAmount * 0.02).toFixed(2));
        adminCharge = Number((bonusAmount * 0.1).toFixed(2));
      } else {
        // PAN Not Verified OR No wallet
        withdrawAmount = Number((bonusAmount * 0.62).toFixed(2));
        rewardAmount = Number((bonusAmount * 0.08).toFixed(2));
        tdsAmount = Number((bonusAmount * 0.2).toFixed(2));
        adminCharge = Number((bonusAmount * 0.1).toFixed(2));
      }

      // ✅ Dynamic Infinity Bonus Title
      const infinityTitleMap: Record<string, string> = {
        "Direct Sales Bonus": "Infinity Sales Bonus",
        "Matching Bonus": "Infinity Matching Bonus",
      };
      const infinityTitle = infinityTitleMap[payout.name] || "Infinity Bonus";

      const infinityPayout = await WeeklyPayout.create({
        // transaction_id: `${txId}-${sponsor.user_id}`,
        transaction_id: payout_id,
        payout_id,
        user_id: sponsor.user_id,
        user_name: sponsor.user_name,
        rank: sponsor?.rank || "none",
        wallet_id: wallet ? wallet.wallet_id : "",
        pan_verified: wallet?.pan_verified || false,
        mail: sponsor?.mail || "",
        contact: sponsor?.contact || "",
        user_status: sponsor?.status || "active",

        name: infinityTitle,
        title: infinityTitle,
        account_holder_name: wallet?.account_holder_name || "",
        bank_name: wallet?.bank_name || "",
        account_number: wallet?.account_number || "",
        ifsc_code: wallet?.ifsc_code || "",
        date: formatDate(now),
        time: now.toTimeString().slice(0, 5),
        available_balance: wallet?.balance || 0,
        amount: bonusAmount,
        transaction_type: "Credit",
        status: payoutStatus,
        details: `${infinityTitle} from ${user.user_id}`,

        total_amount: bonusAmount,
        withdraw_amount: withdrawAmount,
        reward_amount: rewardAmount,
        tds_amount: tdsAmount,
        admin_charge: adminCharge,
        from: payout.user_id,
        to: sponsor.user_id,

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

      const isFiveStar = await checkIs5StarRank(sponsor.user_id);
      const totalPayout = await getTotalPayout(sponsor.user_id);

      // ⭐⭐ Only run updateClub if BOTH are true
      if (isFiveStar && totalPayout >= 100000) {
        const updatedClub = await updateClub(
          sponsor.user_id,
          totalPayout,
          isFiveStar
        );

        if (updatedClub) {
          await Alert.create({
            user_id: sponsor.user_id,
            title: `🎖️ ${updatedClub.newRank} Rank Achieved`,
            description: `Congrats! Welcome to the ${updatedClub.newClub} Club`,
            priority: "high",
            read: false,
            link: "/dashboards",

            user_name: sponsor.name,
            user_contact: sponsor.contact,
            user_email: sponsor.mail,
            user_status: sponsor.status || "active",
            related_id: payout.payout_id,

            role: "user",
            date: formatDate(now),
            created_at: now,
          });
        }
      }

      await History.create({
        transaction_id: infinityPayout.transaction_id,
        wallet_id: infinityPayout.wallet_id,
        user_id: infinityPayout.user_id,
        user_name: infinityPayout.user_name,
        rank: infinityPayout.rank,
        pan_verified: infinityPayout.pan_verified,
        mail: infinityPayout.mail,
        contact: infinityPayout.contact,
        user_status: infinityPayout.user_status,
        account_holder_name: infinityPayout.account_holder_name,
        bank_name: infinityPayout.bank_name,
        account_number: infinityPayout.account_number,
        ifsc_code: infinityPayout.ifsc_code,
        date: infinityPayout.date,
        time: infinityPayout.time,
        available_balance: infinityPayout.available_balance,
        amount: infinityPayout.amount,
        total_amount: infinityPayout.amount,
        withdraw_amount: infinityPayout.withdraw_amount,
        reward_amount: infinityPayout.reward_amount,
        tds_amount: infinityPayout.tds_amount,
        admin_charge: infinityPayout.admin_charge,
        to: infinityPayout.to,
        from: infinityPayout.from,
        transaction_type: infinityPayout.transaction_type,
        details: infinityPayout.details,
        status: infinityPayout.status,
        first_payment: false,
        advance: false,
        ischecked: true,
        created_by: "system",
        last_modified_by: "system",
        last_modified_at: now,
      });

      await addRewardScore({
        user_id: sponsor.user_id,
        points: withdrawAmount,
        source:
          payout.name === "Matching Bonus"
            ? "infinity_matching_bonus"
            : "infinity_sales_bonus",
        reference_id: infinityPayout.payout_id,
        remarks: `${infinityTitle} from ${user.user_id}`,
        type: "fortnight",
      });

      await DailyPayout.updateOne(
        { _id: payout._id },
        { $set: { is_checked: true } }
      );

      await Alert.create({
        user_id: sponsor.user_id,
        user_name: sponsor.user_name,
        user_contact: sponsor.contact,
        user_email: sponsor.mail,
        user_status: sponsor.user_status || "active",
        related_id: infinityPayout.payout_id,
        link: "/wallet/payout/weekly",
        title: `${infinityTitle} Released 🎯`,
        description: `You received ₹${bonusAmount.toLocaleString()} from ${infinityTitle} generated by ${
          user.user_id
        }.`,
        role: "user",
        priority: "medium",
        read: false,
        date: formatDate(now),
        created_at: now,
      });

      totalCreated++;
      console.log(
        `✅ Infinity Bonus released for ${sponsor.user_id} - ₹${bonusAmount} (${payout.name} from ${user.user_id})`
      );
    }

    if (totalCreated > 0) {
      await Alert.create({
        role: "admin",
        title: "Infinity Bonus Payouts Released",
        description: `${totalCreated} Infinity Bonus payouts have been successfully processed.`,
        priority: "high",
        read: false,
        link: "/wallet/payout/weekly",
        date: formatDate(new Date()),
        created_at: new Date(),
      });
    }

    console.log(
      `\n✅ [Infinity Bonus] Completed. Total payouts created: ${totalCreated}`
    );
  } catch (err) {
    console.error("❌ [Infinity Bonus] Error:", err);
    throw err;
  }
}

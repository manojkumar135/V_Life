import { connectDB } from "@/lib/mongodb";
import { DailyPayout, WeeklyPayout } from "@/models/payout";
import { User } from "@/models/user";
import { Wallet } from "@/models/wallet";
import { History } from "@/models/history";
import { generateUniqueCustomId } from "@/utils/server/customIdGenerator";
import { Alert } from "@/models/alert";
import { getTotalPayout } from "@/services/totalpayout";
import {
  evaluateAndUpdateHoldStatus,
  currentMonth,
} from "@/services/monthlyHoldService";
import { updateClub } from "@/services/clubrank";
import { addRewardScore } from "@/services/updateRewardScore";
import { getInfinityBonusPercentage } from "@/services/infinityBonusRules";
import { determineHoldReasons } from "@/services/payoutHoldService";

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

  console.log("Found payouts:", payouts);

  const filtered = payouts.filter((p) => {
    const payoutDate = parseDDMMYYYY(p.date);
    return payoutDate >= start && payoutDate <= now;
  });

  console.log(
    `[Infinity Bonus] Found ${filtered.length} payouts (Matching + Direct Sales) in last 15 days`,
  );
  // console.log(filtered,"infiniserhetet")
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

    // ✅ IN-MEMORY dedup Set — key: "fromUserId__sponsorId__infinityTitle"
    // This is the PRIMARY guard. It prevents any duplicate infinity payout
    // within this single cron run, regardless of how many DailyPayout records
    // exist for the same user (different transaction_ids, different dates, etc.)
    const processedThisRun = new Set<string>();

    let totalCreated = 0;

    for (const payout of payouts) {
      const user = await User.findOne({ user_id: payout.user_id });
      if (!user) {
        // Mark checked so it won't be reprocessed
        await DailyPayout.updateOne(
          { _id: payout._id },
          { $set: { is_checked: true } },
        );
        continue;
      }

      let sponsor: any = null;

      // 1️⃣ Try direct assigned infinity sponsor (user.infinity field)
      if (user.infinity) {
        sponsor = await User.findOne({
          user_id: user.infinity,
          user_status: "active",
        });
      }

      // 2️⃣ If still no sponsor, find via infinity_users array
      if (!sponsor) {
        sponsor = await findSponsorByInfinityUsers(user.user_id);
      }

      if (!sponsor) {
        console.log(
          `⚠️ No sponsor found for ${user.user_id}, skipping Infinity Bonus.`,
        );
        continue;
      }

      console.log(sponsor);

      const bonusPercentage = await getInfinityBonusPercentage(sponsor.user_id);

      if (bonusPercentage === 0) {
        console.log(
          `⚠️ Sponsor ${sponsor.user_id} not eligible for Infinity Bonus`,
        );
        // Mark checked so it won't be reprocessed
        await DailyPayout.updateOne(
          { _id: payout._id },
          { $set: { is_checked: true } },
        );
        continue;
      }

      const wallet = await Wallet.findOne({ user_id: sponsor.user_id });

      // ✅ Declare infinityTitle before any guard uses it
      const infinityTitleMap: Record<string, string> = {
        "Direct Sales Bonus": "Infinity Sales Bonus",
        "Matching Bonus": "Infinity Matching Bonus",
      };
      const infinityTitle = infinityTitleMap[payout.name] || "Infinity Bonus";

      // ─────────────────────────────────────────────────────────────
      // ✅ GUARD 1 — In-Memory Set
      // Catches ALL duplicates within this single cron run.
      // Covers cases where:
      //   - DailyPayout has 2 records for same user+type (different transaction_ids)
      //   - DailyPayout has 2 records for same user+type (different dates)
      //   - Any other scenario producing multiple source payouts for same user
      // ─────────────────────────────────────────────────────────────
      const runKey = `${payout.user_id}__${sponsor.user_id}__${infinityTitle}`;
      if (processedThisRun.has(runKey)) {
        console.log(
          `⚠️ [In-Memory Guard] Duplicate skipped this run: ${payout.user_id} → ${sponsor.user_id} (${infinityTitle})`,
        );
        // Still mark the source payout as checked so it won't appear again next run
        await DailyPayout.updateOne(
          { _id: payout._id },
          { $set: { is_checked: true } },
        );
        continue;
      }

      // ─────────────────────────────────────────────────────────────
      // ✅ GUARD 2 — DB Check
      // Catches duplicates if the cron runs more than once today
      // (e.g. manual trigger, retry, scheduler overlap)
      // ─────────────────────────────────────────────────────────────
      const todayFormatted = formatDate(new Date());
      const alreadyExists = await WeeklyPayout.findOne({
        from: payout.user_id,
        to: sponsor.user_id,
        name: infinityTitle,
        date: todayFormatted,
      });
      if (alreadyExists) {
        console.log(
          `⚠️ [DB Guard] Already released today: ${payout.user_id} → ${sponsor.user_id} (${infinityTitle})`,
        );
        await DailyPayout.updateOne(
          { _id: payout._id },
          { $set: { is_checked: true } },
        );
        continue;
      }

      // ✅ Register in-memory BEFORE creating — so next iteration in this run is blocked
      processedThisRun.add(runKey);

      const istNow = new Date(
        new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
      );
      const payout_id = await generateUniqueCustomId("FP", WeeklyPayout, 8, 8);
      const bonusAmount = payout.amount * bonusPercentage;

      // ── Determine payout status ──────────────────────────────────────
      //
      //  Hold priority (all 4 conditions checked via determineHoldReasons):
      //   1. No wallet / no account_number             → OnHold (NO_WALLET)
      //   2. Wallet exists but inactive                → OnHold (WALLET_INACTIVE)
      //   3. Wallet change request pending             → OnHold (WALLET_UNDER_REVIEW)
      //   4. Prior month PV uncleared / this month
      //      crossed threshold with PV unmet           → OnHold (PV_NOT_FULFILLED)
      //   5. All clear                                 → Pending
      //
      //  evaluateAndUpdateHoldStatus MUST be called first so that
      //  MonthlyPayoutTracker.total_payout is updated BEFORE
      //  determineHoldReasons reads it for the PV check.

      // Step 1: Update monthly tracker total (WRITE)
      await evaluateAndUpdateHoldStatus(sponsor.user_id, bonusAmount);

      // Step 2: Read all 4 hold conditions with full metadata (READ)
      const hold = await determineHoldReasons(sponsor.user_id, currentMonth());

      const payoutStatus: "Pending" | "OnHold" | "Completed" = hold.status;

      let withdrawAmount = 0;
      let rewardAmount = 0;
      let tdsAmount = 0;
      let adminCharge = 0;

      const isPanVerified =
  wallet?.pan_verified === true ||
  String(wallet?.pan_verified).toLowerCase() === "yes";

      if (wallet && wallet.isPanVerified) {
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

      const infinityPayout = await WeeklyPayout.create({
        transaction_id: payout_id,
        payout_id,
        user_id: sponsor.user_id,
        user_name: sponsor.user_name,
        rank: sponsor?.rank || "none",
        wallet_id: wallet ? wallet.wallet_id : "",
        pan_verified: isPanVerified || false,
        mail: sponsor?.mail || "",
        contact: sponsor?.contact || "",
        user_status: sponsor?.status || "active",

        name: infinityTitle,
        title: infinityTitle,
        account_holder_name: wallet?.account_holder_name || "",
        bank_name: wallet?.bank_name || "",
        account_number: wallet?.account_number || "",
        ifsc_code: wallet?.ifsc_code || "",
        date: formatDate(istNow),
        time: istNow.toTimeString().slice(0, 5),
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

        // ✅ ADDED: hold metadata — so admin knows WHY payout is OnHold
        hold_reasons: hold.reasons,
        hold_reason_labels: hold.labels,
        hold_release_reason: hold.summary,

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
        last_modified_at: istNow,
      });

      const totalPayout = await getTotalPayout(sponsor.user_id);

      // 🔹 Capture BEFORE state
      const beforeUser = (await User.findOne({ user_id: sponsor.user_id })
        .select("rank club")
        .lean()) as any;

      const updatedClub = await updateClub(sponsor.user_id, totalPayout);

      if (updatedClub && beforeUser) {
        // 🎉 CLUB ENTRY ALERT
        if (beforeUser.club !== updatedClub.newClub) {
          await Alert.create({
            user_id: sponsor.user_id,
            title: `🎉 ${updatedClub.newClub} Club Achieved`,
            description: `Congrats! Welcome to the ${updatedClub.newClub} Club 🎉`,
            priority: "high",
            read: false,
            link: "/dashboards",
            role: "user",
            date: formatDate(istNow),
            created_at: istNow,
          });
        }

        // 🎖️ RANK ACHIEVEMENT ALERT
        if (beforeUser.rank !== updatedClub.newRank) {
          await Alert.create({
            user_id: sponsor.user_id,
            title: `🎖️ ${updatedClub.newRank} Rank Achieved`,
            description: `Congratulations! You achieved ${updatedClub.newRank} rank 🎖️`,
            priority: "high",
            read: false,
            link: "/dashboards",
            role: "user",
            date: formatDate(istNow),
            created_at: istNow,
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
        last_modified_at: istNow,
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

      await addRewardScore({
        user_id: sponsor.user_id,
        points: rewardAmount,
        source:
          payout.name === "Matching Bonus"
            ? "infinity_matching_bonus"
            : "infinity_sales_bonus",
        reference_id: infinityPayout.payout_id,
        remarks: `${infinityTitle} (reward) from ${user.user_id}`,
        type: "reward",
      });

      // ✅ Mark this source payout as checked
      await DailyPayout.updateOne(
        { _id: payout._id },
        { $set: { is_checked: true } },
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
        description: `You received ₹${bonusAmount.toLocaleString()} from ${infinityTitle} generated by ${user.user_id}.`,
        role: "user",
        priority: "medium",
        read: false,
        date: formatDate(istNow),
        created_at: istNow,
      });

      totalCreated++;
      console.log(
        `✅ Infinity Bonus released for ${sponsor.user_id} - ₹${bonusAmount} (${payout.name} from ${user.user_id})`,
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
      `\n✅ [Infinity Bonus] Completed. Total payouts created: ${totalCreated}`,
    );
  } catch (err) {
    console.error("❌ [Infinity Bonus] Error:", err);
    throw err;
  }
}

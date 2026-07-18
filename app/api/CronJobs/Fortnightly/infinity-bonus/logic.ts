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

    const processedThisRun = new Set<string>();

    let totalCreated = 0;

    for (const payout of payouts) {
      // ─────────────────────────────────────────────────────────────
      // ✅ Determine SOURCE USER based on payout type:
      //
      //  Direct Sales Bonus → source is payout.from (the BV maker / buyer)
      //    e.g. "Direct Sales Bonus from IND2754535" → sourceUserId = IND2754535
      //    We find IND2754535's infinity sponsor and pay them.
      //
      //  Matching Bonus → source is payout.user_id (the earner)
      //    We find the earner's infinity sponsor and pay them.
      // ─────────────────────────────────────────────────────────────
      let sourceUserId: string;

      if (payout.name === "Direct Sales Bonus") {
        if (!payout.from) {
          console.log(
            `⚠️ Direct Sales Bonus ${payout.transaction_id} has no 'from' field, skipping.`,
          );
          await DailyPayout.updateOne(
            { _id: payout._id },
            { $set: { is_checked: true } },
          );
          continue;
        }
        // For Direct Sales Bonus: use the BV maker's (buyer's) infinity
        sourceUserId = payout.from;
        console.log(
          `[DSB] payout=${payout.transaction_id} | earner=${payout.user_id} | BV maker (from)=${payout.from} → finding infinity of BV maker`,
        );
      } else {
        // For Matching Bonus: use the earner's infinity
        sourceUserId = payout.user_id;
        console.log(
          `[MB] payout=${payout.transaction_id} | earner=${payout.user_id} → finding infinity of earner`,
        );
      }

      // ✅ Fetch the source user
      const sourceUser = await User.findOne({ user_id: sourceUserId });
      if (!sourceUser) {
        console.log(`⚠️ Source user ${sourceUserId} not found, skipping.`);
        await DailyPayout.updateOne(
          { _id: payout._id },
          { $set: { is_checked: true } },
        );
        continue;
      }

      // ✅ Also fetch the earner user (needed for details/alerts/reward remarks)
      const earnerUser =
        payout.name === "Direct Sales Bonus"
          ? await User.findOne({ user_id: payout.user_id })
          : sourceUser; // For Matching Bonus, earner = sourceUser

      let sponsor: any = null;

      // 1️⃣ Try direct assigned infinity sponsor (sourceUser.infinity field)
      if (sourceUser.infinity) {
        sponsor = await User.findOne({
          user_id: sourceUser.infinity,
          user_status: "active",
        });
        console.log(
          `[Infinity Lookup] sourceUser=${sourceUserId} has infinity=${sourceUser.infinity} → sponsor found: ${sponsor ? sponsor.user_id : "null"}`,
        );
      }

      // 2️⃣ If still no sponsor, find via infinity_users array
      if (!sponsor) {
        sponsor = await findSponsorByInfinityUsers(sourceUserId);
        console.log(
          `[Infinity Lookup] Fallback search for ${sourceUserId} → sponsor found: ${sponsor ? sponsor.user_id : "null"}`,
        );
      }

      if (!sponsor) {
        console.log(
          `⚠️ No infinity sponsor found for source user ${sourceUserId}, skipping.`,
        );
        await DailyPayout.updateOne(
          { _id: payout._id },
          { $set: { is_checked: true } },
        );
        continue;
      }

      console.log(
        `✅ Sponsor resolved: ${sponsor.user_id} (${sponsor.user_name}) for source=${sourceUserId}`,
      );

      // ✅ Sponsor must be active to receive any Infinity Bonus
      if (sponsor.user_status !== "active") {
        console.log(
          `⚠️ Sponsor ${sponsor.user_id} is not active, not eligible for Infinity Bonus (${payout.name})`,
        );
        await DailyPayout.updateOne(
          { _id: payout._id },
          { $set: { is_checked: true } },
        );
        continue;
      }

      const bonusPercentage = await getInfinityBonusPercentage(
        sponsor.user_id,
        payout.name,
      );

      if (bonusPercentage === 0) {
        console.log(
          `⚠️ Sponsor ${sponsor.user_id} not eligible for Infinity Bonus`,
        );
        await DailyPayout.updateOne(
          { _id: payout._id },
          { $set: { is_checked: true } },
        );
        continue;
      }

      const wallet = await Wallet.findOne({ user_id: sponsor.user_id });

      const infinityTitleMap: Record<string, string> = {
        "Direct Sales Bonus": "Infinity Sales Bonus",
        "Matching Bonus": "Infinity Matching Bonus",
      };
      const infinityTitle = infinityTitleMap[payout.name] || "Infinity Bonus";

      // ─────────────────────────────────────────────────────────────
      // ✅ GUARD 1 — In-Memory Set
      // ─────────────────────────────────────────────────────────────
      const runKey = `${payout.transaction_id}__${sponsor.user_id}__${infinityTitle}`;
      if (processedThisRun.has(runKey)) {
        console.log(
          `⚠️ [In-Memory Guard] Duplicate skipped this run: source=${payout.transaction_id} → sponsor=${sponsor.user_id} (${infinityTitle})`,
        );
        await DailyPayout.updateOne(
          { _id: payout._id },
          { $set: { is_checked: true } },
        );
        continue;
      }

      // ─────────────────────────────────────────────────────────────
      // ✅ GUARD 2 — DB Check
      // ─────────────────────────────────────────────────────────────
      const alreadyExists = await WeeklyPayout.findOne({
        to: sponsor.user_id,
        name: infinityTitle,
        "team_users.transaction_id": payout.transaction_id,
      }).lean();

      if (alreadyExists) {
        console.log(
          `⚠️ [DB Guard] Infinity payout already exists for source payout ${payout.transaction_id} → sponsor ${sponsor.user_id} (${infinityTitle}), skipping.`,
        );
        await DailyPayout.updateOne(
          { _id: payout._id },
          { $set: { is_checked: true } },
        );
        continue;
      }

      // ✅ Register in-memory BEFORE creating
      processedThisRun.add(runKey);

      const istNow = new Date(
        new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
      );
      const payout_id = await generateUniqueCustomId("FP", WeeklyPayout, 8, 8);
      const bonusAmount = payout.amount * bonusPercentage;

      // Step 1: Update monthly tracker total (WRITE)
      await evaluateAndUpdateHoldStatus(sponsor.user_id, bonusAmount);

      // Step 2: Read all 4 hold conditions with full metadata (READ)
      const hold = await determineHoldReasons(sponsor.user_id, currentMonth());

      const payoutStatus: "Pending" | "OnHold" | "Completed" = hold.status;

      let withdrawAmount = 0;
      let rewardAmount = 0;
      let tdsAmount = 0;
      let adminCharge = 0;

      const rawPan = wallet?.pan_verified;
      const isPanVerified =
        rawPan === true ||
        rawPan === 1 ||
        (typeof rawPan === "string" &&
          ["yes", "true", "1"].includes(rawPan.toLowerCase().trim()));

      console.log(
        `[PAN Check] user=${sponsor.user_id} raw=${rawPan} → isPanVerified=${isPanVerified}`,
      );

      // if (wallet && isPanVerified) {
      //   withdrawAmount = Number((bonusAmount * 0.8).toFixed(2));
      //   rewardAmount = Number((bonusAmount * 0.08).toFixed(2));
      //   tdsAmount = Number((bonusAmount * 0.02).toFixed(2));
      //   adminCharge = Number((bonusAmount * 0.1).toFixed(2));
      // } else {
      //   withdrawAmount = Number((bonusAmount * 0.62).toFixed(2));
      //   rewardAmount = Number((bonusAmount * 0.08).toFixed(2));
      //   tdsAmount = Number((bonusAmount * 0.2).toFixed(2));
      //   adminCharge = Number((bonusAmount * 0.1).toFixed(2));
      // }

      if (wallet && isPanVerified) {
        // PAN Verified
        withdrawAmount = Number((bonusAmount * 0.88).toFixed(2));
        tdsAmount = Number((bonusAmount * 0.02).toFixed(2));
        adminCharge = Number((bonusAmount * 0.1).toFixed(2));
      } else {
        // PAN Not Verified / No Wallet
        withdrawAmount = Number((bonusAmount * 0.7).toFixed(2));
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
        pan_verified: isPanVerified === true,
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
        // ✅ details shows the source user (BV maker for DSB, earner for MB)
        details: `${infinityTitle} from ${sourceUserId}`,

        total_amount: bonusAmount,
        withdraw_amount: withdrawAmount,
        reward_amount: rewardAmount,
        tds_amount: tdsAmount,
        admin_charge: adminCharge,
        from: sourceUserId,
        to: sponsor.user_id,

        hold_reasons: hold.reasons,
        hold_reason_labels: hold.labels,
        hold_release_reason: hold.summary,

        team_users: [
          {
            user_id: sourceUserId,
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

      const beforeUser = (await User.findOne({ user_id: sponsor.user_id })
        .select("rank club")
        .lean()) as any;

      const updatedClub = await updateClub(sponsor.user_id, totalPayout);

      if (updatedClub && beforeUser) {
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
        remarks: `${infinityTitle} from ${sourceUserId}`,
        type: "fortnight",
      });

      if (rewardAmount > 0) {
        await addRewardScore({
          user_id: sponsor.user_id,
          points: rewardAmount,
          source:
            payout.name === "Matching Bonus"
              ? "infinity_matching_bonus"
              : "infinity_sales_bonus",
          reference_id: infinityPayout.payout_id,
          remarks: `${infinityTitle} (reward) from ${sourceUserId}`,
          type: "reward",
        });
      }

      // ✅ Mark source payout as checked
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
        description: `You received ₹${bonusAmount.toLocaleString()} from ${infinityTitle} generated by ${sourceUserId}.`,
        role: "user",
        priority: "medium",
        read: false,
        date: formatDate(istNow),
        created_at: istNow,
      });

      totalCreated++;
      console.log(
        `✅ Infinity Bonus released for ${sponsor.user_id} - ₹${bonusAmount} (${payout.name} | source=${sourceUserId}) payout=${payout.transaction_id}`,
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

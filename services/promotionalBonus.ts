import { User } from "@/models/user";
import { Wallet } from "@/models/wallet";
import { DailyPayout } from "@/models/payout";
import { History } from "@/models/history";
import { Alert } from "@/models/alert";
import { generateUniqueCustomId } from "@/utils/server/customIdGenerator";
import { getDirectPV } from "@/services/directPV";

const PROMO_AMOUNT = 5000;

/* -----------------------------------------------------------
   Helper: Parse DD-MM-YYYY safely
----------------------------------------------------------- */
function parseDDMMYYYY(dateStr: string): Date | null {
  try {
    const [dd, mm, yyyy] = dateStr.split("-");
    if (!dd || !mm || !yyyy) return null;

    const parsed = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
    return isNaN(parsed.getTime()) ? null : parsed;
  } catch {
    return null;
  }
}

/* -----------------------------------------------------------
   Helper: Format date as DD-MM-YYYY
----------------------------------------------------------- */
function formatDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

/* -----------------------------------------------------------
   MAIN FUNCTION
----------------------------------------------------------- */
export async function checkAndReleasePromotionalBonus(userId: string) {
  try {
    console.log("Checking Quick Star bonus for", userId);
    const user = await User.findOne({ user_id: userId });
    if (!user || !user.activated_date) return;

    // 🔎 Check DailyPayout
    const alreadyPayout = await DailyPayout.findOne({
      user_id: userId,
      title: "Quick Star Bonus",
      transaction_type: "Credit",
      status: "Completed",
    });

    // 🔎 Check History
    const alreadyHistory = await History.findOne({
      user_id: userId,
      title: "Quick Star Bonus",
      transaction_type: "Credit",
      status: "Completed",
    });

    if (alreadyPayout || alreadyHistory) {
      console.log("🚫 Quick Star bonus already released for", userId);
      return;
    }

    /* -------------------------------------------------------
       2️⃣ Check 15 Days Condition
    ------------------------------------------------------- */
    const activationDate = parseDDMMYYYY(user.activated_date);
    if (!activationDate) return;

    const today = new Date();

    // remove time portion from both dates
    const cleanToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    const cleanActivation = new Date(
      activationDate.getFullYear(),
      activationDate.getMonth(),
      activationDate.getDate(),
    );

    const diffTime = cleanToday.getTime() - cleanActivation.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    console.log("Activation:", cleanActivation);
    console.log("Today:", cleanToday);
    console.log("DiffDays:", diffDays);

    // allow only 7 days including activation day
    if (diffDays < 0 || diffDays >= 7) return;

    /* -------------------------------------------------------
       3️⃣ Get Direct PV Using Central Engine
    ------------------------------------------------------- */
    const { leftDirectPV, rightDirectPV } = await getDirectPV(userId);

    console.log("Direct PV - Left:", leftDirectPV, "Right:", rightDirectPV);

    if (leftDirectPV < 100 || rightDirectPV < 100) return;

    /* -------------------------------------------------------
       4️⃣ Prepare Wallet & Split Amount
    ------------------------------------------------------- */
    const wallet = await Wallet.findOne({ user_id: userId });

    let withdraw = 0,
      reward = 0,
      tds = 0,
      admin = 0;

    if (wallet?.pan_verified) {
      withdraw = Math.round(PROMO_AMOUNT * 0.8); // 80%
      reward = Math.round(PROMO_AMOUNT * 0.08); // 8%
      tds = Math.round(PROMO_AMOUNT * 0.02); // 2%
      admin = Math.round(PROMO_AMOUNT * 0.1); // 10%
    } else {
      withdraw = Math.round(PROMO_AMOUNT * 0.62); // 62%
      reward = Math.round(PROMO_AMOUNT * 0.08); // 8%
      tds = Math.round(PROMO_AMOUNT * 0.2); // 20%
      admin = Math.round(PROMO_AMOUNT * 0.1); // 10%
    }

    const payout_id = await generateUniqueCustomId("PY", DailyPayout, 8, 8);

    const now = new Date();
    const formattedDate = formatDate(now);
    const formattedTime = now.toTimeString().slice(0, 5);

    /* -------------------------------------------------------
       5️⃣ Create Daily Payout
    ------------------------------------------------------- */
    const payout = await DailyPayout.create({
      transaction_id: payout_id,
      payout_id,

      user_id: user.user_id,
      user_name: user.user_name,
      rank: wallet?.rank || user.rank,
      wallet_id: wallet?.wallet_id,
      pan_verified: wallet?.pan_verified || false,
      mail: user.mail || "",
      contact: user.contact || "",
      user_status: user.user_status || "active",

      name: "Quick Star Bonus",
      title: "Quick Star Bonus",

      account_holder_name: wallet?.account_holder_name || "",
      bank_name: wallet?.bank_name || "",
      account_number: wallet?.account_number || "",
      ifsc_code: wallet?.ifsc_code || "",

      date: formattedDate,
      time: formattedTime,
      available_balance: wallet?.balance || 0,

      amount: PROMO_AMOUNT,
      totalamount: PROMO_AMOUNT,
      withdraw_amount: withdraw,
      reward_amount: reward,
      tds_amount: tds,
      admin_charge: admin,

      to: user.user_id,
      from: "",
      transaction_type: "Credit",
      status: "Completed",

      details:
        "Quick Star Bonus for achieving 100 PV on both sides within 7 days of activation",

      created_by: "system",
      last_modified_by: "system",
      last_modified_at: now,
    });

    /* -------------------------------------------------------
       6️⃣ Create History
    ------------------------------------------------------- */
    if (payout) {
      await History.create({
        transaction_id: payout.transaction_id,
        wallet_id: payout.wallet_id,
        user_id: payout.user_id,
        user_name: payout.user_name,
        rank: payout.rank,
        pan_verified: payout.pan_verified,
        mail: payout.mail,
        contact: payout.contact,
        user_status: payout.user_status,

        // ✅ ADD THESE TWO
        name: "Quick Star Bonus",
        title: "Quick Star Bonus",

        account_holder_name: payout.account_holder_name,
        bank_name: payout.bank_name,
        account_number: payout.account_number,
        ifsc_code: payout.ifsc_code,

        date: payout.date,
        time: payout.time,
        available_balance: payout.available_balance,

        amount: payout.amount,
        total_amount: payout.amount,
        withdraw_amount: payout.withdraw_amount,
        reward_amount: payout.reward_amount,
        tds_amount: payout.tds_amount,
        admin_charge: payout.admin_charge,

        to: payout.to,
        from: payout.from,
        transaction_type: payout.transaction_type,
        details: payout.details,
        status: payout.status,

        first_payment: false,
        advance: false,
        ischecked: false,

        created_by: "system",
        last_modified_by: "system",
        last_modified_at: now,
      });
    }

    /* -------------------------------------------------------
       7️⃣ Create Alert
    ------------------------------------------------------- */
    await Alert.create({
      user_id: user.user_id,
      title: "🎉 Quick Star Bonus Earned",
      description: `Congratulations! You earned ₹${PROMO_AMOUNT} Quick Star Bonus for achieving 100 PV on both sides within 7 days.`,
      role: "user",
      priority: "high",
      read: false,
      link: "/wallet/payout/daily",
      date: formattedDate,
      created_at: now,
    });
    /* -------------------------------------------------------
   8️⃣ Create Admin Alert
------------------------------------------------------- */
    await Alert.create({
      role: "admin",
      title: "Quick Star Bonus Released",
      description: `Quick Star Bonus of ₹${PROMO_AMOUNT} released for user ${user.user_id} (${user.user_name}).`,
      priority: "high",
      date: formattedDate,
      created_at: now,
    });

    console.log(`✅ Quick Star Bonus Released for ${userId}`);
  } catch (error) {
    console.error("❌ Quick Star Bonus Error:", error);
  }
}

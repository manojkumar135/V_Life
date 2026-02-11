import { User } from "@/models/user";
import { Wallet } from "@/models/wallet";
import { DailyPayout } from "@/models/payout";
import { History } from "@/models/history";
import { Alert } from "@/models/alert";
import { generateUniqueCustomId } from "@/utils/server/customIdGenerator";
import { getDirectPV } from "@/services/directPV";

const PROMO_AMOUNT = 10000;

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
   MAIN FUNCTION
----------------------------------------------------------- */
export async function checkAndReleasePromotionalBonus(userId: string) {
  try {
    const user = await User.findOne({ user_id: userId });
    if (!user || !user.activated_date) return;

    /* -------------------------------------------------------
       1️⃣ Already Released Protection
    ------------------------------------------------------- */
    const already = await History.findOne({
      user_id: userId,
      title: "Promotional Bonus",
      transaction_type: "Credit",
      status: "Completed",
    });

    if (already) return;

    /* -------------------------------------------------------
       2️⃣ Check 30 Days Condition
    ------------------------------------------------------- */
    const activationDate = parseDDMMYYYY(user.activated_date);
    if (!activationDate) return;

    const today = new Date();
    const diffTime = today.getTime() - activationDate.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    if (diffDays < 0 || diffDays > 30) return;

    /* -------------------------------------------------------
       3️⃣ Get Direct PV Using Central Engine
    ------------------------------------------------------- */
    const { leftDirectPV, rightDirectPV } = await getDirectPV(userId);

    if (leftDirectPV < 200 || rightDirectPV < 200) return;

    /* -------------------------------------------------------
       4️⃣ Release Promotional Bonus
    ------------------------------------------------------- */
    const wallet = await Wallet.findOne({ user_id: userId });

    const payout_id = await generateUniqueCustomId("PY", DailyPayout, 8, 8);
    const now = new Date();

    const payout = await DailyPayout.create({
      transaction_id: payout_id,
      payout_id,

      user_id: userId,
      user_name: user.user_name,
      wallet_id: wallet?.wallet_id,

      name: "Promotional Bonus",
      title: "Promotional Bonus",

      amount: PROMO_AMOUNT,
      totalamount: PROMO_AMOUNT,
      withdraw_amount: PROMO_AMOUNT,
      reward_amount: 0,
      tds_amount: 0,
      admin_charge: 0,

      transaction_type: "Credit",
      status: "Completed",

      created_by: "system",
      last_modified_by: "system",
      last_modified_at: now,
    });

    await History.create({
      transaction_id: payout.transaction_id,
      user_id: userId,
      user_name: user.user_name,

      amount: PROMO_AMOUNT,
      total_amount: PROMO_AMOUNT,
      withdraw_amount: PROMO_AMOUNT,
      reward_amount: 0,
      tds_amount: 0,
      admin_charge: 0,

      transaction_type: "Credit",
      status: "Completed",

      title: "Promotional Bonus",
      details:
        "Promotional Bonus for achieving 200 PV on both sides within 30 days of activation",

      first_payment: false,
      advance: false,
      ischecked: false,

      created_by: "system",
      last_modified_by: "system",
      last_modified_at: now,
    });

    /* -------------------------------------------------------
       5️⃣ Create Alert
    ------------------------------------------------------- */
    await Alert.create({
      user_id: userId,
      title: "🎉 Promotional Bonus Earned",
      description:
        "Congratulations! You earned ₹10,000 Promotional Bonus for achieving 200 PV on both sides within 30 days.",
      role: "user",
      priority: "high",
      read: false,
      link: "/wallet/payout/daily",
      date: now.toISOString().split("T")[0],
      created_at: now,
    });

    console.log(`✅ Promotional Bonus Released for ${userId}`);
  } catch (error) {
    console.error("❌ Promotional Bonus Error:", error);
  }
}

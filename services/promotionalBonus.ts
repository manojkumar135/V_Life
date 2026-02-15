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
   Helper: Format date as DD-MM-YYYY (Same as Direct Bonus)
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
    const { leftDirectPV, rightDirectPV } =
      await getDirectPV(userId);

    if (leftDirectPV < 200 || rightDirectPV < 200) return;

    /* -------------------------------------------------------
       4️⃣ Release Promotional Bonus
    ------------------------------------------------------- */
    const wallet = await Wallet.findOne({ user_id: userId });
    // if (!wallet) return;

    const payout_id = await generateUniqueCustomId(
      "PY",
      DailyPayout,
      8,
      8
    );

    const now = new Date();
    const formattedDate = formatDate(now);                 // ✅ DD-MM-YYYY
    const formattedTime = now.toTimeString().slice(0, 5);  // ✅ HH:MM

    const payout = await DailyPayout.create({
      transaction_id: payout_id,
      payout_id,

      user_id: user.user_id,
      user_name: user.user_name,
      rank: wallet?.rank ||user.rank,
      wallet_id: wallet?.wallet_id,
      pan_verified: wallet?.pan_verified || false,
      mail: user.mail || "",
      contact: user.contact || "",
      user_status: user.user_status || "active",

      name: "Promotional Bonus",
      title: "Promotional Bonus",

      account_holder_name: wallet?.account_holder_name || "",
      bank_name: wallet?.bank_name || "",
      account_number: wallet?.account_number || "",
      ifsc_code: wallet?.ifsc_code || "",

      date: formattedDate,
      time: formattedTime,
      available_balance: wallet?.balance || 0,

      amount: PROMO_AMOUNT,
      totalamount: PROMO_AMOUNT,
      withdraw_amount: PROMO_AMOUNT,
      reward_amount: 0,
      tds_amount: 0,
      admin_charge: 0,

      to: user.user_id,
      from: "",
      transaction_type: "Credit",
      status: "Completed",

      details:
        "Promotional Bonus for achieving 200 PV on both sides within 30 days of activation",

      created_by: "system",
      last_modified_by: "system",
      last_modified_at: now,
    });

    /* -------------------------------------------------------
       5️⃣ Create History
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
       6️⃣ Create Alert
    ------------------------------------------------------- */
    await Alert.create({
      user_id: user.user_id,
      title: "🎉 Promotional Bonus Earned",
      description:
        "Congratulations! You earned ₹10,000 Promotional Bonus for achieving 200 PV on both sides within 30 days.",
      role: "user",
      priority: "high",
      read: false,
      link: "/wallet/payout/daily",
      date: formattedDate,
      created_at: now,
    });

    console.log(`✅ Promotional Bonus Released for ${userId}`);
  } catch (error) {
    console.error("❌ Promotional Bonus Error:", error);
  }
}

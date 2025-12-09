import { DailyPayout, WeeklyPayout } from "@/models/payout";
import { History } from "@/models/history";
import { getTotalPayout, checkHoldStatus } from "@/services/totalpayout";
import { User } from "@/models/user"; // for PV

export async function releaseOnHoldPayouts(user_id: string) {
  try {
    const now = new Date();

    // 🧮 Fetch PV & Total Payout
    const login = await User.findOne({ user_id });
    const pv = login?.pv || 0; // default if missing
    const totalPayout = await getTotalPayout(user_id);

    // ❌ If not eligible → skip
    if (checkHoldStatus(totalPayout, pv)) {
      console.log(`🛑 Still not eligible to release OnHold for: ${user_id}`);
      return;
    }

    // 🔍 Find all OnHold payouts
    const [daily, weekly] = await Promise.all([
      DailyPayout.find({ user_id, status: "OnHold" }),
      WeeklyPayout.find({ user_id, status: "OnHold" }),
    ]);

    const payouts = [...daily, ...weekly];

    if (payouts.length === 0) return;

    const transactionIds = payouts.map((p) => p.transaction_id);

    // 🔄 Update payouts at once
    await Promise.all([
      DailyPayout.updateMany(
        { user_id, status: "OnHold" },
        { $set: { status: "Pending", last_modified_at: now } }
      ),
      WeeklyPayout.updateMany(
        { user_id, status: "OnHold" },
        { $set: { status: "Pending", last_modified_at: now } }
      ),
      History.updateMany(
        { transaction_id: { $in: transactionIds } },
        { $set: { status: "Pending", last_modified_at: now } }
      ),
    ]);

    console.log(`✅ Released ${payouts.length} OnHold payouts for ${user_id}`);
  } catch (err) {
    console.error(`❌ Error releasing OnHold payouts for ${user_id}:`, err);
  }
}

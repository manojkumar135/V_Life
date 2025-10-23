import { DailyPayout, WeeklyPayout } from "@/models/payout";
import { History } from "@/models/history";

/**
 * Update OnHold payouts to Pending for a given user
 */
export async function releaseOnHoldPayouts(user_id: string) {
  try {
    const now = new Date();

    // DailyPayout
    const daily = await DailyPayout.find({ user_id, status: "OnHold" });
    for (const p of daily) {
      p.status = "Pending";
      p.last_modified_at = now;
      await p.save();

      // Update corresponding history
      await History.updateMany(
        { transaction_id: p.transaction_id },
        { $set: { status: "Pending", last_modified_at: now } }
      );
    }

    // WeeklyPayout
    const weekly = await WeeklyPayout.find({ user_id, status: "OnHold" });
    for (const p of weekly) {
      p.status = "Pending";
      p.last_modified_at = now;
      await p.save();

      // Update corresponding history
      await History.updateMany(
        { transaction_id: p.transaction_id },
        { $set: { status: "Pending", last_modified_at: now } }
      );
    }

    if (daily.length + weekly.length > 0)
      console.log(`✅ Released ${daily.length + weekly.length} OnHold payouts for ${user_id}`);
  } catch (err) {
    console.error(`❌ Error releasing OnHold payouts for ${user_id}:`, err);
  }
}

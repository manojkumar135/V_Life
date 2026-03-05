// wallets-operations/walletHelpers.ts

import { DailyPayout, WeeklyPayout } from "@/models/payout";
import { History } from "@/models/history";
import { getTotalPayout, checkHoldStatus } from "@/services/totalpayout";
import { User } from "@/models/user";

// ─── RELEASE on-hold payouts ───────────────────────────────────────────────
export async function releaseOnHoldPayouts(user_id: string) {
  try {
    const now = new Date();

    const login = await User.findOne({ user_id });
    const pv = login?.pv || 0;
    const totalPayout = await getTotalPayout(user_id);

    if (checkHoldStatus(totalPayout, pv)) {
      console.log(`🛑 Still not eligible to release OnHold for: ${user_id}`);
      return;
    }

    const [daily, weekly] = await Promise.all([
      DailyPayout.find({ user_id, status: "OnHold" }),
      WeeklyPayout.find({ user_id, status: "OnHold" }),
    ]);

    const payouts = [...daily, ...weekly];
    if (payouts.length === 0) return;

    const transactionIds = payouts.map((p) => p.transaction_id);

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

// ─── PUT payouts on hold ───────────────────────────────────────────────────
export async function putPayoutsOnHold(user_id: string) {
  try {
    const now = new Date();

    const [daily, weekly] = await Promise.all([
      DailyPayout.find({ user_id, status: "Pending" }),
      WeeklyPayout.find({ user_id, status: "Pending" }),
    ]);

    const payouts = [...daily, ...weekly];
    if (payouts.length === 0) return;

    const transactionIds = payouts.map((p) => p.transaction_id);

    await Promise.all([
      DailyPayout.updateMany(
        { user_id, status: "Pending" },
        { $set: { status: "OnHold", last_modified_at: now } }
      ),
      WeeklyPayout.updateMany(
        { user_id, status: "Pending" },
        { $set: { status: "OnHold", last_modified_at: now } }
      ),
      History.updateMany(
        { transaction_id: { $in: transactionIds } },
        { $set: { status: "OnHold", last_modified_at: now } }
      ),
    ]);

    console.log(`✅ Put ${payouts.length} payouts OnHold for ${user_id}`);
  } catch (err) {
    console.error(`❌ Error putting payouts OnHold for ${user_id}:`, err);
  }
}
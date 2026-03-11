// wallets-operations/walletHelpers.ts

import { DailyPayout, WeeklyPayout }  from "@/models/payout";
import { History }                     from "@/models/history";
import {
  releasePayoutsForUser,
  determineHoldReasons,
}                                      from "@/services/payoutHoldService";
import { currentMonth }                from "@/services/monthlyHoldService";

export async function releaseOnHoldPayouts(
  user_id: string,
  trigger: "wallet_created" | "wallet_activated" | "wallet_review_approved" | "pv_fulfilled"
) {
  try {
    await releasePayoutsForUser(user_id, trigger);
  } catch (err) {
    console.error(`❌ Error releasing OnHold payouts for ${user_id}:`, err);
  }
}

export async function putPayoutsOnHold(user_id: string, reason: "WALLET_UNDER_REVIEW") {
  try {
    const now = new Date();

    const [daily, weekly] = await Promise.all([
      DailyPayout.find({ user_id, status: "Pending" })
        .select("_id transaction_id hold_reasons hold_reason_labels")
        .lean(),
      WeeklyPayout.find({ user_id, status: "Pending" })
        .select("_id transaction_id hold_reasons hold_reason_labels")
        .lean(),
    ]);

    const payouts = [...daily, ...weekly];
    if (payouts.length === 0) return;

    const transactionIds = payouts.map((p: any) => p.transaction_id).filter(Boolean);

    const label = "Wallet is under review (change request pending)";

    await Promise.all([
      DailyPayout.updateMany(
        { user_id, status: "Pending" },
        {
          $set:  { status: "OnHold", last_modified_at: now, last_modified_by: "system" },
          $addToSet: {
            hold_reasons:       reason,
            hold_reason_labels: label,
          },
        }
      ),
      WeeklyPayout.updateMany(
        { user_id, status: "Pending" },
        {
          $set:  { status: "OnHold", last_modified_at: now, last_modified_by: "system" },
          $addToSet: {
            hold_reasons:       reason,
            hold_reason_labels: label,
          },
        }
      ),
      ...(transactionIds.length > 0
        ? [
            History.updateMany(
              { transaction_id: { $in: transactionIds } },
              { $set: { status: "OnHold", last_modified_at: now } }
            ),
          ]
        : []),
    ]);

    console.log(`✅ Put ${payouts.length} payouts OnHold (${reason}) for ${user_id}`);
  } catch (err) {
    console.error(`❌ Error putting payouts OnHold for ${user_id}:`, err);
  }
}
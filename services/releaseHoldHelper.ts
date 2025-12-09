import { DailyPayout, WeeklyPayout } from "@/models/payout";
import {Wallet} from "@/models/wallet";
import { getTotalPayout, checkHoldStatus } from "@/services/totalpayout";

/**
 * Release all OnHold payouts (Daily & Weekly) once wallet exists
 * and the user qualifies for payout release.
 */
export async function releaseOnHoldPayouts(user_id: string) {
  const wallet = await Wallet.findOne({ user_id });
  if (!wallet) return; // The user still does not have a wallet → skip

  const totalPayout = await getTotalPayout(user_id);
  const pv = wallet.pv || 0;
  const isPanVerified = wallet.pan_verified || false;

  // If PAN is verified → always release
  // Otherwise → release only if hold condition is no longer required
  const canRelease = isPanVerified || !checkHoldStatus(totalPayout, pv);
  if (!canRelease) return;

  const updateFields = {
    wallet_id: wallet.wallet_id,
    account_holder_name: wallet.account_holder_name,
    bank_name: wallet.bank_name,
    account_number: wallet.account_number,
    ifsc_code: wallet.ifsc_code,
    pan_verified: wallet.pan_verified,
  };

  // Release Daily payouts
  await DailyPayout.updateMany(
    { user_id, status: "OnHold" },
    { $set: { status: "pending", ...updateFields } }
  );

  // Release Weekly payouts
  await WeeklyPayout.updateMany(
    { user_id, status: "OnHold" },
    { $set: { status: "pending", ...updateFields } }
  );

  console.log(`Released OnHold payouts for user: ${user_id}`);
}

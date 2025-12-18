import { NextResponse } from "next/server";
import { runMatchingBonus } from "@/app/api/CronJobs/Daily/matching-bonus/logic";
import { runDirectSalesBonus } from "@/app/api/CronJobs/Daily/direct-sales-bonus/logic";
import { runInfinityBonus } from "@/app/api/CronJobs/Fortnightly/infinity-bonus/logic";
import { runReferralBonus } from "@/app/api/CronJobs/Daily/referral-bonus/logic";

export async function GET() {
  console.log("============================================");
  console.log("🔔 Manual cron trigger started from browser");
  console.log("============================================");

  try {
    await runMatchingBonus();
    await runDirectSalesBonus();
    await runInfinityBonus();
    await runReferralBonus();

    console.log("✅ All cron jobs executed manually!");
    console.log("============================================");

    return NextResponse.json({
      success: true,
      message: "Cron jobs executed ✅",
    });
  } catch (error: any) {
    console.log("❌ Cron execution failed:", error.message);
    console.log("============================================");

    return NextResponse.json({ success: false, error: error.message });
  }
}

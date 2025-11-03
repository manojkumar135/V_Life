import { NextResponse } from "next/server";
import { runMatchingBonus } from "./matching-bonus/logic";
import { runDirectSalesBonus } from "./direct-sales-bonus/logic";

export async function GET() {
  try {
    console.log("🚀 Daily cron triggered: Running Matching + Direct Sales bonus...");

    await runMatchingBonus();
    console.log("✅ Matching bonus completed");

    await runDirectSalesBonus();
    console.log("✅ Direct Sales bonus completed");

    return NextResponse.json({
      success: true,
      message: "Daily Cron Executed: Matching + Direct Sales Bonus Completed",
    });
  } catch (error: any) {
    console.error("❌ Daily bonus cron failed:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Cron failed" },
      { status: 500 }
    );
  }
}

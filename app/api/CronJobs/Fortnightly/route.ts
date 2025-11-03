import { NextResponse } from "next/server";
import { runInfinityBonus } from "./infinity-bonus/logic";

export async function GET() {
  try {
    console.log("🚀 Fortnightly cron triggered: Running Infinity bonus...");

    await runInfinityBonus();
    console.log("✅ Infinity bonus completed");

    return NextResponse.json({
      success: true,
      message: "Fortnightly Cron Executed: Infinity Bonus Completed",
    });
  } catch (error: any) {
    console.error("❌ Fortnightly bonus cron failed:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Cron failed" },
      { status: 500 }
    );
  }
}

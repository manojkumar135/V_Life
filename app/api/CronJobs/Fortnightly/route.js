import { NextResponse } from "next/server";
import { runInfinityBonus } from "./infinity-bonus/logic";

export async function GET() {

  // const secret = req.headers.get("x-cron-secret");

  // if (!secret || secret !== process.env.CRON_SECRET) {
  //   return NextResponse.json(
  //     { success: false, message: "Unauthorized access" },
  //     { status: 401 }
  //   );
  // }

  



  try {
    console.log("🚀 Fortnightly cron triggered: Running Infinity bonus...");

    await runInfinityBonus();
    console.log("✅ Infinity bonus completed");

    return NextResponse.json({
      success: true,
      message: "Fortnightly Cron Executed: Infinity Bonus Completed",
    });
  } catch (error) {
    console.error("❌ Fortnightly bonus cron failed:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Cron failed" },
      { status: 500 }
    );
  }
}

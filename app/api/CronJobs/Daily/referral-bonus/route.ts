import { NextResponse } from "next/server";
import { runReferralBonus } from "./logic";

// ✅ API endpoint for manual or cron trigger
export async function GET() {
  try {
    await runReferralBonus();
    return NextResponse.json({ success: true, message: "Referral bonus executed" });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}



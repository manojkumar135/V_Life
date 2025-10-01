import { NextResponse } from "next/server";
import { runMatchingBonus } from "./logic";

// ✅ API endpoint for manual or cron trigger
export async function GET() {
  try {
    await runMatchingBonus();
    return NextResponse.json({ success: true, message: "Matching bonus executed" });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

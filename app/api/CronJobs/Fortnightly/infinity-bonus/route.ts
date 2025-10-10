import { NextResponse } from "next/server";
import { runInfinityBonus } from "./logic";

// ✅ API endpoint for manual or cron trigger
export async function GET() {
  try {
    await runInfinityBonus();
    return NextResponse.json({ success: true, message: "Infinity bonus executed" });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

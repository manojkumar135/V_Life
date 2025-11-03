// app/api/CronJobs/Daily/direct-sales-bonus/route.ts
import { NextResponse } from "next/server";
import { runDirectSalesBonus } from "./logic";

export async function GET() {
  try {
    await runDirectSalesBonus();
    return NextResponse.json({ success: true, message: "Direct sales bonus executed" });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err?.message || "Error" }, { status: 500 });
  }
}

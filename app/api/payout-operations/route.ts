import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { DailyPayout, WeeklyPayout } from "@/models/payout";
import mongoose from "mongoose";

/**
 * GET - Fetch payouts from both Daily and Weekly collections
 */
export async function GET(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);

    const id = searchParams.get("id") || searchParams.get("transaction_id");
    const payout_id = searchParams.get("payout_id");
    const user_id = searchParams.get("user_id");

    // ✅ If specific payout_id or transaction_id given
    if (id || payout_id) {
      const query: any = {};
      if (id) {
        if (mongoose.Types.ObjectId.isValid(id)) {
          query._id = id;
        } else {
          query.transaction_id = id;
        }
      }
      if (payout_id) query.payout_id = payout_id;

      // search in Daily first
      let payout = await DailyPayout.findOne(query);
      if (!payout) {
        payout = await WeeklyPayout.findOne(query);
      }

      if (!payout) {
        return NextResponse.json(
          { success: false, message: "Payout not found", data: null },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, data: payout }, { status: 200 });
    }

    // ✅ If fetching all by user
    const query: any = {};
    if (user_id) query.user_id = user_id;

    const dailyRecords = await DailyPayout.find(query);
    const weeklyRecords = await WeeklyPayout.find(query);

    const payouts = [...dailyRecords, ...weeklyRecords].sort((a: any, b: any) => {
      const dateA = new Date(a.created_at || a.date || 0).getTime();
      const dateB = new Date(b.created_at || b.date || 0).getTime();
      return dateB - dateA; // latest first
    });

    return NextResponse.json({ success: true, data: payouts }, { status: 200 });
  } catch (error: any) {
    console.error("GET payout error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Server error" },
      { status: 500 }
    );
  }
}

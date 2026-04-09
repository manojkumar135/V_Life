/**
 * GET /api/withdraw/[id]/route.ts
 *
 * Returns a single withdraw record by payout_id.
 * Used by the detail view page.
 */

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Withdraw } from "@/models/withdraw";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectDB();
    const { id } = await params;

    const record = await Withdraw.findOne({ payout_id: id }).lean();

    if (!record) {
      return NextResponse.json(
        { success: false, message: "Withdraw record not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: record }, { status: 200 });
  } catch (error: any) {
    console.error("Withdraw detail GET error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Server error" },
      { status: 500 },
    );
  }
}
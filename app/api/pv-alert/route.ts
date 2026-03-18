// app/api/pv-alert/route.ts

import { NextRequest, NextResponse } from "next/server";
import { connectDB }                 from "@/lib/mongodb";
import { getPvAlertSummary }         from "@/services/pvAlertService";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    // ── Get user_id from query param ──────────────────────────────────
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get("user_id");

    if (!user_id) {
      return NextResponse.json(
        { success: false, message: "user_id is required" },
        { status: 400 }
      );
    }

    // ── Get PV alert summary ──────────────────────────────────────────
    const summary = await getPvAlertSummary(user_id);

    return NextResponse.json({
      success: true,
      data:    summary,
    });

  } catch (err: any) {
    console.error("[pv-alert] Error:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
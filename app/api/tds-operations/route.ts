import { NextResponse } from "next/server";
import { PipelineStage } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { DailyPayout, WeeklyPayout } from "@/models/payout";
import { Wallet } from "@/models/wallet";

export async function GET() {
  try {
    await connectDB();

    // STEP 1 — Group payouts
    const pipeline: PipelineStage[] = [
      {
        $group: {
          _id: {
            user_id: "$user_id",
            year: { $year: "$created_at" },
            month: { $month: "$created_at" },
            pan_verified: "$pan_verified",
          },
          total_tds: { $sum: "$tds_amount" },
          total_amount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.user_id": 1, "_id.year": -1, "_id.month": -1 } },
    ];

    const [daily, weekly] = await Promise.all([
      DailyPayout.aggregate(pipeline),
      WeeklyPayout.aggregate(pipeline),
    ]);

    const merged = [...daily, ...weekly];

    // STEP 2 — Group by user
    const userGroups: Record<string, any[]> = {};

    for (const row of merged) {
      const { user_id, year, month, pan_verified } = row._id;
      if (!userGroups[user_id]) userGroups[user_id] = [];

      userGroups[user_id].push({
        user_id,
        year,
        month,
        pan_verified,
        total_tds: row.total_tds || 0,
        total_amount: row.total_amount || 0,
        count: row.count || 0,
      });
    }

    // STEP 3 — Flatten response + attach wallet
    const responseRows: any[] = [];

    for (const uid of Object.keys(userGroups)) {
      const userRows = userGroups[uid];
      const hasPAN = userRows.some((r) => r.pan_verified === true);

      let wallet = null;
      if (hasPAN) {
wallet = (await Wallet.findOne({ user_id: uid }).lean()) as any;
      }

      for (const rec of userRows) {
        responseRows.push({
          _id: `${uid}-${rec.year}-${rec.month}-${rec.pan_verified}`,
          user_id: uid,
          month: `${rec.year}-${String(rec.month).padStart(2, "0")}`,
          tds_type: rec.pan_verified ? "PAN" : "NON-PAN",
          total_amount: rec.total_amount,
          tds_amount: rec.total_tds,
          count: rec.count,

          // Wallet data if exists
          wallet_id: wallet?.wallet_id || null,
          bank_name: wallet?.bank_name || null,
          account_holder_name: wallet?.account_holder_name || null,
        });
      }
    }

    return NextResponse.json({
      status: true,
      total_rows: responseRows.length,
      data: responseRows,
    });
  } catch (err: any) {
    console.error("TDS BACKEND ERROR:", err);
    return NextResponse.json(
      { status: false, message: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { PipelineStage } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { DailyPayout, WeeklyPayout } from "@/models/payout";
import { Wallet } from "@/models/wallet";

export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);

    const user_id = searchParams.get("user_id");
    const search = searchParams.get("search") || "";
    const date = searchParams.get("date");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    // GROUP DAILY + WEEKLY
    const pipeline: PipelineStage[] = [
      {
        $match: {
          ...(user_id && { user_id }),
          ...(search && { user_id: { $regex: search, $options: "i" } }),
          ...(date && { created_at: new Date(date) }),
          ...(from && to && {
            created_at: { $gte: new Date(from), $lte: new Date(to) },
          }),
        },
      },
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
    ];

    const [daily, weekly] = await Promise.all([
      DailyPayout.aggregate(pipeline),
      WeeklyPayout.aggregate(pipeline),
    ]);

    const merged = [...daily, ...weekly];

    // ----------------------------------------------------
    // MERGE MULTIPLE ENTRIES (DAILY + WEEKLY)
    // KEY = user-year-month-PAN
    // ----------------------------------------------------
    const map = new Map();

    for (const row of merged) {
      const { user_id, year, month, pan_verified } = row._id;
      const key = `${user_id}-${year}-${month}-${pan_verified}`;

      if (!map.has(key)) {
        map.set(key, {
          user_id,
          year,
          month,
          pan_verified,
          total_tds: 0,
          total_amount: 0,
          count: 0,
        });
      }

      const ref = map.get(key);
      ref.total_tds += row.total_tds;
      ref.total_amount += row.total_amount;
      ref.count += row.count;
    }

    const dataMerged = Array.from(map.values());

    // ----------------------------------------------------
    // Attach wallet only once per user
    // ----------------------------------------------------
    const monthNames = [
      "January","February","March","April","May","June",
      "July","August","September","October","November","December",
    ];

    const result: any[] = [];

    for (const rec of dataMerged) {
      const wallet = (await Wallet.findOne({ user_id: rec.user_id }).lean()) as any;

      result.push({
        _id: `${rec.user_id}-${rec.year}-${rec.month}-${rec.pan_verified ? "PAN" : "NONPAN"}`,
        user_id: rec.user_id,
        year: rec.year,
        month: rec.month,
        month_name: monthNames[rec.month - 1],
        tds_type: rec.pan_verified ? "PAN" : "NONPAN",
        total_amount: rec.total_amount,
        tds_amount: rec.total_tds,
        count: rec.count,

        // Wallet fields if exist
        wallet_id: wallet?.wallet_id || null,
        bank_name: wallet?.bank_name || null,
        account_holder_name: wallet?.account_holder_name || null,
        pan_number: wallet?.pan_number || null,
      });
    }

    return NextResponse.json({
      status: true,
      data: result,
      total_rows: result.length,
    });
  } catch (err: any) {
    console.error("TDS ERROR:", err);
    return NextResponse.json(
      { status: false, message: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

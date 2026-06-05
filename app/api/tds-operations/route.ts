import { NextResponse } from "next/server";
import { PipelineStage } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { DailyPayout, WeeklyPayout } from "@/models/payout";
import { Wallet } from "@/models/wallet";

function isPanVerified(val: any): boolean {
  if (val === true) return true;
  if (typeof val === "string") {
    return ["yes", "true"].includes(val.toLowerCase());
  }
  return false;
}

/**
 * Parse a YYYY-MM-DD string into a Date at the START of that day (00:00:00.000)
 * using LOCAL date parts so timezone offsets don't shift the day.
 */
function startOfDay(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/**
 * Parse a YYYY-MM-DD string into a Date at the END of that day (23:59:59.999)
 */
function endOfDay(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day, 23, 59, 59, 999);
}

export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);

    const user_id = searchParams.get("user_id");
    const search  = searchParams.get("search") || "";
    const date    = searchParams.get("date");   // single day  YYYY-MM-DD
    const from    = searchParams.get("from");   // range start YYYY-MM-DD
    const to      = searchParams.get("to");     // range end   YYYY-MM-DD

    // ----------------------------------------------------------------
    // Build the created_at filter once so it is consistent everywhere
    // ----------------------------------------------------------------
    let dateFilter: Record<string, any> = {};

    if (date) {
      dateFilter = {
        created_at: {
          $gte: startOfDay(date),
          $lte: endOfDay(date),
        },
      };
    } else if (from && to) {
      dateFilter = {
        created_at: {
          $gte: startOfDay(from),
          $lte: endOfDay(to),
        },
      };
    }

    // ----------------------------------------------------------------
    // Aggregation pipeline  – groups by user + year + month
    // ----------------------------------------------------------------
    const pipeline: PipelineStage[] = [
      {
        $match: {
          ...(user_id && { user_id }),

          ...(search && {
            $or: [
              { user_id:   { $regex: search, $options: "i" } },
              { user_name: { $regex: search, $options: "i" } },
              { contact:   { $regex: search, $options: "i" } },
              { wallet_id: { $regex: search, $options: "i" } },
              { pan_number:{ $regex: search, $options: "i" } },
            ],
          }),

          ...dateFilter,
        },
      },
      {
        // Group by user + calendar month – this gives one bucket per
        // user per month, exactly what the UI shows.
        $group: {
          _id: {
            user_id:  "$user_id",
            user_name:"$user_name",
            contact:  "$contact",
            year:     { $year:  "$created_at" },
            month:    { $month: "$created_at" },
          },
          total_amount: { $sum: "$amount" },
          // We still sum stored TDS but will RECALCULATE below from wallet
          stored_tds:   { $sum: "$tds_amount" },
          count:        { $sum: 1 },
        },
      },
      // Sort newest month first
      {
        $sort: {
          "_id.year":  -1,
          "_id.month": -1,
        },
      },
    ];

    // Run both collections in parallel
    const [daily, weekly] = await Promise.all([
      DailyPayout.aggregate(pipeline),
      WeeklyPayout.aggregate(pipeline),
    ]);

    // ----------------------------------------------------------------
    // Merge daily + weekly buckets that share the same user-year-month
    // ----------------------------------------------------------------
    const map = new Map<
      string,
      {
        user_id:      string;
        user_name:    string;
        contact:      string;
        year:         number;
        month:        number;
        total_amount: number;
        count:        number;
      }
    >();

    for (const row of [...daily, ...weekly]) {
      const { user_id, user_name, contact, year, month } = row._id;
      const key = `${user_id}-${year}-${month}`;

      if (!map.has(key)) {
        map.set(key, {
          user_id,
          user_name,
          contact,
          year,
          month,
          total_amount: 0,
          count:        0,
        });
      }

      const ref = map.get(key)!;
      ref.total_amount += row.total_amount;
      ref.count        += row.count;
    }

    // ----------------------------------------------------------------
    // Enrich each bucket with wallet data & recalculate TDS
    // ----------------------------------------------------------------
    const monthNames = [
      "January","February","March","April","May","June",
      "July","August","September","October","November","December",
    ];

    // Cache wallets so we don't hit the DB multiple times for the same user
    const walletCache = new Map<string, any>();

    async function getWallet(uid: string) {
      if (walletCache.has(uid)) return walletCache.get(uid);
      const w = await Wallet.findOne({ user_id: uid }).lean();
      walletCache.set(uid, w ?? null);
      return w;
    }

    const result: any[] = [];

    for (const rec of Array.from(map.values())) {
      const wallet = await getWallet(rec.user_id) as any;

      // Wallet is the source of truth for PAN status
      const isPan      = isPanVerified(wallet?.pan_verified);
      const tdsPercent = isPan ? 0.02 : 0.20;
      const tdsAmount  = rec.total_amount * tdsPercent;

      result.push({
        _id: `${rec.user_id}-${rec.year}-${rec.month}`,

        user_id:   rec.user_id,
        user_name: rec.user_name,
        contact:   rec.contact,

        year:       rec.year,
        month:      rec.month,
        month_name: monthNames[rec.month - 1],

        tds_type:    isPan ? "PAN" : "NONPAN",
        tds_percent: isPan ? 2 : 20,
        tds_label:   isPan ? "2%" : "20%",

        total_amount: rec.total_amount,
        tds_amount:   tdsAmount,

        count: rec.count,

        // Wallet fields
        wallet_id:            wallet?.wallet_id            ?? null,
        bank_name:            wallet?.bank_name            ?? null,
        account_holder_name:  wallet?.account_holder_name  ?? null,
        pan_number:           wallet?.pan_number           ?? null,
      });
    }

    // Sort: group same user together (user_id asc),
    // then within each user sort by year+month ascending
    // so April → May → June appear in order for the same user.
    result.sort((a, b) => {
      if (a.user_id < b.user_id) return -1;
      if (a.user_id > b.user_id) return 1;
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });

    return NextResponse.json({
      status:     true,
      data:       result,
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
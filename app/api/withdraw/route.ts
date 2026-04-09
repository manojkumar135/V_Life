/**
 * GET /api/withdraw/route.ts
 *
 * Returns all withdraw records with search, date filter, and pagination.
 * Each record represents one released payout_id with full audit trail.
 *
 * Summary card mapping (matches payrelease page exactly):
 *   Total Original Amount  = sum of withdraw_amount  (net after TDS/admin — real baseline)
 *   Total Deducted (Orders)= withdraw_amount - released_amount (points spent on orders)
 *   Grand Release Amount   = sum of released_amount  (actual amount paid out)
 *
 * Query params:
 *   search     — partial match on user_id, user_name, contact, batch_id, payout_id, neft_utr
 *   from       — date range start (ISO string)
 *   to         — date range end   (ISO string)
 *   date       — single day filter (ISO string)
 *   page       — page number (default 1)
 *   limit      — items per page (default 20, max 100)
 *   batch_id   — filter by exact batch_id (optional)
 *   bonus_type — filter by bonus_type: daily | fortnight | referral | quickstar
 */

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Withdraw } from "@/models/withdraw";

export async function GET(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const search    = searchParams.get("search")     || "";
    const from      = searchParams.get("from")       || null;
    const to        = searchParams.get("to")         || null;
    const date      = searchParams.get("date")       || null;
    const batchId   = searchParams.get("batch_id")   || "";
    const bonusType = searchParams.get("bonus_type") || "";
    const page      = Math.max(1, parseInt(searchParams.get("page")  || "1"));
    const limit     = Math.min(100, parseInt(searchParams.get("limit") || "20"));

    /* ── 1. Build query ── */
    const query: any = {};

    if (date) {
      const start = new Date(date);
      const end   = new Date(date);
      end.setHours(23, 59, 59, 999);
      query.released_at = { $gte: start, $lte: end };
    } else if (from || to) {
      query.released_at = {};
      if (from) query.released_at.$gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        query.released_at.$lte = end;
      }
    }

    if (batchId.trim())   query.batch_id  = batchId.trim();
    if (bonusType.trim()) query.bonus_type = bonusType.trim();

    if (search.trim()) {
      const terms = search
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      query.$or = terms.flatMap((t) => [
        { user_id:             { $regex: t, $options: "i" } },
        { user_name:           { $regex: t, $options: "i" } },
        { contact:             { $regex: t, $options: "i" } },
        { batch_id:            { $regex: t, $options: "i" } },
        { payout_id:           { $regex: t, $options: "i" } },
        { neft_utr:            { $regex: t, $options: "i" } },
        { account_holder_name: { $regex: t, $options: "i" } },
      ]);
    }

    /* ── 2. Fetch with pagination ── */
    const [records, total] = await Promise.all([
      Withdraw.find(query)
        .sort({ released_at: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Withdraw.countDocuments(query),
    ]);

    /* ── 3. Summary aggregation ──────────────────────────────────────────────
       withdraw_amount = net after TDS/admin deductions — this is the real
                         baseline (same field GET /api/payrelease uses as
                         "original" before order deductions are applied)

       released_amount = score_balance at release time
                       = withdraw_amount minus points the user spent on orders
                       = actual bank transfer amount

       total_deducted  = total_withdraw - total_released
                       = points spent on orders across all records
                         (mirrors payrelease "Total Deducted (Orders)" card)
    ─────────────────────────────────────────────────────────────────────────── */
    const summaryAgg = await Withdraw.aggregate([
      { $match: query },
      {
        $group: {
          _id:              null,
          total_withdraw:   { $sum: "$withdraw_amount"  }, // net after TDS/admin — baseline
          total_released:   { $sum: "$released_amount"  }, // actual paid out
          count:            { $sum: 1                   },
          unique_users:     { $addToSet: "$user_id"     },
          unique_batches:   { $addToSet: "$batch_id"    },
        },
      },
    ]);

    const agg = summaryAgg[0] || {};

    const totalWithdraw = agg.total_withdraw ?? 0;
    const totalReleased = agg.total_released ?? 0;

    const summary = {
      total_records:  agg.count                ?? 0,
      unique_users:   agg.unique_users?.length  ?? 0,
      unique_batches: agg.unique_batches?.length ?? 0,
      total_original: totalWithdraw,                        // withdraw_amount = net baseline
      total_deducted: Math.max(0, totalWithdraw - totalReleased), // points used on orders
      grand_release:  totalReleased,                        // actual bank transfer
    };

    return NextResponse.json(
      {
        success: true,
        data:    records,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        summary,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Withdraw GET error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Server error", data: [] },
      { status: 500 },
    );
  }
}
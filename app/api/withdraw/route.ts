/**
 * GET /api/withdraw/route.ts
 *
 * Role-based access:
 *   role=admin  → returns all withdraw records
 *   role=user   → returns only records for that user_id
 *
 * Summary card mapping (matches payrelease page exactly):
 *   Total Original Amount   = sum of withdraw_amount  (net after TDS/admin)
 *   Total Deducted (Orders) = withdraw_amount - released_amount
 *   Grand Release Amount    = sum of released_amount
 *
 * Query params:
 *   role       — "admin" | "user" (required)
 *   user_id    — required when role=user
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
    const role      = searchParams.get("role")       || "";
    const userId    = searchParams.get("user_id")    || "";
    const search    = searchParams.get("search")     || "";
    const from      = searchParams.get("from")       || null;
    const to        = searchParams.get("to")         || null;
    const date      = searchParams.get("date")       || null;
    const batchId   = searchParams.get("batch_id")   || "";
    const bonusType = searchParams.get("bonus_type") || "";
    const page      = Math.max(1, parseInt(searchParams.get("page")  || "1"));
    const limit     = Math.min(100, parseInt(searchParams.get("limit") || "20"));

    /* ── 1. Role-based base query — exact same pattern as order-operations ── */
    let baseQuery: Record<string, any> = {};

    if (role === "user") {
      if (!userId) {
        return NextResponse.json(
          { success: false, message: "user_id is required for role=user", data: [] },
          { status: 400 },
        );
      }
      baseQuery.user_id = userId;
    } else if (role === "admin") {
      baseQuery = {}; // all records
    }
    // if role is not passed at all, default to showing all (admin fallback)

    /* ── 2. Build additional filters ── */
    const conditions: any[] = [];

    // Date filter
    if (date) {
      const start = new Date(date);
      const end   = new Date(date);
      end.setHours(23, 59, 59, 999);
      conditions.push({ released_at: { $gte: start, $lte: end } });
    } else if (from || to) {
      const dateRange: any = {};
      if (from) dateRange.$gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        dateRange.$lte = end;
      }
      conditions.push({ released_at: dateRange });
    }

    if (batchId.trim())   conditions.push({ batch_id:   batchId.trim() });
    if (bonusType.trim()) conditions.push({ bonus_type: bonusType.trim() });

    if (search.trim()) {
      const terms = search
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      conditions.push({
        $or: terms.flatMap((t) => [
          { user_id:             { $regex: t, $options: "i" } },
          { user_name:           { $regex: t, $options: "i" } },
          { contact:             { $regex: t, $options: "i" } },
          { batch_id:            { $regex: t, $options: "i" } },
          { payout_id:           { $regex: t, $options: "i" } },
          { neft_utr:            { $regex: t, $options: "i" } },
          { account_holder_name: { $regex: t, $options: "i" } },
        ]),
      });
    }

    // Combine baseQuery with conditions — same pattern as order-operations
    const finalQuery =
      conditions.length > 0
        ? { $and: [baseQuery, ...conditions] }
        : baseQuery;

    /* ── 3. Fetch with pagination ── */
    const [records, total] = await Promise.all([
      Withdraw.find(finalQuery)
        .sort({ released_at: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Withdraw.countDocuments(finalQuery),
    ]);

    /* ── 4. Summary aggregation ── */
    const summaryAgg = await Withdraw.aggregate([
      { $match: finalQuery },
      {
        $group: {
          _id:            null,
          total_withdraw: { $sum: "$withdraw_amount" },
          total_released: { $sum: "$released_amount" },
          count:          { $sum: 1 },
          unique_users:   { $addToSet: "$user_id"  },
          unique_batches: { $addToSet: "$batch_id" },
        },
      },
    ]);

    const agg = summaryAgg[0] || {};

    const totalWithdraw = agg.total_withdraw ?? 0;
    const totalReleased = agg.total_released ?? 0;

    const summary = {
      total_records:  agg.count                 ?? 0,
      unique_users:   agg.unique_users?.length   ?? 0,
      unique_batches: agg.unique_batches?.length ?? 0,
      total_original: totalWithdraw,
      total_deducted: Math.max(0, totalWithdraw - totalReleased),
      grand_release:  totalReleased,
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
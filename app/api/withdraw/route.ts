/**
 * GET /api/withdraw/route.ts
 *
 * Role-based access:
 *   role=admin  → returns cumulative records for all users
 *   role=user   → returns only records for that user_id
 *
 * ── Amount logic — mirrors payrelease/route.ts exactly ────────────────────────
 *
 *   In payrelease:
 *     withdraw_total  = sum of payout.withdraw_amount   → "Total Original Amount"
 *     score_balance   = withdraw_total - points_used_on_orders
 *     payable         = score_balance                   → "Grand Release Amount"
 *     deducted        = withdraw_total - score_balance  → "Total Deducted (Orders)"
 *
 *   In Withdraw records (one per payout_id):
 *     withdraw_amount      = payout.withdraw_amount  (net after TDS/admin) → original
 *     released_amount      = proportional share of score_balance at release → released
 *     score_balance_before = total score balance at release time (group-level field)
 *
 *   Correct original per record = withdraw_amount (when saved, i.e. > 0)
 *   Fallback for older records where withdraw_amount = 0:
 *     referral/quickstar → released_amount (they are always equal, no deduction possible)
 *     daily/fortnight    → released_amount (best available — means no orders were placed,
 *                          or the record predates the withdraw_amount field)
 *
 *   Grand Release ≤ Total Original always, because:
 *     released = original - deducted, deducted ≥ 0
 *
 * ── Cumulative grouping ───────────────────────────────────────────────────────
 *   One row per user+batch (matches payrelease page — one row per user).
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
    const limit     = Math.min(2000, parseInt(searchParams.get("limit") || "1000"));

    /* ── 1. Role-based base query ── */
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
      baseQuery = {};
    }

    /* ── 2. Additional filters ── */
    const conditions: any[] = [];

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
      const terms = search.split(",").map((s) => s.trim()).filter(Boolean);
      conditions.push({
        $or: terms.flatMap((t) => [
          { user_id:             { $regex: t, $options: "i" } },
          { user_name:           { $regex: t, $options: "i" } },
          { account_holder_name: { $regex: t, $options: "i" } },
          { batch_id:            { $regex: t, $options: "i" } },
          { neft_utr:            { $regex: t, $options: "i" } },
        ]),
      });
    }

    const matchQuery =
      conditions.length > 0
        ? { $and: [baseQuery, ...conditions] }
        : baseQuery;

    /* ── 3. Aggregate — group by user_id + batch_id ──────────────────────────
       Per-record "effective_original":
         Use withdraw_amount when it was saved (> 0).
         Fall back to released_amount for older records where withdraw_amount = 0.

         Why released_amount as fallback?
           - referral/quickstar: released = withdraw_amount always (not spendable)
           - daily/fortnight with no order deductions: released = withdraw_amount
           - daily/fortnight WITH deductions + withdraw_amount=0 (old records):
             released_amount < actual original, so deducted will show 0 for these.
             This is the best we can do without the original data.

       Grand Release = sum(released_amount) — always correct, directly from DB.
       Total Original = sum(effective_original) — always ≥ Grand Release.
       Total Deducted = Total Original - Grand Release — always ≥ 0.
    ─────────────────────────────────────────────────────────────────────────── */
    const grouped = await Withdraw.aggregate([
      { $match: matchQuery },

      // Compute effective_original per record before grouping
      {
        $addFields: {
          effective_original: {
            $cond: {
              // withdraw_amount was saved and is > 0 → use it (correct net baseline)
              if:   { $gt: [{ $ifNull: ["$withdraw_amount", 0] }, 0] },
              then: "$withdraw_amount",
              // Fallback: use released_amount (safe for referral/quickstar always,
              // and for daily/fortnight records without deductions)
              else: { $ifNull: ["$released_amount", 0] },
            },
          },
        },
      },

      {
        $group: {
          _id: {
            user_id:  "$user_id",
            batch_id: "$batch_id",
          },
          user_name:           { $first: "$user_name"           },
          account_holder_name: { $first: "$account_holder_name" },
          contact:             { $first: "$contact"             },
          mail:                { $first: "$mail"                },
          rank:                { $first: "$rank"                },
          bank_name:           { $first: "$bank_name"           },
          account_number:      { $first: "$account_number"      },
          ifsc_code:           { $first: "$ifsc_code"           },
          released_date:       { $first: "$released_date"       },
          released_at:         { $first: "$released_at"         },

          // Original = sum of effective_original (net after TDS/admin)
          total_original: { $sum: "$effective_original" },
          // Released = actual bank transfer
          total_released: { $sum: "$released_amount"    },

          payout_count: { $sum: 1 },
          bonus_types:  { $addToSet: "$bonus_type" },
          neft_utrs:    { $addToSet: "$neft_utr"   },
          payout_ids:   { $push: "$payout_id"      },
        },
      },

      {
        $addFields: {
          // Deducted = original - released, always ≥ 0
          // This mirrors payrelease: deducted = withdraw_total - score_balance
          deducted: {
            $max: [{ $subtract: ["$total_original", "$total_released"] }, 0],
          },

          // Representative UTR for display
          neft_utr_display: {
            $let: {
              vars: {
                nonNull: {
                  $filter: {
                    input: "$neft_utrs",
                    cond: {
                      $and: [
                        { $ne: ["$$this", null] },
                        { $ne: ["$$this", ""]   },
                      ],
                    },
                  },
                },
              },
              in: {
                $cond: {
                  if:   { $eq: [{ $size: "$$nonNull" }, 0] },
                  then: null,
                  else: {
                    $cond: {
                      if:   { $eq: [{ $size: "$$nonNull" }, 1] },
                      then: { $arrayElemAt: ["$$nonNull", 0] },
                      else: "multiple",
                    },
                  },
                },
              },
            },
          },
        },
      },

      { $sort: { released_at: -1, "_id.user_id": 1 } },
      { $limit: limit },
    ]);

    /* ── 4. Shape output ── */
    const records = grouped.map((g) => ({
      id:                  `${g._id.user_id}_${g._id.batch_id}`,
      user_id:             g._id.user_id,
      batch_id:            g._id.batch_id,
      user_name:           g.user_name,
      account_holder_name: g.account_holder_name,
      contact:             g.contact,
      mail:                g.mail,
      rank:                g.rank,
      bank_name:           g.bank_name,
      account_number:      g.account_number,
      ifsc_code:           g.ifsc_code,
      released_date:       g.released_date,
      released_at:         g.released_at,
      original_amount:     g.total_original,  // net after TDS/admin = payrelease "Total Original"
      released_amount:     g.total_released,  // actual bank transfer = payrelease "Grand Release"
      deducted_amount:     g.deducted,        // points used on orders = payrelease "Total Deducted"
      payout_count:        g.payout_count,
      bonus_types:         (g.bonus_types || []).filter(Boolean).sort().join(", "),
      payout_ids:          g.payout_ids || [],
      neft_utr:            g.neft_utr_display,
    }));

    /* ── 5. Summary — same effective_original logic ── */
    const summaryAgg = await Withdraw.aggregate([
      { $match: matchQuery },
      {
        $addFields: {
          effective_original: {
            $cond: {
              if:   { $gt: [{ $ifNull: ["$withdraw_amount", 0] }, 0] },
              then: "$withdraw_amount",
              else: { $ifNull: ["$released_amount", 0] },
            },
          },
        },
      },
      {
        $group: {
          _id:            null,
          total_original: { $sum: "$effective_original" },
          total_released: { $sum: "$released_amount"    },
          unique_users:   { $addToSet: "$user_id"       },
          unique_batches: { $addToSet: "$batch_id"      },
        },
      },
    ]);

    const agg            = summaryAgg[0] || {};
    const totalOriginal  = agg.total_original ?? 0;
    const totalReleased  = agg.total_released ?? 0;

    const summary = {
      total_records:  records.length,
      unique_users:   agg.unique_users?.length  ?? 0,
      unique_batches: agg.unique_batches?.length ?? 0,
      total_original: totalOriginal,
      total_deducted: Math.max(0, totalOriginal - totalReleased),
      grand_release:  totalReleased,
    };

    return NextResponse.json(
      { success: true, data: records, total: records.length, summary },
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
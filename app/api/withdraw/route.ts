/**
 * GET /api/withdraw/route.ts
 *
 * Role-based access:
 *   role=admin  → one row per BATCH (grouped by batch_id only)
 *   role=user   → one row per user+batch (only their own records)
 */

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Withdraw } from "@/models/withdraw";

export async function GET(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const role       = searchParams.get("role")        || "";
    const userId     = searchParams.get("user_id")     || "";
    const search     = searchParams.get("search")      || "";
    const from       = searchParams.get("from")        || null;
    const to         = searchParams.get("to")          || null;
    const date       = searchParams.get("date")        || null;
    const batchId    = searchParams.get("batch_id")    || "";
    const bonusType  = searchParams.get("bonus_type")  || "";
    const payoutName = searchParams.get("payout_name") || "";
    const limit      = Math.min(2000, parseInt(searchParams.get("limit") || "1000"));

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

    if (batchId.trim())    conditions.push({ batch_id:    batchId.trim() });
    if (bonusType.trim())  conditions.push({ bonus_type:  bonusType.trim() });
    if (payoutName.trim()) conditions.push({ payout_name: { $regex: payoutName.trim(), $options: "i" } });

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

    /* ── 3. Group ID — admin: per batch / user: per user+batch ── */
    const groupById =
      role === "admin"
        ? { batch_id: "$batch_id" }
        : { user_id: "$user_id", batch_id: "$batch_id" };

    /* ── 4. Aggregate ── */
    const grouped = await Withdraw.aggregate([
      { $match: matchQuery },

      // Compute effective_original per record before grouping
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
          _id: groupById,

          released_date:       { $first: "$released_date"       },
          released_at:         { $first: "$released_at"         },
          total_original:      { $sum: "$effective_original"    },
          total_released:      { $sum: "$released_amount"       },
          payout_count:        { $sum: 1                        },
          bonus_types:         { $addToSet: "$bonus_type"       },
          neft_utrs:           { $addToSet: "$neft_utr"         },
          payout_ids:          { $push: "$payout_id"            },

          // Admin: collect unique users per batch
          unique_user_ids:     { $addToSet: "$user_id"          },

          // User: per-user fields (only meaningful when grouped by user+batch)
          user_name:           { $first: "$user_name"           },
          account_holder_name: { $first: "$account_holder_name" },
          contact:             { $first: "$contact"             },
          mail:                { $first: "$mail"                },
          rank:                { $first: "$rank"                },
          bank_name:           { $first: "$bank_name"           },
          account_number:      { $first: "$account_number"      },
          ifsc_code:           { $first: "$ifsc_code"           },
        },
      },

      {
        $addFields: {
          // Deducted = original - released, always ≥ 0
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

      { $sort: { released_at: -1 } },
      { $limit: limit },
    ]);

    /* ── 5. Shape output ── */
    const records = grouped.map((g) => {
      const isAdminRole = role === "admin";
      const batchIdVal  = isAdminRole ? g._id.batch_id : g._id.batch_id;
      const userIdVal   = isAdminRole ? null : g._id.user_id;
      const userCount   = isAdminRole ? (g.unique_user_ids?.length ?? 0) : 1;

      return {
        id:                  isAdminRole ? batchIdVal : `${userIdVal}_${batchIdVal}`,
        batch_id:            batchIdVal,
        user_id:             userIdVal,
        user_count:          userCount,
        user_name:           g.user_name           || null,
        account_holder_name: g.account_holder_name || null,
        contact:             g.contact             || null,
        mail:                g.mail                || null,
        rank:                g.rank                || null,
        bank_name:           g.bank_name           || null,
        account_number:      g.account_number      || null,
        ifsc_code:           g.ifsc_code           || null,
        released_date:       g.released_date,
        released_at:         g.released_at,
        original_amount:     g.total_original,
        released_amount:     g.total_released,
        deducted_amount:     g.deducted,
        payout_count:        g.payout_count,
        bonus_types:         (g.bonus_types || []).filter(Boolean).sort().join(", "),
        payout_ids:          g.payout_ids || [],
        neft_utr:            g.neft_utr_display,
      };
    });

    /* ── 6. Summary ── */
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

    const agg           = summaryAgg[0] || {};
    const totalOriginal = agg.total_original ?? 0;
    const totalReleased = agg.total_released ?? 0;

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
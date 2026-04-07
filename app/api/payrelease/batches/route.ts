/**
 * GET /api/payrelease/batches/route.ts
 *
 * Lists all payout release batches, newest first.
 * Use this to see every weekly Excel download that has happened,
 * its status, and whether NEFT details have been filled in yet.
 *
 * Query params:
 *   status  — filter by batch status: "released" | "partially_updated" | "transaction_updated"
 *   page    — page number (default 1)
 *   limit   — items per page (default 20, max 100)
 *   search  — search by batch_id (partial match)
 */

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { PayoutBatch } from "@/models/batch";

export async function GET(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "";
    const search = searchParams.get("search") || "";
    const page   = Math.max(1, parseInt(searchParams.get("page")  || "1"));
    const limit  = Math.min(100, parseInt(searchParams.get("limit") || "20"));

    const query: any = {};
    if (status) query.status = status;
    if (search.trim()) {
      query.batch_id = { $regex: search.trim(), $options: "i" };
    }

    const [batches, total] = await Promise.all([
      PayoutBatch.find(query, {
        // Exclude verbose update_history from list view — only in detail view
        update_history: 0,
      })
        .sort({ released_at: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      PayoutBatch.countDocuments(query),
    ]);

    return NextResponse.json(
      {
        success: true,
        data:    batches,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Batches GET error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Server error", data: [] },
      { status: 500 },
    );
  }
}
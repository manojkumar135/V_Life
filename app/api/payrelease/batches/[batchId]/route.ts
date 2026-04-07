/**
 * /api/payrelease/batches/[batchId]/route.ts
 *
 * ── GET ───────────────────────────────────────────────────────────────────────
 *   Returns full detail for a single batch including:
 *   - Batch metadata (dates, totals, status, update history)
 *   - All Withdraw records that belong to this batch
 *   - Summary: how many have NEFT details vs pending
 *
 * ── PATCH ─────────────────────────────────────────────────────────────────────
 *   Updates NEFT / bank transaction details for this batch.
 *   Supports two modes:
 *
 *   Mode "batch" — one NEFT transfer covered ALL users in this batch:
 *   {
 *     "mode": "batch",
 *     "neft_utr": "HDFC0012345678",
 *     "neft_transaction_date": "07-04-2026",
 *     "neft_transaction_time": "14:30",
 *     "neft_bank_ref": "REF123",          // optional
 *     "neft_remarks": "April week 1",     // optional
 *     "updated_by": "admin_user_id"
 *   }
 *
 *   Mode "selective" — bank split into multiple transfers (different UTRs per user/payout):
 *   {
 *     "mode": "selective",
 *     "updates": [
 *       {
 *         "payout_id": "P001",
 *         "neft_utr": "UTR001",
 *         "neft_transaction_date": "07-04-2026",
 *         "neft_transaction_time": "14:30",
 *         "neft_bank_ref": "REF001"
 *       },
 *       {
 *         "payout_id": "P002",
 *         "neft_utr": "UTR002",
 *         "neft_transaction_date": "08-04-2026",
 *         "neft_transaction_time": "09:15"
 *       }
 *     ],
 *     "updated_by": "admin_user_id"
 *   }
 *
 *   After update, batch status auto-advances:
 *     all records have UTR → "transaction_updated"
 *     some records have UTR → "partially_updated"
 */

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { PayoutBatch } from "@/models/batch";
import { Withdraw } from "@/models/withdraw";

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(
  _req: Request,
  { params }: { params: { batchId: string } },
) {
  try {
    await connectDB();
    const { batchId } = params;

    const [batch, withdraws] = await Promise.all([
      PayoutBatch.findOne({ batch_id: batchId }).lean(),
      Withdraw.find({ batch_id: batchId })
        .sort({ user_id: 1, bonus_type: 1 })
        .lean(),
    ]);

    if (!batch) {
      return NextResponse.json(
        { success: false, message: "Batch not found" },
        { status: 404 },
      );
    }

    // Summary of NEFT completion
    const totalWithdraws   = withdraws.length;
    const updatedWithdraws = withdraws.filter((w: any) => w.neft_utr).length;
    const pendingWithdraws = totalWithdraws - updatedWithdraws;

    return NextResponse.json(
      {
        success: true,
        batch,
        withdraws,
        summary: {
          total:   totalWithdraws,
          updated: updatedWithdraws,
          pending: pendingWithdraws,
        },
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Batch detail GET error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Server error" },
      { status: 500 },
    );
  }
}

// ─── PATCH ────────────────────────────────────────────────────────────────────

export async function PATCH(
  request: Request,
  { params }: { params: { batchId: string } },
) {
  try {
    await connectDB();
    const { batchId } = params;
    const body = await request.json();
    const { mode, updated_by = "admin" } = body;
    const now = new Date();

    // Validate batch exists
    const batch = await PayoutBatch.findOne({ batch_id: batchId });
    if (!batch) {
      return NextResponse.json(
        { success: false, message: "Batch not found" },
        { status: 404 },
      );
    }

    // ── Mode: batch — same UTR for all withdraws in this batch ───────────────
    if (mode === "batch") {
      const {
        neft_utr,
        neft_transaction_date,
        neft_transaction_time,
        neft_bank_ref  = null,
        neft_remarks   = null,
      } = body;

      if (!neft_utr) {
        return NextResponse.json(
          { success: false, message: "neft_utr is required for batch mode" },
          { status: 400 },
        );
      }

      await Promise.all([
        // Update all withdraw records in this batch with the same NEFT details
        Withdraw.updateMany(
          { batch_id: batchId },
          {
            $set: {
              neft_utr,
              neft_transaction_date:  neft_transaction_date  || null,
              neft_transaction_time:  neft_transaction_time  || null,
              neft_bank_ref,
              neft_remarks,
              transaction_updated_at: now,
              transaction_updated_by: updated_by,
            },
          },
        ),

        // Update batch record with same details + advance status
        PayoutBatch.updateOne(
          { batch_id: batchId },
          {
            $set: {
              neft_utr,
              neft_transaction_date: neft_transaction_date || null,
              neft_transaction_time: neft_transaction_time || null,
              neft_bank_ref,
              neft_remarks,
              status: "transaction_updated",
            },
            $push: {
              update_history: {
                updated_at: now,
                updated_by,
                fields: {
                  neft_utr,
                  neft_transaction_date,
                  neft_transaction_time,
                  neft_bank_ref,
                  neft_remarks,
                },
                note: `Batch-level NEFT update applied to all withdraw records`,
              },
            },
          },
        ),
      ]);

      return NextResponse.json(
        {
          success: true,
          message: `NEFT details applied to all withdraw records in batch ${batchId}`,
          batch_id: batchId,
          mode:     "batch",
        },
        { status: 200 },
      );
    }

    // ── Mode: selective — different UTRs per payout_id ───────────────────────
    if (mode === "selective") {
      const { updates } = body as {
        updates: Array<{
          payout_id:             string;
          neft_utr?:             string;
          neft_transaction_date?: string;
          neft_transaction_time?: string;
          neft_bank_ref?:        string;
          neft_remarks?:         string;
        }>;
      };

      if (!updates || updates.length === 0) {
        return NextResponse.json(
          { success: false, message: "updates array is required for selective mode" },
          { status: 400 },
        );
      }

      // Build bulkWrite ops — one per payout_id
      const bulkOps = updates.map((u) => ({
        updateOne: {
          filter: { payout_id: u.payout_id, batch_id: batchId },
          update: {
            $set: {
              neft_utr:               u.neft_utr              || null,
              neft_transaction_date:  u.neft_transaction_date || null,
              neft_transaction_time:  u.neft_transaction_time || null,
              neft_bank_ref:          u.neft_bank_ref         || null,
              neft_remarks:           u.neft_remarks          || null,
              transaction_updated_at: now,
              transaction_updated_by: updated_by,
            },
          },
        },
      }));

      const result = await Withdraw.bulkWrite(bulkOps);

      // Check how many records still have no UTR to set batch status correctly
      const pendingCount = await Withdraw.countDocuments({
        batch_id: batchId,
        $or: [{ neft_utr: null }, { neft_utr: { $exists: false } }],
      });

      const newStatus =
        pendingCount === 0 ? "transaction_updated" : "partially_updated";

      await PayoutBatch.updateOne(
        { batch_id: batchId },
        {
          $set: { status: newStatus },
          $push: {
            update_history: {
              updated_at: now,
              updated_by,
              fields: {
                payout_ids: updates.map((u) => u.payout_id),
                count:      updates.length,
              },
              note: `Selective NEFT update — ${updates.length} payout record(s). Pending after update: ${pendingCount}`,
            },
          },
        },
      );

      return NextResponse.json(
        {
          success: true,
          message:        `Updated ${result.modifiedCount} withdraw record(s)`,
          batch_id:       batchId,
          mode:           "selective",
          modified_count: result.modifiedCount,
          pending_count:  pendingCount,
          batch_status:   newStatus,
        },
        { status: 200 },
      );
    }

    // ── Unknown mode ─────────────────────────────────────────────────────────
    return NextResponse.json(
      { success: false, message: `Invalid mode "${mode}". Use "batch" or "selective"` },
      { status: 400 },
    );
  } catch (error: any) {
    console.error("Batch PATCH error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Server error" },
      { status: 500 },
    );
  }
}
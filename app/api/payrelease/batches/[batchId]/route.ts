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
 *     "neft_bank_ref": "REF123",
 *     "neft_remarks": "April week 1",
 *     "updated_by": "admin_user_id"
 *   }
 *
 *   Mode "selective" — bank split into multiple transfers (different UTRs per user/payout):
 *   {
 *     "mode": "selective",
 *     "updates": [
 *       { "payout_id": "P001", "neft_utr": "UTR001", "neft_transaction_date": "07-04-2026", ... },
 *       { "payout_id": "P002", "neft_utr": "UTR002", ... }
 *     ],
 *     "updated_by": "admin_user_id"
 *   }
 *
 *   For BOTH modes, on each UTR update:
 *     → Withdraw.neft_utr is set (audit trail)
 *     → DailyPayout.transaction_id + WeeklyPayout.transaction_id are updated with neft_utr
 *       so the payout record is self-contained with the final bank transaction reference
 *
 *   After selective update, batch status auto-advances:
 *     all records have UTR → "transaction_updated"
 *     some records have UTR → "partially_updated"
 *
 *   For selective mode, batch.neft_utr is set to the FIRST UTR in the update
 *   (or "multiple" if different UTRs are used) so the batches list never shows "Pending"
 *   incorrectly when all records are actually updated.
 */

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { PayoutBatch } from "@/models/batch";
import { Withdraw } from "@/models/withdraw";
import { DailyPayout, WeeklyPayout } from "@/models/payout";

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(
  req: Request,
  { params }: { params: Promise<{ batchId: string }> },
) {
  try {
    await connectDB();
    const { batchId } = await params;

    // ── Role-based filtering ──────────────────────────────────────────────────
    const { searchParams } = new URL(req.url);
    const role    = searchParams.get("role")    || "user";
    const user_id = searchParams.get("user_id") || null;

    const [batch, withdraws] = await Promise.all([
      PayoutBatch.findOne({ batch_id: batchId }).lean(),
      Withdraw.find({
        batch_id: batchId,
        // admin sees all; normal user sees only their own records
        ...(role !== "admin" && user_id ? { user_id } : {}),
      })
        .sort({ user_id: 1, bonus_type: 1 })
        .lean(),
    ]);

    if (!batch) {
      return NextResponse.json(
        { success: false, message: "Batch not found" },
        { status: 404 },
      );
    }
    

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
  { params }: { params: Promise<{ batchId: string }> },
) {
  try {
    await connectDB();
    const { batchId } = await params;
    const body = await request.json();
    const { mode, updated_by = "admin" } = body;
    const now = new Date();

    const batch = await PayoutBatch.findOne({ batch_id: batchId });
    if (!batch) {
      return NextResponse.json(
        { success: false, message: "Batch not found" },
        { status: 404 },
      );
    }

    // ── Mode: batch — same UTR for ALL records ────────────────────────────────
    if (mode === "batch") {
      const {
        neft_utr,
        neft_transaction_date,
        neft_transaction_time,
        neft_bank_ref = null,
        neft_remarks  = null,
      } = body;

      if (!neft_utr) {
        return NextResponse.json(
          { success: false, message: "neft_utr is required for batch mode" },
          { status: 400 },
        );
      }

      // Get all payout_ids in this batch to update transaction_id on payout records
      const withdrawsInBatch = await Withdraw.find(
        { batch_id: batchId },
        { payout_id: 1 },
      ).lean();
      const payoutIds = withdrawsInBatch.map((w: any) => w.payout_id);

      await Promise.all([
        // 1. Update all Withdraw records with NEFT details
        Withdraw.updateMany(
          { batch_id: batchId },
          {
            $set: {
              neft_utr,
              neft_transaction_date:  neft_transaction_date || null,
              neft_transaction_time:  neft_transaction_time || null,
              neft_bank_ref,
              neft_remarks,
              transaction_updated_at: now,
              transaction_updated_by: updated_by,
            },
          },
        ),

        // 2. Update transaction_id on DailyPayout records — neft_utr is the bank's
        //    final transaction reference for this payout
        DailyPayout.updateMany(
          { payout_id: { $in: payoutIds } },
          {
            $set: {
              transaction_id:   neft_utr,
              last_modified_at: now,
              last_modified_by: updated_by,
            },
          },
        ),

        // 3. Same for WeeklyPayout records
        WeeklyPayout.updateMany(
          { payout_id: { $in: payoutIds } },
          {
            $set: {
              transaction_id:   neft_utr,
              last_modified_at: now,
              last_modified_by: updated_by,
            },
          },
        ),

        // 4. Update PayoutBatch — set neft_utr so list page shows it correctly
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
                fields: { neft_utr, neft_transaction_date, neft_transaction_time, neft_bank_ref, neft_remarks },
                note: `Batch-level NEFT update applied to all ${payoutIds.length} withdraw records`,
              },
            },
          },
        ),
      ]);

      return NextResponse.json(
        {
          success:  true,
          message:  `NEFT details applied to all withdraw records in batch ${batchId}`,
          batch_id: batchId,
          mode:     "batch",
        },
        { status: 200 },
      );
    }

    // ── Mode: selective — different UTRs per payout_id ────────────────────────
    if (mode === "selective") {
      const { updates } = body as {
        updates: Array<{
          payout_id:              string;
          neft_utr?:              string;
          neft_transaction_date?: string;
          neft_transaction_time?: string;
          neft_bank_ref?:         string;
          neft_remarks?:          string;
        }>;
      };

      if (!updates || updates.length === 0) {
        return NextResponse.json(
          { success: false, message: "updates array is required for selective mode" },
          { status: 400 },
        );
      }

      // Build bulkWrite ops for Withdraw records
      const withdrawBulkOps = updates.map((u) => ({
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

      // Build bulkWrite ops to update transaction_id on payout records
      // Same op runs against both DailyPayout and WeeklyPayout —
      // each payout_id only exists in one collection, so the other gets 0 matches (safe)
      const payoutBulkOps = updates
        .filter((u) => u.neft_utr) // only update where UTR is provided
        .map((u) => ({
          updateOne: {
            filter: { payout_id: u.payout_id },
            update: {
              $set: {
                transaction_id:   u.neft_utr,  // bank UTR = final transaction reference
                last_modified_at: now,
                last_modified_by: updated_by,
              },
            },
          },
        }));

      await Promise.all([
        // 1. Update Withdraw records
        Withdraw.bulkWrite(withdrawBulkOps),

        // 2. Update transaction_id on payout records (both collections)
        payoutBulkOps.length > 0
          ? Promise.all([
              DailyPayout.bulkWrite(payoutBulkOps),
              WeeklyPayout.bulkWrite(payoutBulkOps),
            ])
          : Promise.resolve(),
      ]);

      // Check how many Withdraw records still have no UTR
      const pendingCount = await Withdraw.countDocuments({
        batch_id: batchId,
        $or: [{ neft_utr: null }, { neft_utr: { $exists: false } }],
      });

      const newStatus = pendingCount === 0 ? "transaction_updated" : "partially_updated";

      /* ── Fix: set neft_utr on the PayoutBatch document for selective mode ──
         The batches list page reads batch.neft_utr to show in the NEFT UTR column.
         For selective mode (different UTRs per user), we use the first UTR provided
         as a representative value, or "multiple" if more than one distinct UTR.
         This ensures the list page never shows "Pending" when all records are done.
      ─────────────────────────────────────────────────────────────────────────── */
      const distinctUtrs = [...new Set(updates.map((u) => u.neft_utr).filter(Boolean))];
      const batchNeftUtr =
        distinctUtrs.length === 0 ? null :
        distinctUtrs.length === 1 ? distinctUtrs[0] :
        "multiple";

      await PayoutBatch.updateOne(
        { batch_id: batchId },
        {
          $set: {
            status: newStatus,
            // Only update neft_utr on batch if it's not already set (first selective update)
            // or if all records are now done (set representative value)
            ...(pendingCount === 0 && batchNeftUtr
              ? { neft_utr: batchNeftUtr }
              : !batch.neft_utr && batchNeftUtr
              ? { neft_utr: batchNeftUtr }
              : {}),
          },
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
          success:        true,
          message:        `Updated ${updates.length} withdraw record(s)`,
          batch_id:       batchId,
          mode:           "selective",
          modified_count: updates.length,
          pending_count:  pendingCount,
          batch_status:   newStatus,
        },
        { status: 200 },
      );
    }

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
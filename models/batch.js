/**
 * models/batch.ts
 *
 * One document per weekly Excel download (payout release event).
 * Tracks the batch as a whole — total amount, user count, NEFT details,
 * and a full audit history of every update made by admins.
 *
 * collection: "payout_batches"
 */

import mongoose from "mongoose";

const UpdateHistorySchema = new mongoose.Schema(
  {
    updated_at: { type: Date,   required: true },
    updated_by: { type: String, required: true },
    // Snapshot of the fields that were changed in this update
    fields:     { type: Object, default: {} },
    note:       { type: String },
  },
  { _id: false }
);

const BatchSchema = new mongoose.Schema(
  {
    // ── Identity ──────────────────────────────────────────────────────
    batch_id:      { type: String, required: true, unique: true },
    released_at:   { type: Date,   required: true },
    released_date: { type: String, required: true }, // "07-04-2026"
    released_time: { type: String, required: true }, // "14:30"
    released_by:   { type: String, default: "admin" },

    // ── Summary ───────────────────────────────────────────────────────
    user_count:   { type: Number, default: 0 },
    total_amount: { type: Number, default: 0 },
    payout_count: { type: Number, default: 0 }, // total individual payout records

    // ── NEFT / Bank transaction details ───────────────────────────────
    // These are empty at creation — admin fills them in once bank confirms.
    // For batches where all users share one NEFT transfer, a single UTR is enough.
    // For batches split across multiple transfers, use the selective update API.
    neft_utr:              { type: String, default: null },
    neft_transaction_date: { type: String, default: null }, // DD-MM-YYYY
    neft_transaction_time: { type: String, default: null }, // HH:MM
    neft_bank_ref:         { type: String, default: null },
    neft_remarks:          { type: String, default: null },

    // ── Status ────────────────────────────────────────────────────────
    // released          → Excel downloaded, DB updated, no NEFT info yet
    // partially_updated → Some withdraw records have UTR, some don't
    // transaction_updated → All withdraw records have UTR
    status: {
      type:    String,
      enum:    ["released", "partially_updated", "transaction_updated"],
      default: "released",
    },

    // ── Audit trail ───────────────────────────────────────────────────
    update_history: { type: [UpdateHistorySchema], default: [] },

    created_at: { type: Date, default: Date.now },
  },
  {
    collection: "payout_batches",
    timestamps: false,
  }
);

BatchSchema.index({ batch_id: 1 });
BatchSchema.index({ status: 1, released_at: -1 });
BatchSchema.index({ released_at: -1 });

export const PayoutBatch =
  mongoose.models.PayoutBatch ||
  mongoose.model("PayoutBatch", BatchSchema);
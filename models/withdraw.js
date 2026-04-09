/**
 * models/withdraw.ts
 *
 * One document per payout_id — created when admin downloads the weekly Excel.
 * Tracks what was actually released to the user for each payout.
 *
 * Transaction details (UTR, bank ref) are filled in later via the batch update API
 * because NEFT confirmations may take a few days to arrive.
 *
 * Amount fields and their meaning:
 *   original_amount  = payout.amount          (gross — before TDS/admin)
 *   tds_amount       = payout.tds_amount       (TDS deducted)
 *   admin_charge     = payout.admin_charge     (admin fee deducted)
 *   withdraw_amount  = payout.withdraw_amount  (net after TDS/admin — real baseline)
 *                      This is what goes into score.balance and is the
 *                      correct "Total Original" for the withdraw summary cards.
 *   released_amount  = proportional share of score.balance at release time
 *                      = withdraw_amount minus points spent on orders
 *                      = actual bank transfer amount
 *
 *   total_deducted (derived, not stored) = withdraw_amount - released_amount
 *                      = points the user spent on orders before this release
 *
 * collection: "withdraws"
 */

import mongoose from "mongoose";

const WithdrawSchema = new mongoose.Schema(
  {
    // ── Link back to original payout ──────────────────────────────────
    payout_id:      { type: String, required: true, unique: true },
    transaction_id: { type: String }, // original payout transaction_id

    // ── Release batch info ────────────────────────────────────────────
    batch_id:      { type: String, required: true },
    released_at:   { type: Date,   required: true },
    released_date: { type: String, required: true }, // "07-04-2026"
    released_time: { type: String, required: true }, // "14:30"

    // ── User info (snapshot at time of release) ───────────────────────
    user_id:             { type: String, required: true },
    user_name:           { type: String },
    account_holder_name: { type: String },
    contact:             { type: String },
    mail:                { type: String },
    rank:                { type: String },
    wallet_id:           { type: String },
    pan_number:          { type: String },
    bank_name:           { type: String },
    account_number:      { type: String },
    ifsc_code:           { type: String },

    // ── Payout type info ──────────────────────────────────────────────
    payout_name:  { type: String },
    payout_title: { type: String },
    bonus_type:   {
      type: String,
      enum: ["daily", "fortnight", "referral", "quickstar"],
    },

    // ── Amount breakdown ──────────────────────────────────────────────
    original_amount: { type: Number, default: 0 }, // payout.amount (gross before TDS/admin)
    tds_amount:      { type: Number, default: 0 }, // TDS deducted from original
    admin_charge:    { type: Number, default: 0 }, // admin fee deducted from original
    reward_amount:   { type: Number, default: 0 }, // payout.reward_amount

    // ── Net baseline — KEY FIELD for summary cards ────────────────────
    // payout.withdraw_amount = original_amount - tds_amount - admin_charge
    // This is the amount that goes into score.balance.
    // Summary card "Total Original Amount" = sum of this field.
    withdraw_amount: { type: Number, default: 0 },

    // ── Actual released amount ────────────────────────────────────────
    // For daily/fortnight: proportional share of score.balance at release time
    //   (score.balance = withdraw_amount minus points spent on orders)
    // For referral/quickstar: equals withdraw_amount (not spendable)
    // Summary card "Grand Release Amount" = sum of this field.
    // Summary card "Total Deducted"       = sum(withdraw_amount - released_amount)
    released_amount: { type: Number, required: true },

    // ── Score balance at time of release (for audit) ──────────────────
    score_balance_before: { type: Number, default: 0 }, // balance before zeroing
    score_balance_after:  { type: Number, default: 0 }, // always 0 after release

    // ── NEFT / Bank transaction details (filled in later by admin) ────
    neft_utr:              { type: String, default: null },
    neft_transaction_date: { type: String, default: null }, // DD-MM-YYYY
    neft_transaction_time: { type: String, default: null }, // HH:MM
    neft_bank_ref:         { type: String, default: null },
    neft_remarks:          { type: String, default: null },

    transaction_updated_at: { type: Date,   default: null },
    transaction_updated_by: { type: String, default: null },

    // ── Status ────────────────────────────────────────────────────────
    status: {
      type:    String,
      default: "completed",
      enum:    ["completed", "failed", "reversed"],
    },

    remarks:    { type: String },
    created_at: { type: Date, default: Date.now },
  },
  {
    collection: "withdraws",
    timestamps: false,
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
WithdrawSchema.index({ user_id: 1, released_at: -1 });
WithdrawSchema.index({ batch_id: 1 });
WithdrawSchema.index({ neft_utr: 1 });
WithdrawSchema.index({ batch_id: 1, neft_utr: 1 });

export const Withdraw =
  mongoose.models.Withdraw || mongoose.model("Withdraw", WithdrawSchema);
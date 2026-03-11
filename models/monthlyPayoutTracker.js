// models/monthlyPayoutTracker.ts
//
// ─── Purpose ──────────────────────────────────────────────────────────────
//
//  One document per user per month.
//  Tracks the monthly payout total, PV obligation, and — importantly —
//  the full details of every PV order placed to fulfil that obligation.
//
// ─── PV Obligation Rules ──────────────────────────────────────────────────
//
//  Monthly Payout Total   │  PV Required  │  Notes
//  ───────────────────────┼───────────────┼────────────────────────────────
//  < ₹1,00,000            │  0 PV         │  No restriction
//  ₹1,00,000 – ₹2,99,999  │  50 PV        │  Must place 50 PV order
//  ≥ ₹3,00,000            │  100 PV       │  Must place 100 PV total (50+50)
//
//  • Partial PV does NOT release holds — full pv_required must be met.
//  • If user placed 50 PV at ₹1L and later crosses ₹3L,
//    pv_required jumps to 100 but only 50 more PV is needed.
//  • New-month payouts stay OnHold if ANY prior month's PV is uncleared.
//
// ─── Embedded Order Records ───────────────────────────────────────────────
//
//  pv_orders[]  — every PV order placed toward this month's obligation.
//  Each entry contains full order details so you can audit exactly:
//    • which order was placed
//    • when it was placed (date + time)
//    • how much PV it contributed
//    • what the order amount was
//    • whether it triggered the hold release
//
// ─── Change from original ─────────────────────────────────────────────────
//
//  ADDED to main schema:
//    user_name  — display name of the user (synced from User model)
//    contact    — phone/contact of the user
//    mail       — email of the user
//
//  These are populated when the tracker is first created (via
//  getOrCreateMonthlyTracker) and kept for easy audit/dashboard display
//  without needing a User lookup every time.
//
// ──────────────────────────────────────────────────────────────────────────

import mongoose from "mongoose";

const { Schema } = mongoose;

// ─── Sub-schema: one PV order record ─────────────────────────────────────

const PvOrderSchema = new Schema(
  {
    // Order identifier from your orders collection
    order_id: { type: String, required: true },

    // PV value of this specific order
    pv: { type: Number, required: true },

    // Monetary value of the order (optional but useful for audit)
    order_amount: { type: Number, default: 0 },

    // "DD-MM-YYYY" formatted date the order was placed
    date: { type: String, required: true },

    // "HH:MM" formatted time the order was placed
    time: { type: String, required: true },

    // Full timestamp for sorting / querying
    placed_at: { type: Date, required: true },

    // Running pv_fulfilled AFTER this order was counted
    // e.g. first order gives 30 PV → cumulative_pv_after = 30
    //      second order gives 20 PV → cumulative_pv_after = 50
    cumulative_pv_after: { type: Number, required: true },

    // Did this specific order push pv_fulfilled over pv_required?
    // true on the order that finally cleared the hold
    triggered_release: { type: Boolean, default: false },

    // Snapshot of pv_required at the time this order was placed
    pv_required_at_time: { type: Number, required: true },
  },
  {
    _id:        true,   // each order entry gets its own _id for easy reference
    timestamps: false,  // we use placed_at manually
  }
);

// ─── Main schema ──────────────────────────────────────────────────────────

const MonthlyPayoutTrackerSchema = new Schema(
  {
    // ── User identity ─────────────────────────────────────────────────────

    // User this tracker belongs to
    user_id: { type: String, required: true },

    // ✅ ADDED: Human-readable name — populated on first upsert, never changes
    user_name: { type: String, default: "" },

    // ✅ ADDED: Contact number — populated on first upsert
    contact: { type: String, default: "" },

    // ✅ ADDED: Email — populated on first upsert
    mail: { type: String, default: "" },

    // Month in "YYYY-MM" format e.g. "2025-03"
    month: { type: String, required: true },

    // ── Payout totals ─────────────────────────────────────────────────────

    // Running sum of all payout amounts credited this month (all statuses)
    total_payout: { type: Number, default: 0 },

    // ── PV obligation ─────────────────────────────────────────────────────

    // PV the user must order this month: 0 | 50 | 100
    //   0   → no restriction (total_payout < ₹1L)
    //  50   → crossed ₹1,00,000
    // 100   → crossed ₹3,00,000
    pv_required: { type: Number, default: 0, enum: [0, 50, 100] },

    // Total PV ordered so far this month toward the obligation
    // (sum of pv_orders[].pv)
    pv_fulfilled: { type: Number, default: 0 },

    // ── PV order records (embedded) ───────────────────────────────────────
    //
    // Full details of every PV order placed toward this month's obligation.
    // Used for:
    //   • Auditing which orders released a hold
    //   • Idempotency (check order_id before adding)
    //   • Admin dashboard showing order history per month
    pv_orders: { type: [PvOrderSchema], default: [] },

    // ── Hold state ────────────────────────────────────────────────────────

    // Flips to true once pv_fulfilled >= pv_required (and pv_required > 0).
    // Flips back to false if pv_required rises (e.g. ₹1L → ₹3L threshold).
    hold_released: { type: Boolean, default: false },

    // Timestamp when hold was released (pv obligation fully met)
    hold_released_at: { type: Date },

    // ── Threshold timestamps ──────────────────────────────────────────────

    // When ₹1,00,000 was first crossed this month
    crossed_1lakh_at: { type: Date },

    // When ₹3,00,000 was first crossed this month
    crossed_3lakh_at: { type: Date },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────

// Unique: one tracker per user per month
MonthlyPayoutTrackerSchema.index({ user_id: 1, month: 1 }, { unique: true });

// Fast lookup: "does this user have any uncleared prior months?"
MonthlyPayoutTrackerSchema.index({
  user_id:       1,
  month:         1,
  pv_required:   1,
  hold_released: 1,
});

// ─── Export ───────────────────────────────────────────────────────────────

export const MonthlyPayoutTracker =
  mongoose.models.MonthlyPayoutTracker ||
  mongoose.model("MonthlyPayoutTracker", MonthlyPayoutTrackerSchema);
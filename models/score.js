import mongoose from "mongoose";

/* -------------------------------
   🔹 IN HISTORY (EARN)
-------------------------------- */
const RewardInSchema = new mongoose.Schema(
  {
    source: {
      type: String, // daily_reward / referral / matching / manual
      required: true,
    },

    reference_id: {
      type: String, // cron_id / order_id / payout_id
    },

    points: {
      type: Number,
      required: true,
    },

    balance_after: {
      type: Number,
      required: true,
    },

    remarks: {
      type: String,
    },

    created_at: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

/* -------------------------------
   🔹 OUT HISTORY (USE)
-------------------------------- */
const RewardOutSchema = new mongoose.Schema(
  {
    module: {
      type: String, // order / booking / withdrawal
      required: true,
    },

    reference_id: {
      type: String, // order_id / booking_id
    },

    points: {
      type: Number,
      required: true,
    },

    balance_after: {
      type: Number,
      required: true,
    },

    remarks: {
      type: String,
    },

    created_at: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

/* -------------------------------
   🔹 REWARD TRANSACTION WRAPPER
-------------------------------- */
const RewardTxnSchema = new mongoose.Schema(
  {
    in: {
      type: [RewardInSchema],
      default: [],
    },
    out: {
      type: [RewardOutSchema],
      default: [],
    },
  },
  { _id: false }
);

/* -------------------------------
   🔹 SCORE MODEL
-------------------------------- */
const ScoreSchema = new mongoose.Schema(
  {
    user_id: { type: String, required: true, unique: true },
    user_name: { type: String },

    score: { type: Number, default: 0 },

    /* DAILY */
    daily: {
      earned: { type: Number, default: 0 },
      used: { type: Number, default: 0 },
      balance: { type: Number, default: 0 },
      history: { type: RewardTxnSchema, default: () => ({}) },
    },

    /* FORTNIGHT */
    fortnight: {
      earned: { type: Number, default: 0 },
      used: { type: Number, default: 0 },
      balance: { type: Number, default: 0 },
      history: { type: RewardTxnSchema, default: () => ({}) },
    },

    /* CASHBACK */
    cashback: {
      earned: { type: Number, default: 0 },
      used: { type: Number, default: 0 },
      balance: { type: Number, default: 0 },
      history: { type: RewardTxnSchema, default: () => ({}) },
    },

    updated_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: "scores",
    timestamps: false,
  }
);

export const Score =
  mongoose.models.Score || mongoose.model("Score", ScoreSchema);

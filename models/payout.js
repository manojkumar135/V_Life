import mongoose from "mongoose";

const payoutSchema = new mongoose.Schema({
  transaction_id: { type: String, required: true, unique: true },
  wallet_id: { type: String }, // optional, can be linked to Wallet schema
  user_id: { type: String, required: true }, // can be linked to User schema
  user_name: { type: String, required: true },
  name: { type: String }, // optional, e.g., payout name
  account_holder_name: { type: String },
  bank_name: { type: String },
  account_number: { type: String },
  ifsc_code: { type: String },
  date: { type: String, required: true }, // e.g., "2025-09-21"
  time: { type: String, required: true }, // e.g., "14:30"
  available_balance: { type: Number },
  amount: { type: Number, required: true },
  transaction_type: { type: String, required: true, enum: ["Credit", "Debit"] },
  details: { type: String },
  status: { type: String, required: true, enum: ["Pending", "Completed", "Failed"] },
  created_at: { type: Date, default: Date.now },
  created_by: { type: String },
  last_modified_by: { type: String },
  last_modified_at: { type: Date }
});

// Daily Payout Model
export const DailyPayout = mongoose.model("DailyPayout", payoutSchema, "daily_payouts");

// Weekly Payout Model
export const WeeklyPayout = mongoose.model("WeeklyPayout", payoutSchema, "weekly_payouts");

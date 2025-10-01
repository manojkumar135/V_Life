import mongoose from "mongoose";

const payoutSchema = new mongoose.Schema({
  transaction_id: { type: String, required: true, unique: true },
  wallet_id: { type: String },
  user_id: { type: String, required: true },
  user_name: { type: String, required: true },

  name: { type: String, default: "Matching Bonus" },
  title: { type: String, default: "Matching Bonus" },
  account_holder_name: { type: String },
  bank_name: { type: String },
  account_number: { type: String },
  ifsc_code: { type: String },
  date: { type: String, required: true },
  time: { type: String, required: true },
  available_balance: { type: Number },
  amount: { type: Number, required: true, default: 5000 },
  transaction_type: { type: String, required: true, enum: ["Credit", "Debit"], default: "Credit" },
  details: { type: String },
  status: { type: String, required: true, enum: ["Pending", "Completed", "Failed"], default: "Completed" },

  left_users: [{ type: Object }],
  right_users: [{ type: Object }],

  created_at: { type: Date, default: Date.now },
  created_by: { type: String },
  last_modified_by: { type: String },
  last_modified_at: { type: Date }
});

// ✅ Fix OverwriteModelError in Next.js dev mode
export const DailyPayout = mongoose.models.DailyPayout || mongoose.model("DailyPayout", payoutSchema, "daily_payouts");
export const WeeklyPayout = mongoose.models.WeeklyPayout || mongoose.model("WeeklyPayout", payoutSchema, "weekly_payouts");

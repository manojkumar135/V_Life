import mongoose from "mongoose";
import { TbDualScreen } from "react-icons/tb";

const payoutSchema = new mongoose.Schema({
  transaction_id: { type: String,},
  payout_id: { type: String, required: true, unique: true },
  wallet_id: { type: String },
  user_id: { type: String, required: true },
  user_name: { type: String, required: true },
  rank: { type: String },


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
  totalamount: { type: Number },
  withdraw_amount: { type: Number, default: 0 },
  reward_amount: { type: Number, default: 0 },
  tds_amount: { type: Number, default: 0 },
  admin_charge: { type: Number, default: 0 },
  transaction_type: { type: String, required: true, enum: ["Credit", "Debit"], default: "Credit" },
  details: { type: String },
  status: { type: String, required: true, enum: ["Pending", "Completed", "Failed","OnHold"], default: "Completed" },

  left_users: [{ type: Object }],
  right_users: [{ type: Object }],

  created_at: { type: Date, default: Date.now },
  created_by: { type: String },
  last_modified_by: { type: String },
  last_modified_at: { type: Date },
  is_checked: { type: Boolean, default: false },
  remarks: { type: String },
});

// ✅ Fix OverwriteModelError in Next.js dev mode
export const DailyPayout = mongoose.models.DailyPayout || mongoose.model("DailyPayout", payoutSchema, "daily_payouts");
export const WeeklyPayout = mongoose.models.WeeklyPayout || mongoose.model("WeeklyPayout", payoutSchema, "weekly_payouts");

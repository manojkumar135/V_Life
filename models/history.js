import mongoose from "mongoose";

const HistorySchema = new mongoose.Schema(
  {
    transaction_id: { type: String, required: true, unique: true },
    wallet_id: { type: String, }, // can be linked to Wallet schema
    user_id: { type: String, required: true },   // can be linked to User schema
    user_name: { type: String, required: true },
    order_id: { type: String, },
    account_holder_name: { type: String, },
    bank_name: { type: String, },
    account_number: { type: String, },
    ifsc_code: { type: String, },
    date: { type: String, required: true },
    time: { type: String, required: true },
    available_balance: { type: Number, },
    amount: { type: Number, required: true },
    transaction_type: { type: String, required: true, enum: ["Credit", "Debit"] },
    details: { type: String },
    status: { type: String, required: true, enum: ["Pending", "Completed", "Failed"] },
    created_at: { type: Date, default: Date.now },
    created_by: { type: String, },
    last_modified_by: { type: String },
    last_modified_at: { type: Date },
  },
  {
    timestamps: false, // manual date fields
    collection: "history",
  }
);

export const History =
  mongoose.models.History || mongoose.model("History", HistorySchema);

import mongoose from "mongoose";

const WalletSchema = new mongoose.Schema(
  {
    wallet_id: { type: String, required: true, unique: true },
    user_id: { type: String, required: true }, // can be linked to User schema
    user_name: { type: String, required: true },
    account_holder_name: { type: String, required: true },
    bank_name: { type: String, required: true },
    account_number: { type: String, required: true },
    ifsc_code: { type: String, required: true },
    created_at: { type: Date, default: Date.now },
    created_by: { type: String, },
    last_modified_by: { type: String },
    last_modified_at: { type: Date },
  },
  {
    timestamps: false, // keeping manual date fields like in user.js
    collection: "wallets",
  }
);

export const Wallet =
  mongoose.models.Wallet || mongoose.model("Wallet", WalletSchema);

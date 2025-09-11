import mongoose from "mongoose";

const WalletSchema = new mongoose.Schema(
  {
    wallet_id: { type: String, required: true, unique: true },
    user_id: { type: String, required: true }, // link to User
    user_name: { type: String, required: true },

    account_holder_name: { type: String, required: true },
    bank_name: { type: String, required: true },
    account_number: { type: String, required: true },
    ifsc_code: { type: String, required: true },

    // Aadhaar + PAN
    aadhar_number: { type: String },
    pan_number: { type: String },
    aadhar_file: { type: String },
    pan_file: { type: String },
    is_verified: { type: String, default: "No" },
    verified_at: { type: Date },

    balance: { type: Number, default: 0 },
    total_earnings: { type: Number, default: 0 },
    total_withdrawn: { type: Number, default: 0 },

    wallet_status: { type: String, },

    created_by: { type: String },
    last_modified_by: { type: String },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "last_modified_at" },
    collection: "wallets",
  }
);

export const Wallet =
  mongoose.models.Wallet || mongoose.model("Wallet", WalletSchema);

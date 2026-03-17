import mongoose from "mongoose";

const walletChangeRequestSchema = new mongoose.Schema(
  {
    request_id: { type: String, required: true, unique: true },

    wallet_id: { type: String, required: true },
    user_id: { type: String, required: true },

    requested_by: { type: String, required: true }, // user_id or admin_id
    requested_role: { type: String, required: true }, // user/admin

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    old_values: { type: Object,  },
    new_values: { type: Object, required: true },

    reviewed_by: { type: String, default: null },
    reviewed_at: { type: Date, default: null },

    created_at: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

export const WalletChangeRequest =
  mongoose.models.WalletChangeRequest ||
  mongoose.model("WalletChangeRequest", walletChangeRequestSchema);
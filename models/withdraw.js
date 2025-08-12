import mongoose from "mongoose";

const WithdrawSchema = new mongoose.Schema(
    {
        withdraw_id: { type: String, required: true, unique: true },
        wallet_id: { type: String, required: true }, // can be linked to Wallet schema
        user_id: { type: String, required: true },   // can be linked to User schema
        user_name: { type: String, },
        account_holder_name: { type: String, },
        bank_name: { type: String, },
        account_number: { type: String, },
        ifsc_code: { type: String, },
        date: { type: Date },
        available_balance: { type: Number },
        withdraw_amount: { type: Number },
        status: { type: String, },
        // status: { type: String, required: true, enum: ["Pending", "Approved", "Rejected"] },
        created_at: { type: Date, default: Date.now },
        created_by: { type: String, },
        last_modified_by: { type: String },
        last_modified_at: { type: Date },
    },
    {
        timestamps: false, // using custom fields for dates
        collection: "withdrawals",
    }
);

export const Withdraw =
    mongoose.models.Withdraw || mongoose.model("Withdraw", WithdrawSchema);

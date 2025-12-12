import mongoose from "mongoose";

const WalletSchema = new mongoose.Schema(
  {
    wallet_id: { type: String, required: true, unique: true },
    user_id: { type: String, required: true }, // link to User
    user_name: { type: String, required: true },
    contact: { type: String },
    mail: { type: String },
    rank: { type: String },
    gender: { type: String },
    user_status: { type: String },
    status_notes: { type: String },
    activated_date: { type: String },


    account_holder_name: { type: String, },
    bank_name: { type: String,  },
    account_number: { type: String,  },
    ifsc_code: { type: String,},
    cheque: { type: String },
    bank_book:{type:String},

    // Aadhaar + PAN
    aadhar_number: { type: String },
    pan_number: { type: String,required: true },
    pan_name: { type: String },
    pan_dob: { type: String },
    pan_verified: { type: String },
    pan_category: { type: String },
    aadhar_seeding: { type: String },

    aadhar_file: { type: String },
    aadhar_front: { type: String },
    aadhar_back: { type: String },
    gst_number:{type:String},

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

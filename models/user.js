import { group } from "console";
import mongoose from "mongoose";
import { title } from "process";

const BonusHistorySchema = new mongoose.Schema({
  type: { type: String, enum: ["matching", "leadership", "referral"], required: true },
  amount: { type: Number, required: true },
  cycle: { type: String }, // e.g., "2025-09-01-AM"
  details: { type: mongoose.Schema.Types.Mixed }, // flexible extra data
  timestamp: { type: Date, default: Date.now },
});

const UserSchema = new mongoose.Schema(
  {
    user_id: { type: String, required: true, unique: true },
    user_name: { type: String, required: true },
    dob: { type: String, required: true, default: "" },
    mail: { type: String, required: true },
    contact: { type: String, required: true },
    address: { type: String },
    pincode: { type: String },
    country: { type: String },
    state: { type: String },
    district: { type: String },
    locality: { type: String },

    created_at: { type: Date, default: Date.now },
    created_by: { type: String },
    last_modified_by: { type: String },
    last_modified_at: { type: Date },
    role: { type: String },
    role_id: { type: String },
    group: { type: String },
    group_id: { type: String },
    title: { type: String },
    profile: { type: String }, // URL or file path
    user_status: { type: String, default: "active" },

    // 🔗 Referral / Upline
    referBy: { type: String },
    infinity:{ type: String },
    referred_users: { type: [String], default: [] },
    infinity_users: [
      {
        level: { type: Number, required: true },
        users: [{ type: String }]
      }
    ],
    bv: { type: Number, default: 0 },
    sv: { type: Number, default: 0 },


    // 🌳 Binary Team Structure
    left: { type: String },
    right: { type: String }, // user_id of right downline
    left_team_volume: { type: Number, default: 0 }, // total business on left
    right_team_volume: { type: Number, default: 0 },
    carry_forward_left: { type: Number, default: 0 },
    carry_forward_right: { type: Number, default: 0 },

    // 🏦 Wallet
    wallet_balance: { type: Number, default: 0 },
    bonus_history: [BonusHistorySchema],

    // 🏅 Leadership
    is_leader: { type: Boolean, default: false },
    leader_qualifications: { type: Number, default: 0 }, // e.g., successful payments count
    left_leaders: { type: Number, default: 0 }, // count of leaders under left
    right_leaders: { type: Number, default: 0 },
    carry_forward_leaders_left: { type: Number, default: 0 },
    carry_forward_leaders_right: { type: Number, default: 0 },
  },
  {
    timestamps: false, // custom fields used
    collection: "users",
  }
);

export const User =
  mongoose.models.User || mongoose.model("User", UserSchema);

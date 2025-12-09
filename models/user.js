// import { group } from "console";
import mongoose from "mongoose";
// import { title } from "process";

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
    gender: { type: String },

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
    status_notes: { type: String },
    user_status: { type: String, default: "inactive" },

    gst:{type:String},
    blood:{type:String},
    landmark:{type:String},
    nominee_name:{type:String},
    nominee_relation:{type:String},
    nominee_dob:{type:String},
    alternate_contact:{type:String},

    // 🔗 Referral / Upline
    referBy: { type: String },
    infinity: { type: String },
    referred_users: { type: [String], default: [] },
    paid_directs: { type: [String], default: [] },
    paid_directs_count: { type: Number, default: 0 },
    infinity_referred_users: { type: [String], default: [] },
    infinity_referred_count: { type: Number, default: 0 },
    infinity_users: [
      {
        level: { type: Number, required: true },
        users: [{ type: String }]
      }
    ],
    self_bv: { type: Number, default: 0 },
    direct_bv: { type: Number, default: 0 },
    infinity_bv: { type: Number, default: 0 },
    left_infinity_bv: { type: Number, default: 0 },
    right_infinity_bv: { type: Number, default: 0 },
    cumulative_infinity_bv: { type: Number, default: 0 },

    self_pv: { type: Number, default: 0 },
    direct_pv: { type: Number, default: 0 },
    infinity_pv: { type: Number, default: 0 },
    left_infinity_pv: { type: Number, default: 0 },
    right_infinity_pv: { type: Number, default: 0 },
    cumulative_infinity_bv: { type: Number, default: 0 },

    bv: { type: Number, default: 0 },
    sv: { type: Number, default: 0 },
    pv: { type: Number, default: 0 },

    score: { type: Number, default: 0 },
    reward: { type: Number, default: 0 },
    rank: { type: String, required: true, default: "none" },
    club: { type: String, default: "none" },
    activated_date: { type: String },


    // 🌳 Binary Team Structure
    left: { type: String },
    right: { type: String },
    left_users: { type: [String], default: [] },
    right_users: { type: [String], default: [] },
    direct_left_users: { type: [String], default: [] },
    direct_right_users: { type: [String], default: [] },
    direct_left_count: { type: Number, default: 0 },
    direct_right_count: { type: Number, default: 0 },
    infinity_left_users: { type: [String], default: [] },
    infinity_right_users: { type: [String], default: [] },
    infinty_left_count: { type: Number, default: 0 },
    infinty_right_count: { type: Number, default: 0 },
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

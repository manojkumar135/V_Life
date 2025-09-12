import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const TreeNodeSchema = new Schema(
  {
    // 🔑 Basic
    user_id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    dob: { type: String, },
    status: { type: String, default: "active" }, // active, inactive, suspended
    contact: { type: String, },
    mail: { type: String, },
    address: { type: String },
    pincode: { type: String },
    country: { type: String },
    state: { type: String },
    district: { type: String },
    locality: { type: String },


    // 🌳 Binary Placement (using user_id instead of ObjectId)
    parent: { type: String, }, // parent user_id
    left: { type: String, default: null },    // left child user_id
    right: { type: String, default: null },   // right child user_id

    // 👥 Referral Tracking
    referrals: [{ type: String }], // store referred user_ids
    referral_count: { type: Number, default: 0 },

    // 💰 Business Volumes (for Matching Bonus)
    left_volume: { type: Number, default: 0 },
    right_volume: { type: Number, default: 0 },
    carry_forward_left: { type: Number, default: 0 },
    carry_forward_right: { type: Number, default: 0 },

    // 🏅 Leadership Tracking
    isLeader: { type: Boolean, default: false },
    leader_qualifications: { type: Number, default: 0 },
    leaders_left: { type: Number, default: 0 },
    leaders_right: { type: Number, default: 0 },
    carry_forward_leaders_left: { type: Number, default: 0 },
    carry_forward_leaders_right: { type: Number, default: 0 },
  },
  { timestamps: true, collection: "tree_nodes" }
);

export default models.TreeNode || model("TreeNode", TreeNodeSchema);

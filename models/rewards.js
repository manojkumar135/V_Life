import mongoose from "mongoose";

const RewardSchema = new mongoose.Schema({
    reward_id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String },

    type: {
        type: String,
        enum: ["score", "matching"],
        default: "score"
    },

    points_required: { type: Number, },
    matches_required: { type: Number },

    image: { type: String },
    status: { type: String, default: "active" },
    created_by: { type: String, required: true }, // user_id or "admin"
    created_at: { type: Date, default: Date.now },
});

export const Reward = mongoose.models.Reward || mongoose.model("Reward", RewardSchema);
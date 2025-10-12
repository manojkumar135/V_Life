import mongoose from "mongoose";

const RewardSchema = new mongoose.Schema({
    reward_id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String },
    points_required: { type: Number, required: true },
    image: { type: String },
    status: { type: String, default: "active" },
    created_by: { type: String, required: true }, // user_id or "admin"
    created_at: { type: Date, default: Date.now },
});

export const Reward = mongoose.models.Reward || mongoose.model("Reward", RewardSchema);
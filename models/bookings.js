import mongoose from "mongoose";

const BookingSchema = new mongoose.Schema({
    booking_id: { type: String, required: true, unique: true },
    user_id: { type: String, required: true },
    user_name: { type: String, required: true },
    user_email: { type: String, required: true },
    user_contact: { type: String, required: true },
    user_role: { type: String, required: true }, // user or admin
    reward_id: { type: mongoose.Schema.Types.ObjectId, ref: "Reward", required: true },
    reward_title: { type: String, required: true },
    reward_price: { type: Number, required: true },
    tickets: { type: Number, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    total_price: { type: Number, required: true },
    score_used: { type: Number, required: true },
    remaining_score: { type: Number, required: true },
    status: { type: String, default: "pending" },
    booked_at: { type: Date, default: Date.now },
});

export const Booking = mongoose.models.Booking || mongoose.model("Booking", BookingSchema);
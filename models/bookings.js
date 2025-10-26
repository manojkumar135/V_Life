import mongoose from "mongoose";

const RewardItemSchema = new mongoose.Schema(
  {
    reward_id: { type: String, required: true },
    reward_name: { type: String, required: true },
    points_required: { type: Number, required: true },
    count: { type: Number, required: true },
    score_used: { type: Number, required: true },
  },
  { _id: false } // no individual _id for subdocs
);

const BookingSchema = new mongoose.Schema({
  booking_id: { type: String, required: true, unique: true },
  user_id: { type: String, required: true },
  user_name: { type: String, required: true },
  user_email: { type: String, required: true },
  user_contact: { type: String, required: true },
  user_role: { type: String, required: true }, // user or admin
  rank: { type: String }, 
  rewards: {
    type: [RewardItemSchema],
    required: true,
  },
  total_score_used: { type: Number, required: true },
  remaining_score: { type: Number, required: true },
  status: { type: String, default: "pending" },
  date: { type: String, required: true },
  time: { type: String, required: true },
  booked_at: { type: Date, default: Date.now },
});

export const Booking =
  mongoose.models.Booking || mongoose.model("Booking", BookingSchema);

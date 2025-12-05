import mongoose from "mongoose";

const RewardItemSchema = new mongoose.Schema(
  {
    reward_id: { type: String, required: true },
    reward_name: { type: String, required: true },
    type: {
      type: String,
      enum: ["score", "matching"],
      required: true
    },

    points_required: { type: Number, },
    matches_required: { type: Number },

    count: { type: Number, required: true },
    score_used: { type: Number, default: 0 },
    matches_used: { type: Number, default: 0 },

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
  address: { type: String, },
  description: { type: String },
  rewards: {
    type: [RewardItemSchema],
    required: true,
  },
  type:{ type: String, required: true },
  total_score_used: { type: Number, default: 0 },
  remaining_score: { type: Number, default: 0 },

  // MATCHING-based 👉 NEW
  total_matches_used: { type: Number, default: 0 },
  cycleIndex: { type: Number },
  remaining_matches: { type: Number, default: 0 },


  status: { type: String, default: "pending" },
  date: { type: String, required: true },
  time: { type: String, required: true },
  booked_at: { type: Date, default: Date.now },
});

export const Booking =
  mongoose.models.Booking || mongoose.model("Booking", BookingSchema);

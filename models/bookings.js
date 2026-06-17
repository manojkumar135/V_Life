import mongoose from "mongoose";

const RewardItemSchema = new mongoose.Schema(
  {
    reward_id: { type: String, required: true },
    reward_name: { type: String, required: true },
    type: {
      type: String,
      enum: ["score", "matching"],
      required: true,
    },
    points_required: { type: Number },
    matches_required: { type: Number },
    count: { type: Number, required: true },
    score_used: { type: Number, default: 0 },
    matches_used: { type: Number, default: 0 },
  },
  { _id: false }
);

const BookingSchema = new mongoose.Schema({
  booking_id: { type: String, required: true, unique: true },
  user_id: { type: String, required: true },
  user_name: { type: String, required: true },
  user_email: { type: String, required: true },
  user_contact: { type: String, required: true },
  user_role: { type: String, required: true },
  rank: { type: String },

  // ── Structured address fields (NEW) ──────────────────────────────
  door_no: { type: String },
  landmark: { type: String },
  city: { type: String },
  state: { type: String },
  country: { type: String, default: "India" },
  pincode: { type: String },
  // ─────────────────────────────────────────────────────────────────

  address: { type: String },   // full address string (auto-built from above)
  description: { type: String },

  rewards: {
    type: [RewardItemSchema],
    required: true,
  },

  type: { type: String, required: true },
  total_score_used: { type: Number, default: 0 },
  remaining_score: { type: Number, default: 0 },
  total_matches_used: { type: Number, default: 0 },
  cycleIndex: { type: Number },
  remaining_matches: { type: Number, default: 0 },

  status: { type: String, default: "pending" },
  date: { type: String, required: true },
  time: { type: String, required: true },
  booked_at: { type: Date, default: Date.now },

  // ── Shipping / tracking (NEW — mirrors OrderSchema.shipping) ─────
  shipping: {
    tracking_id: { type: String },
    courier_partner: { type: String },
    dispatch_date: { type: String },
    dispatch_time: { type: String },
    estimated_delivery: { type: String },
    delivered_date: { type: String },
    delivered_time: { type: String },
    return_reason: { type: String },
    remarks: { type: String },
    tracking_url: { type: String },
    updated_by: { type: String },
    updated_at: { type: Date },
    // ShipRocket fields
    sr_order_id: { type: String },
    sr_shipment_id: { type: String },
    awb_code: { type: String },
    courier_name: { type: String },
    sr_status: { type: String },
    // Actual shipment address (admin may change from booking address)
    shipment_name: { type: String },
    shipment_phone: { type: String },
    shipment_email: { type: String },
    shipment_address: { type: String },
    shipment_city: { type: String },
    shipment_pincode: { type: String },
    shipment_state: { type: String },
    shipment_country: { type: String },
  },
  // ─────────────────────────────────────────────────────────────────
});

export const Booking =
  mongoose.models.Booking || mongoose.model("Booking", BookingSchema);
import mongoose from "mongoose";

const OfficeSchema = new mongoose.Schema(
  {
    office_name: { type: String, default: "" },
    office_street: { type: String, default: "" },       // D.No & Street
    office_landmark: { type: String, default: "" },
    office_pincode: { type: String, default: "" },
    office_country: { type: String, default: "" },
    office_state: { type: String, default: "" },
    office_city: { type: String, default: "" },
    office_locality: { type: String, default: "" },

    // Extra fields you asked for 👇
    office_gst_number: { type: String, default: "" },
    office_email: { type: String, default: "" },
    office_contact: { type: String, default: "" },
    office_timings: { type: String, default: "" }, // e.g. "10:00 AM - 7:00 PM"

    updated_at: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
    collection: "office",
  }
);

export const Office =
  mongoose.models.Office || mongoose.model("Office", OfficeSchema);

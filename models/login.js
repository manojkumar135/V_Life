import { Club } from "lucide-react";
import mongoose from "mongoose";

// Reusable OrderItemSchema
const OrderItemSchema = new mongoose.Schema(
  {
    product_id: { type: String, required: true },   // product code/id (PRxxxx)
    name: { type: String, required: true },         // product name
    category: { type: String, required: true },     // product category

    quantity: { type: Number, required: true },     // units ordered

    mrp: { type: Number, required: true },          // original price
    dealer_price: { type: Number, required: true }, // dealer price
    unit_price: { type: Number, required: true },   // billed price per unit
    price: { type: Number, required: true },        // total = unit_price * qty

    bv: { type: Number, required: true },           // business volume
    pv: { type: Number, required: true },
    gst: { type: Number, required: true },
    gst_amount: { type: Number },
    whole_gst: { type: Number },
    price_with_gst: { type: Number },
    cgst: { type: Number, required: true },
    sgst: { type: Number, required: true },
    igst: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    hsn_code: { type: String },
    product_code: { type: String },
    description: { type: String },
    image: { type: String },
    id: { type: String },                           // frontend item id (if needed)

    created_at: { type: Date, default: Date.now },
    created_by: { type: String },
    last_modified_by: { type: String },
    last_modified_at: { type: Date },
  },
  { _id: false }
);



const LoginSchema = new mongoose.Schema(
  {
    login_id: { type: String, required: true, unique: true },
    user_id: { type: String, required: true }, // link to User schema
    user_name: { type: String, required: true },
    gender: { type: String },
    dob: { type: String, required: true },
    rank: { type: String, default: "none" },
    Club: { type: String, default: "none" },

    gst: { type: String },
    blood: { type: String },
    landmark: { type: String },
    nominee_name: { type: String },
    nominee_relation: { type: String },
    nominee_dob: { type: String },
    alternate_contact: { type: String },

    role: { type: String },
    role_id: { type: String },
    title: { type: String },
    group: { type: String },
    group_id: { type: String },
    wallet_id: { type: String },
    aadhar: { type: String },
    pan: { type: String },
    first_name: { type: String },
    last_name: { type: String },
    referBy: { type: String },
    infinity: { type: String },
    category: { type: String },
    theme: {
      type: String,
      enum: ["light", "dark", "system"],
      default: "light",
    },

    mail: { type: String, required: true },
    password: { type: String, required: true }, // hashed password
    login_key: { type: String },
    email_otp: { type: String },
    phone_otp: { type: String },
    is_mfa_enabled: { type: String },
    mfa_type: { type: String },
    passkey: { type: String },
    biometric_data: { type: String },
    authenticator_secret: { type: String },

    contact: { type: String, required: true },
    address: { type: String, },
    pincode: { type: String, },
    locality: { type: String },

    sponsor: { type: String },
    logo: { type: String },
    profile: { type: String },
    score: { type: Number, default: 0 },


    // 🛒 Store cart/order items directly with login
    items: [OrderItemSchema],

    intro: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },

    ip_address: { type: String },
    device_info: { type: String },
    login_time: { type: Date, default: Date.now },
    logout_time: { type: Date },
    status: { type: String, },
    status_notes: { type: String, },
    activated_date: { type: String },

    created_at: { type: Date, default: Date.now },
    created_by: { type: String },
    last_modified_by: { type: String },
    last_modified_at: { type: Date },
  },
  {
    timestamps: false,
    collection: "logins",
  }
);

export const Login =
  mongoose.models.Login || mongoose.model("Login", LoginSchema);

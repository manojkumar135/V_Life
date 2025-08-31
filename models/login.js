import mongoose from "mongoose";

// Reusable OrderItemSchema
const OrderItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    product: { type: String, required: true }, // product code/id
    category: { type: String, required: true },
    name: { type: String, required: true }, // product name
    quantity: { type: Number, required: true },
    unit_price: { type: Number, required: true },
    price: { type: Number, required: true }, // total = quantity * unit_price
    description: { type: String },
    image: { type: String },
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
    role: { type: String },
    role_id: { type: String },
    title: { type: String },
    first_name: { type: String },
    last_name: { type: String },
    referBy: { type: String },

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
    address: { type: String,},
    pincode: { type: String,  },
    locality: { type: String },

    sponsor: { type: String },
    logo: { type: String },
    profile: { type: String },

    // 🛒 Store cart/order items directly with login
    items: [OrderItemSchema],

    intro: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },

    ip_address: { type: String },
    device_info: { type: String },
    login_time: { type: Date, default: Date.now },
    logout_time: { type: Date },
    status: {
      type: String,
      enum: ["Active", "Logged Out", "Failed"],
      default: "active",
    },
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

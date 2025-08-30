import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    user_id: { type: String, required: true, unique: true },
    user_name: { type: String, required: true },
    mail: { type: String, required: true },
    contact: { type: String, required: true },
    address: { type: String, required: true },
    pincode: { type: String, required: true },
    country: { type: String, },
    state: { type: String,  },
    district: { type: String,},
    locality: { type: String,  },
    created_at: { type: Date, default: Date.now },
    created_by: { type: String, },
    last_modified_by: { type: String },
    last_modified_at: { type: Date },
    role: { type: String,  },
    profile: { type: String, }, // URL or file path to profile photo
    user_status: { type: String, default: "active" },
  },
  {
    timestamps: false, // not auto — you have custom fields
    collection: "users", // optional: name of the collection
  }
);

export const User =
  mongoose.models.User || mongoose.model("User", UserSchema);

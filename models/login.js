import mongoose from "mongoose";

const LoginSchema = new mongoose.Schema(
    {
        login_id: { type: String, required: true, unique: true },
        user_id: { type: String, required: true }, // link to User schema
        user_name: { type: String, required: true },
        role: { type: String, },
        role_id: { type: String },
        title: { type: String },
        first_name: { type: String },
        last_name: { type: String },
        title: { type: String },



        mail: { type: String, required: true },
        password: { type: String, required: true }, // store hashed password
        login_key: { type: String },
        email_otp: { type: String },
        phone_otp: { type: String },
        is_mfa_enabled: { type: String },
        mfa_type: { type: String },
        passkey: { type: String },
        biometric_data: { type: String },
        authenticator_secret: { type: String },


        contact: { type: String, required: true },
        address: { type: String, required: true },
        pincode: { type: String, required: true },


        sponsor: { type: String }, // sponsor ID or name
        logo: { type: String }, // URL or file path to logo
        profile: { type: String }, // URL or file path to profile photo

        intro: { type: Boolean, default: true },
        isDeleted: { type: Boolean, default: true },


        ip_address: { type: String },
        device_info: { type: String },
        login_time: { type: Date, default: Date.now, },
        logout_time: { type: Date },
        status: { type: String, enum: ["Active", "Logged Out", "Failed"], default: "Active" },
        created_at: { type: Date, default: Date.now },
        created_by: { type: String, },
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

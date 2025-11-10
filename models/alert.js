import mongoose from "mongoose";

const alertSchema = new mongoose.Schema(
    {
        alert_id: { type: String, },

        user_id: { type: String, },
        user_contact: { type: String, },
        user_email: { type: String, },
        user_status: { type: String, },

        // 🔹 Alert Content
        title: { type: String, required: true },
        description: { type: String, required: true },

        // 🔹 Status & Type
        read: { type: Boolean, default: false },
        alert_type: { type: String, enum: ["info", "success", "warning", "error", "system", "custom"], default: "info", },

        // 🔹 Context Metadata
        date: { type: String,}, 
        role: { type: String, required: true },
        link: { type: String, default: "/dashboards", },
        related_id: { type: String }, // e.g., related order, payment, or event ID

        // 🔹 Priority & Delivery
        priority: { type: String, },
        delivered_via: { type: String, },

        // 🔹 System flags
        archived: { type: Boolean, default: false }, // if alert is old or hidden
        deleted: { type: Boolean, default: false },
    },
    { timestamps: true }
);

// Optional index for faster lookups by user_id
alertSchema.index({ user_id: 1, seen: 1, createdAt: -1 });

export const Alert =
    mongoose.models.Alert || mongoose.model("Alert", alertSchema);

import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema(
    {
        product_id: { type: String, required: true, unique: true },
        id: { type: String },
        name: { type: String, required: true },
        description: { type: String },
        mrp: { type: Number, required: true }, // Maximum Retail Price
        dealer_price: { type: Number, required: true }, // Price for dealer/distributor
        bv: { type: Number, required: true }, // Business Volume (used in MLM/commission system)
        image: { type: String }, // Product image URL
        category: { type: String, required: true },
        stock: { type: Number, default: 0 }, // inventory
        status: { type: String, enum: ["active", "inactive"], default: "active" },

        // Optional details
        brand: { type: String },
        sku: { type: String }, // Stock Keeping Unit
        tags: [{ type: String }],

        // Tracking fields
        created_by: { type: String },
        last_modified_by: { type: String },
    },
    {
        timestamps: { createdAt: "created_at", updatedAt: "last_modified_at" },
        collection: "products",
    }
);

export const Product =
    mongoose.models.Product || mongoose.model("Product", ProductSchema);

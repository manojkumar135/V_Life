import mongoose from "mongoose";

const RoleSchema = new mongoose.Schema(
  {
    role_id: { type: String, required: true, unique: true },
    role_name: { type: String, required: true },
    components: { type: [String], default: [] }, // list of component names or IDs
    description: { type: String },
    created_at: { type: Date, default: Date.now },
    created_by: { type: String },
    last_modified_by: { type: String },
    last_modified_at: { type: Date },
  },
  {
    timestamps: false, // manual date fields
    collection: "roles", // collection name
  }
);

export const Role =
  mongoose.models.Role || mongoose.model("Role", RoleSchema);

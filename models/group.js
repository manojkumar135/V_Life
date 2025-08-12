import mongoose from "mongoose";

const GroupSchema = new mongoose.Schema(
  {
    group_id: { type: String, required: true, unique: true },
    group_name: { type: String, required: true },
    roles: { type: [String], default: [] }, // array of role names or IDs
    created_at: { type: Date, default: Date.now },
    created_by: { type: String, },
    last_modified_by: { type: String },
    last_modified_at: { type: Date },
  },
  {
    timestamps: false, // keeping manual date fields like your user schema
    collection: "groups", // collection name
  }
);

export const Group =
  mongoose.models.Group || mongoose.model("Group", GroupSchema);

import mongoose from "mongoose";

const QualifiedUserSchema = new mongoose.Schema(
  {
    user_id: { type: String, required: true, ref: "User" },
    team: { type: String, enum: ["left", "right", "any"], default: "any" },
    payment_id: { type: String },
  },
  { _id: false }
);

const RankSchema = new mongoose.Schema(
  {
    user_id: { type: String, required: true, unique: true, ref: "User" },

    ranks: {
      "1_star": {
        qualified_users: [QualifiedUserSchema],
        achieved_at: { type: Date },
      },
      "2_star": {
        qualified_users: [QualifiedUserSchema],
        achieved_at: { type: Date },
      },
      "3_star": {
        qualified_users: [QualifiedUserSchema],
        achieved_at: { type: Date },
      },
      "4_star": {
        qualified_users: [QualifiedUserSchema],
        achieved_at: { type: Date },
      },
      "5_star": {
        qualified_users: [QualifiedUserSchema],
        achieved_at: { type: Date },
      },
    },
  },
  {
    timestamps: true,
    collection: "ranks",
  }
);

export const Rank =
  mongoose.models.Rank || mongoose.model("Rank", RankSchema);

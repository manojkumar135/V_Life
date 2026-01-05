import mongoose from "mongoose";

const NewPopSchema = new mongoose.Schema(
  {
    news_text: {
      type: String,
      // trim: true,
    },
    popup_image: {
      type: String,
      trim: true,
    },
    popup_enabled: {
      type: Boolean,
      default: true,
    },
    updated_by: {
      type: String,
    },
    updated_at: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.models.NewPop ||
  mongoose.model("NewPop", NewPopSchema);

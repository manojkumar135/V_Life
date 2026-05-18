import mongoose from "mongoose";

/**
 * PairStarConfig
 * One document per tier name — stores admin-editable values.
 * Tier names are fixed and match PAIR_STAR_TIER_NAMES in constants/pairStar.ts.
 * Admin can edit: pairs, direct_pv, reward per tier.
 *
 * Global settings (start_date) stored in a special document: { tier_name: "__global__" }
 * This single start_date applies to ALL tiers and ALL users.
 */
const PairStarConfigSchema = new mongoose.Schema(
  {
    tier_name:  { type: String, required: true, unique: true },
    pairs:      { type: Number },
    direct_pv:  { type: Number },
    reward:     { type: String },
    start_date: { type: String, default: null },
    reward_amount: { type: Number, default: 0 },
    updated_by: { type: String, default: "admin" },
    updated_at: { type: Date, default: Date.now },
  },
  { collection: "pair_star_config" },
);

export const PairStarConfig =
  mongoose.models.PairStarConfig ||
  mongoose.model("PairStarConfig", PairStarConfigSchema);
//constant/pairStar.ts

export const PAIR_STAR_TIERS = [
  { name: "STAR",                pairs: 5,         directPV: 100,  reward: "₹2,500" },
  { name: "SILVER STAR",         pairs: 20,        directPV: 200,  reward: "₹5,000" },
  { name: "GOLD STAR",           pairs: 50,        directPV: 300,  reward: "₹7,500" },
  { name: "PLATINUM STAR",       pairs: 100,       directPV: 400,  reward: "₹20,000" },
  { name: "RUBY EXECUTIVE",      pairs: 200,       directPV: 500,  reward: "₹30,000" },
  { name: "PEARL EXECUTIVE",     pairs: 400,       directPV: 500,  reward: "₹50,000" },
  { name: "SAPHIRE EXECUTIVE",   pairs: 1000,      directPV: 500,  reward: "₹1,00,000 " },
  { name: "EMERALD EXECUTIVE",   pairs: 3000,      directPV: 500,  reward: "₹5,00,000 " },
  { name: "DIAMOND",             pairs: 8000,      directPV: 500,  reward: "₹15,00,000 " },
  { name: "BLUE DIAMOND",        pairs: 20000,     directPV: 500,  reward: "₹25,00,000 " },
  { name: "BLACK DIAMOND",       pairs: 50000,     directPV: 500,  reward: "₹75,00,000 " },
  { name: "CROWN DIAMOND",       pairs: 250000,    directPV: 500,  reward: "₹4 Crore " },
  { name: "AMBASSADOR",          pairs: 750000,    directPV: 500,  reward: "₹15 Crore" },
  { name: "CROWN AMBASSADOR",    pairs: 1500000,   directPV: 500,  reward: "₹30 Crore" },
  { name: "MAVERICK AMBASSADOR", pairs: 3000000,   directPV: 500,  reward: "₹50 Crore" },
] as const;

export type PairStarTierName = typeof PAIR_STAR_TIERS[number]["name"];

// Fixed names in order — admin cannot change these
export const PAIR_STAR_TIER_NAMES = PAIR_STAR_TIERS.map(t => t.name);
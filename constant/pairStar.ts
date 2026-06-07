//constant/pairStar.ts

export const PAIR_STAR_TIERS = [
  { name: "BRONZE STAR",         pairs: 5,         directPV: 100,  reward: "₹2,500",rewardAmount: 2500 },
  { name: "SILVER STAR",         pairs: 20,        directPV: 100,  reward: "₹5,000",rewardAmount: 5000 },
  { name: "GOLD STAR",           pairs: 50,        directPV: 100,  reward: "₹7,500",rewardAmount: 7500 },
  { name: "PLATINUM STAR",       pairs: 100,       directPV: 100,  reward: "₹20,000",rewardAmount: 20000 },
  { name: "RUBY EXECUTIVE",      pairs: 200,       directPV: 100,  reward: "₹30,000",rewardAmount: 30000 },
  { name: "PEARL EXECUTIVE",     pairs: 400,       directPV: 100,  reward: "₹50,000",rewardAmount: 50000 },
  { name: "SAPHIRE EXECUTIVE",   pairs: 1000,      directPV: 100,  reward: "₹1,00,000 " ,rewardAmount: 100000},
  { name: "EMERALD EXECUTIVE",   pairs: 3000,      directPV: 100,  reward: "₹5,00,000 ",rewardAmount: 500000 },
  { name: "DIAMOND",             pairs: 8000,      directPV: 100,  reward: "₹15,00,000 ",rewardAmount: 1500000 },
  { name: "BLUE DIAMOND",        pairs: 20000,     directPV: 100,  reward: "₹25,00,000 ", rewardAmount: 2500000},
  { name: "BLACK DIAMOND",       pairs: 50000,     directPV: 100,  reward: "₹75,00,000 ",rewardAmount: 7500000 },
  { name: "CROWN DIAMOND",       pairs: 250000,    directPV: 100,  reward: "₹4 Crore " ,rewardAmount: 40000000},
  { name: "AMBASSADOR",          pairs: 750000,    directPV: 100,  reward: "₹15 Crore" ,rewardAmount: 150000000},
  { name: "CROWN AMBASSADOR",    pairs: 1500000,   directPV: 100,  reward: "₹30 Crore" ,rewardAmount: 300000000},
  { name: "MAVERICK AMBASSADOR", pairs: 3000000,   directPV: 100,  reward: "₹50 Crore" ,rewardAmount: 500000000},
] as const;

export type PairStarTierName = typeof PAIR_STAR_TIERS[number]["name"];

// Fixed names in order — admin cannot change these
export const PAIR_STAR_TIER_NAMES = PAIR_STAR_TIERS.map(t => t.name);
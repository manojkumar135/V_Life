import { PairStarConfig } from "@/models/pairStarConfig";
import { PAIR_STAR_TIERS, PAIR_STAR_TIER_NAMES } from "@/constant/pairStar";
import { connectDB } from "@/lib/mongodb";

export type TierConfig = {
  tier_name:  string;
  pairs:      number;
  direct_pv:  number;
  reward:     string;
};

export type GlobalConfig = {
  start_date: string | null; // "DD-MM-YYYY" — applies to ALL tiers and ALL users
};

let cachedTiers: TierConfig[] | null = null;
let cachedGlobal: GlobalConfig | null = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 60 * 1000;

// Load tier values (pairs, direct_pv, reward) from DB — admin-editable
export async function loadTierConfig(): Promise<TierConfig[]> {
  const now = Date.now();
  if (cachedTiers && now < cacheExpiry) return cachedTiers;

  await connectDB();

  const dbRecords = await PairStarConfig.find(
    { tier_name: { $in: PAIR_STAR_TIER_NAMES } },
  ).lean() as any[];

  const dbMap = new Map<string, any>();
  for (const r of dbRecords) dbMap.set(r.tier_name, r);

  const config: TierConfig[] = PAIR_STAR_TIERS.map((t) => {
    const db = dbMap.get(t.name);
    return {
      tier_name: t.name,
      pairs:     db?.pairs     ?? t.pairs,
      direct_pv: db?.direct_pv ?? t.directPV,
      reward:    db?.reward    ?? t.reward,
    };
  });

  cachedTiers = config;
  cacheExpiry = now + CACHE_TTL_MS;

  return config;
}

// Load global config (start_date) from the __global__ document
export async function loadGlobalConfig(): Promise<GlobalConfig> {
  const now = Date.now();
  if (cachedGlobal && now < cacheExpiry) return cachedGlobal;

  await connectDB();

  const global = await PairStarConfig.findOne({ tier_name: "__global__" }).lean() as any;
  const config: GlobalConfig = {
    start_date: global?.start_date ?? null,
  };

  cachedGlobal = config;

  return config;
}

export function clearTierConfigCache() {
  cachedTiers = null;
  cachedGlobal = null;
  cacheExpiry = 0;
}
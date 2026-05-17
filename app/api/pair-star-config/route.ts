/**
 * GET  /api/pair-star-config          → get all tier config + global start_date
 * PUT  /api/pair-star-config          → admin saves tier values OR global start_date
 * POST /api/pair-star-config          → seed DB with default values (run once)
 *
 * PUT body for tier:   { tier_name, pairs, direct_pv, reward }
 * PUT body for global: { tier_name: "__global__", start_date }
 */

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { PairStarConfig } from "@/models/pairStarConfig";
import { PAIR_STAR_TIERS, PAIR_STAR_TIER_NAMES } from "@/constant/pairStar";
import { clearTierConfigCache } from "@/services/pairStarConfig";
import { requireAdmin } from "@/lib/requireAdmin";

function parseDDMMYYYY(str: string): Date | null {
  if (!str) return null;
  const parts = str.split("-");
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts;
  return new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`);
}

// ── GET — no auth needed ──────────────────────────────────────────────────────
export async function GET() {
  try {
    await connectDB();

    const dbRecords = await PairStarConfig.find({}).lean() as any[];

    const dbMap = new Map<string, any>();
    for (const r of dbRecords) dbMap.set(r.tier_name, r);

    // Global start date
    const globalDoc = dbMap.get("__global__");
    const start_date = globalDoc?.start_date ?? null;

    // Tier values
    const tiers = PAIR_STAR_TIERS.map((t) => {
      const db = dbMap.get(t.name);
      return {
        tier_name:  t.name,
        pairs:      db?.pairs     ?? t.pairs,
        direct_pv:  db?.direct_pv ?? t.directPV,
        reward:     db?.reward    ?? t.reward,
        updated_by: db?.updated_by ?? null,
        updated_at: db?.updated_at ?? null,
      };
    });

    return NextResponse.json({ success: true, data: { tiers, start_date } });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// ── PUT — admin saves values ──────────────────────────────────────────────────
export async function PUT(req: Request) {
  const auth = requireAdmin(req);
  if ("error" in auth) return auth.error;

  try {
    await connectDB();
    const body = await req.json();
    const updates = Array.isArray(body) ? body : [body];

    for (const update of updates) {
      const { tier_name } = update;

      // ── Global start_date update ─────────────────────────────────────────
      if (tier_name === "__global__") {
        const { start_date } = update;

        if (start_date) {
          const parsed = parseDDMMYYYY(start_date);
          if (!parsed) {
            return NextResponse.json(
              { success: false, message: "Invalid start_date format. Use DD-MM-YYYY" },
              { status: 400 },
            );
          }
          if (parsed > new Date()) {
            return NextResponse.json(
              { success: false, message: "Start date cannot be in the future" },
              { status: 400 },
            );
          }
        }

        await PairStarConfig.findOneAndUpdate(
          { tier_name: "__global__" },
          {
            $set: {
              start_date: start_date || null,
              updated_by: auth.decoded._id,
              updated_at: new Date(),
            },
          },
          { upsert: true, new: true },
        );
        continue;
      }

      // ── Tier values update ───────────────────────────────────────────────
      if (!PAIR_STAR_TIER_NAMES.includes(tier_name)) {
        return NextResponse.json(
          { success: false, message: `Invalid tier name: ${tier_name}` },
          { status: 400 },
        );
      }

      const { pairs, direct_pv, reward } = update;
      const setFields: any = {
        updated_by: auth.decoded._id,
        updated_at: new Date(),
      };
      if (pairs !== undefined)     setFields.pairs     = Number(pairs);
      if (direct_pv !== undefined) setFields.direct_pv = Number(direct_pv);
      if (reward !== undefined)    setFields.reward    = reward;

      await PairStarConfig.findOneAndUpdate(
        { tier_name },
        { $set: setFields },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    }

    clearTierConfigCache();

    return NextResponse.json({ success: true, message: "Config updated successfully" });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// ── POST — seed DB with defaults ──────────────────────────────────────────────
export async function POST(req: Request) {
  const auth = requireAdmin(req);
  if ("error" in auth) return auth.error;

  try {
    await connectDB();

    const tierOps = PAIR_STAR_TIERS.map((t) => ({
      updateOne: {
        filter: { tier_name: t.name },
        update: {
          $setOnInsert: {
            tier_name:  t.name,
            pairs:      t.pairs,
            direct_pv:  t.directPV,
            reward:     t.reward,
            updated_by: auth.decoded._id,
            updated_at: new Date(),
          },
        },
        upsert: true,
      },
    }));

    // Also seed global doc if not exists
    const globalOp = {
      updateOne: {
        filter: { tier_name: "__global__" },
        update: {
          $setOnInsert: {
            tier_name:  "__global__",
            start_date: null,
            updated_by: auth.decoded._id,
            updated_at: new Date(),
          },
        },
        upsert: true,
      },
    };

    await PairStarConfig.bulkWrite([...tierOps, globalOp]);
    clearTierConfigCache();

    return NextResponse.json({ success: true, message: "Seeded with default values" });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
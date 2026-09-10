import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/user";
import TreeNode from "@/models/tree";
import { istStringsToUTCDate } from "@/utils/server/getISTDateTime";
import { loadTierConfig } from "@/services/pairStarConfig";

type DateRange = {
  from: Date | null;
  to: Date | null;
};

type UserRecord = {
  user_id: string;
  user_name?: string;
  self_pv?: number;
  referBy?: string;
  activated_date?: string;
  activated_time?: string;
  pair_star?: string | null;
  pair_star_released_tiers?: Array<{
    tier_name?: string;
  }>;
};

function parseApiDate(value: string, addDay = false): Date {
  const date = new Date(`${value}T00:00:00.000Z`);

  if (addDay) {
    date.setUTCDate(date.getUTCDate() + 1);
  }

  return date;
}

function collectSideIds(
  startId: string | null | undefined,
  nodeMap: Map<string, any>,
): string[] {
  if (!startId) return [];

  const ids: string[] = [];
  const queue = [startId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const currentId = queue.shift()!;

    if (visited.has(currentId)) continue;
    visited.add(currentId);
    ids.push(currentId);

    const node = nodeMap.get(currentId);

    if (node?.left) queue.push(node.left);
    if (node?.right) queue.push(node.right);
  }

  return ids;
}

function getActivationDate(user: UserRecord): Date | null {
  return istStringsToUTCDate(
    user.activated_date,
    user.activated_time,
  );
}

function isUserEligibleForSidePV(
  user: UserRecord,
  dateRange: DateRange,
): boolean {
  const activatedAt = getActivationDate(user);

  if (!activatedAt) return false;

  if (dateRange.from && activatedAt < dateRange.from) {
    return false;
  }

  if (dateRange.to && activatedAt >= dateRange.to) {
    return false;
  }

  return true;
}

function normalizeTierName(name?: string | null): string | null {
  if (!name) return null;

  return String(name)
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function resolveCurrentPairStar(
  pairs: number,
  directLeftPV: number,
  directRightPV: number,
  tiers: any[],
): string | null {
  const minimumDirectPV = Math.min(directLeftPV, directRightPV);

  if (minimumDirectPV < 100) {
    return null;
  }

  let current = "STAR";

  for (const tier of tiers) {
    const requiredPairs = Number(tier.pairs);
    const requiredDirectPV = Number(tier.direct_pv);

    if (
      pairs >= requiredPairs &&
      directLeftPV >= requiredDirectPV &&
      directRightPV >= requiredDirectPV
    ) {
      current = String(tier.tier_name)
        .replace(/_/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .toUpperCase();
    }
  }

  return current;
}

export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);

    const search = searchParams.get("search")?.trim() || "";
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const countParam = searchParams.get("count");
    const minCount =
      countParam !== null && countParam !== "" ? Number(countParam) : null;

    const dateRange: DateRange = {
      from: from ? parseApiDate(from) : null,
      to: to ? parseApiDate(to, true) : null,
    };

    const ownerQuery: any = {
      user_status: { $regex: /^active$/i },
    };

    const tierConfig = await loadTierConfig();
    const sortedTiers = [...tierConfig].sort((a, b) => a.pairs - b.pairs);

    const [owners, activeUsers, treeNodes] = await Promise.all([
      User.find(ownerQuery)
        .select(
          "user_id user_name self_pv activated_date activated_time pair_star pair_star_released_tiers",
        )
        .lean(),

      User.find({ user_status: { $regex: /^active$/i } })
        .select(
          "user_id user_name self_pv referBy activated_date activated_time",
        )
        .lean(),

      TreeNode.find({}).select("user_id left right").lean(),
    ]);

    const nodeMap = new Map(treeNodes.map((node: any) => [node.user_id, node]));
    const userMap = new Map(
      activeUsers.map((user: any) => [user.user_id, user]),
    );

    const data = owners.map((owner: any) => {
      const rootNode = nodeMap.get(owner.user_id);

      const leftIds = collectSideIds(rootNode?.left, nodeMap);
      const rightIds = collectSideIds(rootNode?.right, nodeMap);

      const leftUsers = leftIds
        .map((id) => userMap.get(id))
        .filter(Boolean) as UserRecord[];

      const rightUsers = rightIds
        .map((id) => userMap.get(id))
        .filter(Boolean) as UserRecord[];

      const leftPV = leftUsers
        .filter((user) => isUserEligibleForSidePV(user, dateRange))
        .reduce((total, user) => total + Number(user.self_pv || 0), 0);

      const rightPV = rightUsers
        .filter((user) => isUserEligibleForSidePV(user, dateRange))
        .reduce((total, user) => total + Number(user.self_pv || 0), 0);

      const directLeftPV = leftUsers
        .filter((user) => user.referBy === owner.user_id)
        .reduce((total, user) => total + Number(user.self_pv || 0), 0);

      const directRightPV = rightUsers
        .filter((user) => user.referBy === owner.user_id)
        .reduce((total, user) => total + Number(user.self_pv || 0), 0);

      const pairs = Math.floor(Math.min(leftPV, rightPV) / 100);

      const currentPairStar = resolveCurrentPairStar(
        pairs,
        directLeftPV,
        directRightPV,
        sortedTiers,
      );

      const lastReleasedTier =
        owner.pair_star_released_tiers &&
        owner.pair_star_released_tiers.length > 0
          ? owner.pair_star_released_tiers[
              owner.pair_star_released_tiers.length - 1
            ]?.tier_name ?? null
          : owner.pair_star ?? null;

      const displayPairStar =
        normalizeTierName(lastReleasedTier) ??
        normalizeTierName(currentPairStar) ??
        null;

      return {
        user_id: owner.user_id,
        user_name: owner.user_name || "—",
        own_pv: Number(owner.self_pv || 0),
        left_pv: leftPV,
        right_pv: rightPV,
        direct_left_pv: directLeftPV,
        direct_right_pv: directRightPV,
        count: pairs,
        current_pair_star: currentPairStar,
        display_pair_star: displayPairStar,
      };
    });

    const searchLower = search.toLowerCase();

    let filteredData = data;

    if (search) {
      filteredData = data.filter((row) => {
        return (
          row.user_id?.toLowerCase().includes(searchLower) ||
          row.user_name?.toLowerCase().includes(searchLower) ||
          row.display_pair_star?.toLowerCase().includes(searchLower) ||
          row.current_pair_star?.toLowerCase().includes(searchLower)
        );
      });
    }

    if (minCount !== null) {
      filteredData = filteredData.filter((row) => row.count >= minCount);
    }

    return NextResponse.json({
      success: true,
      data: filteredData,
    });
  } catch (error: any) {
    console.error("Admin pair PV error:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to load pair PV data",
      },
      { status: 500 },
    );
  }
}
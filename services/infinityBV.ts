import { User } from "@/models/user";
import { loadTreeMap, getUserTeamFromMap } from "@/services/getTeam";

/**
 * Returns left & right infinity BV for a user
 * Based on infinity_users (all levels) + binary team position
 */
export const getInfinityBV = async (userId: string) => {
  // 1️⃣ Fetch user with infinity_users
  const user = await User.findOne({ user_id: userId })
    .select("infinity_users")
    .lean() as any;

  if (!user) {
    throw new Error("User not found");
  }

  const infinityLevels = user.infinity_users ?? [];

  // 2️⃣ Collect all infinity user IDs from all levels
  const allInfinityIds: string[] = infinityLevels.flatMap(
    (level: any) => level.users ?? []
  );

  if (!allInfinityIds.length) {
    return {
      leftInfinityBV: 0,
      rightInfinityBV: 0,
      totalInfinityBV: 0,
    };
  }

  // 3️⃣ Fetch all infinity users with BV
  const infinityUsers = await User.find(
    { user_id: { $in: allInfinityIds } },
    { user_id: 1, bv: 1 }
  ).lean();

  if (!infinityUsers.length) {
    return {
      leftInfinityBV: 0,
      rightInfinityBV: 0,
      totalInfinityBV: 0,
    };
  }

  // 4️⃣ Load tree ONCE
  const nodeMap = await loadTreeMap();

  let leftInfinityBV = 0;
  let rightInfinityBV = 0;

  // 5️⃣ Determine team for each infinity user
  for (const member of infinityUsers) {
    const team = getUserTeamFromMap(
      userId,
      member.user_id,
      nodeMap
    );

    if (team === "left") {
      leftInfinityBV += member.bv ?? 0;
    } else if (team === "right") {
      rightInfinityBV += member.bv ?? 0;
    }
  }

  return {
    leftInfinityBV,
    rightInfinityBV,
    totalInfinityBV: leftInfinityBV + rightInfinityBV,
  };
};

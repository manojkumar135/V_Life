import { User } from "@/models/user";
import { loadTreeMap, getUserTeamFromMap } from "@/services/getTeam";

/**
 * Calculate Direct Left & Right PV
 * Based on paid_directs + binary team position
 */
export const getDirectPV = async (userId: string) => {
  // 1️⃣ Fetch user with paid_directs
  const user = await User.findOne({ user_id: userId })
    .select("paid_directs")
    .lean() as any;

  if (!user) {
    throw new Error("User not found");
  }

  const paidDirectIds: string[] = user.paid_directs ?? [];

  // If no directs
  if (!paidDirectIds.length) {
    console.log("passing zeros");
    return {
      leftDirectPV: 0,
      rightDirectPV: 0,
      totalDirectPV: 0,
    };
  }

  // 2️⃣ Fetch direct users PV
  const directUsers = await User.find(
    { user_id: { $in: paidDirectIds } },
    { user_id: 1, pv: 1 }
  ).lean();

  if (!directUsers.length) {
    return {
      leftDirectPV: 0,
      rightDirectPV: 0,
      totalDirectPV: 0,
    };
  }

  // 3️⃣ Load full tree ONCE
  const nodeMap = await loadTreeMap();

  let leftDirectPV = 0;
  let rightDirectPV = 0;

  // 4️⃣ Determine team and sum PV
  for (const direct of directUsers) {
    const team = getUserTeamFromMap(
      userId,
      direct.user_id,
      nodeMap
    );

    if (team === "left") {
      leftDirectPV += direct.pv ?? 0;
    } else if (team === "right") {
      rightDirectPV += direct.pv ?? 0;
    }
  }

  console.log(
    leftDirectPV,
    rightDirectPV,
    leftDirectPV + rightDirectPV,
    "directPv"
  );

  return {
    leftDirectPV,
    rightDirectPV,
    totalDirectPV: leftDirectPV + rightDirectPV,
  };
};

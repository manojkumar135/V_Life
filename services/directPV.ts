import { User } from "@/models/user";

/**
 * Calculate Direct Left & Right PV
 */
export const getDirectPV = async (userId: string) => {
  // 1️⃣ Fetch parent user
  const user = (await User.findOne({ user_id: userId })
    .select("direct_left_users direct_right_users")
    .lean()) as any;

  if (!user) {
    throw new Error("User not found");
  }

  const leftIds = user.direct_left_users ?? [];
  const rightIds = user.direct_right_users ?? [];

  if (!leftIds.length && !rightIds.length) {
    return {
      leftDirectPV: 0,
      rightDirectPV: 0,
      totalDirectPV: 0,
    };
  }

  // 2️⃣ Fetch PV values
  const [leftUsers, rightUsers] = await Promise.all([
    User.find({ user_id: { $in: leftIds } }, { pv: 1 }).lean(),
    User.find({ user_id: { $in: rightIds } }, { pv: 1 }).lean(),
  ]);

  // 3️⃣ Sum PV
  const leftDirectPV = leftUsers.reduce(
    (sum, u) => sum + (u.pv ?? 0),
    0
  );

  const rightDirectPV = rightUsers.reduce(
    (sum, u) => sum + (u.pv ?? 0),
    0
  );

  return {
    leftDirectPV,
    rightDirectPV,
    totalDirectPV: leftDirectPV + rightDirectPV,
  };
};

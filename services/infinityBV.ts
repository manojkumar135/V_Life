import { User } from "@/models/user";

/**
 * Returns left & right infinity BV for a user
 */
export const getInfinityBV = async (userId: string) => {
  // 1️⃣ Get parent user
  const user = (await User.findOne({ user_id: userId })
    .select("infinity_left_users infinity_right_users")
    .lean()) as any

  if (!user) {
    throw new Error("User not found");
  }

  const leftIds = user.infinity_left_users ?? [];
  const rightIds = user.infinity_right_users ?? [];

  if (!leftIds.length && !rightIds.length) {
    return {
      leftInfinityBV: 0,
      rightInfinityBV: 0,
      totalInfinityBV: 0,
    };
  }

  // 2️⃣ Fetch only BV
  const [leftUsers, rightUsers] = await Promise.all([
    User.find({ user_id: { $in: leftIds } }, { bv: 1 }).lean(),
    User.find({ user_id: { $in: rightIds } }, { bv: 1 }).lean(),
  ]);

  // 3️⃣ Sum
  const leftInfinityBV = leftUsers.reduce(
    (sum, u) => sum + (u.bv ?? 0),
    0
  );

  const rightInfinityBV = rightUsers.reduce(
    (sum, u) => sum + (u.bv ?? 0),
    0
  );

  return {
    leftInfinityBV,
    rightInfinityBV,
    totalInfinityBV: leftInfinityBV + rightInfinityBV,
  };
};

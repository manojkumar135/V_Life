import { User } from "@/models/user";

/**
 * Add referral to a user's Infinity team at a given level
 */
export async function addToInfinityTeam(
  userId: string,
  newReferralId: string,
  level = 1
) {
  if (!userId) return;
  const user = await User.findOne({ user_id: userId });
  if (!user) return;

  const existingLevel = user.infinity_users.find(
    (lvl: { level: number; users: string[] }) => lvl.level === level
  );

  if (existingLevel) {
    if (!existingLevel.users.includes(newReferralId)) {
      existingLevel.users.push(newReferralId);
    }
  } else {
    user.infinity_users.push({ level, users: [newReferralId] });
  }

  await user.save();
}

/**
 * Recursive logic: process odd referrals → take their even children → place in Infinity team
 */
export async function processInfinityLevels(
  ownerId: string, // the Infinity team owner (the base user, e.g. B)
  currentId: string, // the odd referral we’re checking
  level: number // current Infinity level
) {
  const current = await User.findOne({ user_id: currentId });
  if (
    !current ||
    !current.referred_users ||
    current.referred_users.length === 0
  )
    return;

  // Even referrals of this odd go to owner's next level
  for (let i = 0; i < current.referred_users.length; i++) {
    const childId = current.referred_users[i];

    if ((i + 1) % 2 === 0) {
      await addToInfinityTeam(ownerId, childId, level);

      // Recursive: even’s even referrals → deeper level
      await processInfinityLevels(ownerId, childId, level + 1);
    }
  }
}

/**
 * Build Infinity Team for a given user
 */
export async function updateInfinityTeam(userId: string) {
  const user = await User.findOne({ user_id: userId });
  if (!user || !user.referred_users || user.referred_users.length === 0) return;

  // Reset infinity structure
  user.infinity_users = [];
  await user.save();

  // Step 1: Direct referrals → odd ones go to Level 1, even ones to sponsor’s Infinity
  for (let i = 0; i < user.referred_users.length; i++) {
    const childId = user.referred_users[i];

    if ((i + 1) % 2 === 1) {
      // Odd referral → goes to this user’s Infinity Level 1
      await addToInfinityTeam(userId, childId, 1);

      // Process this odd’s even children → go to Level 2+
      await processInfinityLevels(userId, childId, 2);
    } else {
      // Even referral → only add to sponsor if referBy exists
      if (user.referBy) {
        await addToInfinityTeam(user.referBy, childId, 1);
      }
      // Else: skip adding even referral
    }
  }
}

/**
 * Rebuild Infinity for all users
 */
export async function rebuildInfinity() {
  const users = await User.find({ referred_users: { $exists: true, $ne: [] } });
  for (const u of users) {
    u.infinity_users = [];
    await u.save();
    await updateInfinityTeam(u.user_id);
  }
}

/**
 * Update all ancestor Infinity teams recursively
 */
export async function propagateInfinityUpdateToAncestors(startUserId: string) {
  let current = await User.findOne({ user_id: startUserId });
  if (!current) return;

  let ancestorId = current.referBy;
  while (ancestorId) {
    const ancestor = await User.findOne({ user_id: ancestorId });
    if (!ancestor) break;

    await updateInfinityTeam(ancestor.user_id);
    ancestorId = ancestor.referBy;
  }
}

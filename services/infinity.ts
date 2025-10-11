import { User } from "@/models/user";

/**
 * ➕ Add referral to a user's Infinity team at a given level
 * and update the referral’s `infinity` sponsor field.
 */
export async function addToInfinityTeam(
  userId: string,
  newReferralId: string,
  level = 1
) {
  if (!userId || !newReferralId) return;

  const user = await User.findOne({ user_id: userId });
  if (!user) return;

  // Find if this level already exists in the Infinity structure
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

  // 🧠 Update the added referral’s own Infinity sponsor field
  const referral = await User.findOne({ user_id: newReferralId });
  if (referral) {
    referral.infinity = userId; // means newReferralId is under userId's Infinity
    await referral.save();
  }

  // 🔁 Also ensure the new referral's own Infinity team stays updated
  await updateInfinityTeam(newReferralId);
}

/**
 * ♻️ Recursive logic:
 * For each odd referral → take its even children → place in owner's next Infinity level.
 */
export async function processInfinityLevels(
  ownerId: string, // the Infinity team owner (the base user)
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

  // Even referrals of this odd referral go to owner's next level
  for (let i = 0; i < current.referred_users.length; i++) {
    const childId = current.referred_users[i];

    if ((i + 1) % 2 === 0) {
      await addToInfinityTeam(ownerId, childId, level);

      // Recursively process even's even children → deeper levels
      await processInfinityLevels(ownerId, childId, level + 1);
    }
  }
}

/**
 * 🏗️ Build / Update Infinity Team for a given user
 * Ensures all infinity relationships and levels are reconstructed properly.
 */
export async function updateInfinityTeam(userId: string) {
  const user = await User.findOne({ user_id: userId });
  if (!user) return;

  // Reset infinity structure
  user.infinity_users = [];
  await user.save();

  // No referrals → nothing to process
  if (!user.referred_users || user.referred_users.length === 0) return;

  // 🚨 No sponsor (root user)
  if (!user.referBy) {
    // All referrals go directly to this user's Level 1
    for (const childId of user.referred_users) {
      await addToInfinityTeam(userId, childId, 1);

      // Recursively process deeper levels
      await processInfinityLevels(userId, childId, 2);
    }
  } else {
    // ✅ Has sponsor → odd/even split logic
    for (let i = 0; i < user.referred_users.length; i++) {
      const childId = user.referred_users[i];

      if ((i + 1) % 2 === 1) {
        // Odd referral → goes to this user's Infinity Level 1
        await addToInfinityTeam(userId, childId, 1);
        await processInfinityLevels(userId, childId, 2);
      } else {
        // Even referral → goes to sponsor’s Infinity Level 1
        await addToInfinityTeam(user.referBy, childId, 1);
      }
    }
  }

  // 🪜 After building user’s Infinity, propagate updates upward
  await propagateInfinityUpdateToAncestors(userId);
}

/**
 * 🔄 Rebuild Infinity for all users (maintenance / full sync)
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
 * ⤴️ Update all ancestor Infinity teams recursively
 * e.g. if B’s Infinity changes → update A (sponsor) → and A’s sponsor → and so on.
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

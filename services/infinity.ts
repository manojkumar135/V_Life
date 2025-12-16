import { User } from "@/models/user";
import { Login } from "@/models/login";
import TreeNode from "@/models/tree";

/**
 * Helper: normalize id
 */
function idStr(v: any) {
  return String(v ?? "");
}

/**
 * Returns the infinity level of `childId` under `ownerId` by walking upward
 * through the binary tree using TreeNode.parent links.
 *
 * Level starts at 1 (direct paid direct = Level 1)
 * AUTO fallback: if not found → returns 1
 */
export async function getInfinityLevel(ownerId: string, childId: string) {
  let level = 1;
  let current: any = await TreeNode.findOne({ user_id: childId }).lean().exec();

  if (!current) return 1;

  while (current && current.parent) {
    if (current.parent === ownerId) return level;
    level++;
    current = await TreeNode.findOne({ user_id: current.parent }).lean().exec();
  }

  return 1;
}

/**
 * Determine whether `newReferralId` is in owner's LEFT or RIGHT subtree using TreeNode.
 * Returns: "left" | "right" | null
 */
export async function detectInfinitySide(
  ownerId: string,
  newReferralId: string
) {
  const ownerNode: any = await TreeNode.findOne({ user_id: ownerId })
    .lean()
    .exec();
  let current: any = await TreeNode.findOne({ user_id: newReferralId })
    .lean()
    .exec();

  if (!current || !ownerNode) return null;

  while (current && current.parent) {
    if (current.parent === ownerId) {
      const directChildId = current.user_id;
      if (ownerNode.left === directChildId) return "left";
      if (ownerNode.right === directChildId) return "right";
      return null;
    }
    current = await TreeNode.findOne({ user_id: current.parent }).lean().exec();
  }

  return null;
}

/**
 * Update owner's infinity_left_users / infinity_right_users arrays and counts.
 */
export async function updateInfinitySideCount(
  ownerId: string,
  newReferralId: string
) {
  try {
    let side = await detectInfinitySide(ownerId, newReferralId);
    if (!side) side = "left";

    if (side === "left") {
      await User.updateOne(
        { user_id: ownerId },
        { $addToSet: { infinity_left_users: newReferralId } }
      ).exec();
    } else {
      await User.updateOne(
        { user_id: ownerId },
        { $addToSet: { infinity_right_users: newReferralId } }
      ).exec();
    }

    const ownerRaw: any = await User.findOne({ user_id: ownerId })
      .lean()
      .exec();
    const leftCount = Array.isArray(ownerRaw?.infinity_left_users)
      ? ownerRaw.infinity_left_users.length
      : 0;
    const rightCount = Array.isArray(ownerRaw?.infinity_right_users)
      ? ownerRaw.infinity_right_users.length
      : 0;

    await User.updateOne(
      { user_id: ownerId },
      {
        $set: {
          infinty_left_count: leftCount,
          infinty_right_count: rightCount,
        },
      }
    ).exec();
  } catch (err) {
    console.error("updateInfinitySideCount error:", err);
  }
}

/**
 * Keep infinity_referred_count in sync with infinity_referred_users length
 */
export async function updateInfinityReferredCount(ownerId: string) {
  try {
    const ownerRaw: any = await User.findOne({ user_id: ownerId })
      .lean()
      .exec();
    const count = Array.isArray(ownerRaw?.infinity_referred_users)
      ? ownerRaw.infinity_referred_users.length
      : 0;
    await User.updateOne(
      { user_id: ownerId },
      { $set: { infinity_referred_count: count } }
    ).exec();
  } catch (err) {
    console.error("updateInfinityReferredCount error:", err);
  }
}

/**
 * Remove a referral from owner.infinity_users levels (keeps infinity_referred_users intact).
 * Ensures owner does not list the referral inside any level arrays.
 */
export async function removeReferralFromOwnerLevels(
  ownerId: string,
  referralId: string
) {
  try {
    const ownerDoc: any = await User.findOne({ user_id: ownerId }).exec();
    if (!ownerDoc || !Array.isArray(ownerDoc.infinity_users)) return;

    let modified = false;
    for (const lvl of ownerDoc.infinity_users) {
      if (Array.isArray(lvl.users) && lvl.users.includes(referralId)) {
        lvl.users = lvl.users.filter(
          (u: string) => idStr(u) !== idStr(referralId)
        );
        modified = true;
      }
    }

    ownerDoc.infinity_users = ownerDoc.infinity_users.filter(
      (e: any) => Array.isArray(e.users) && e.users.length > 0
    );

    if (modified) {
      await ownerDoc.save();
    }
  } catch (err) {
    console.error("removeReferralFromOwnerLevels error:", err);
  }
}

/**
 * Adds a user to infinity_users array (by level) and updates their infinity sponsor,
 * then updates side arrays & counts using TreeNode placement.
 *
 * - idempotent: will not create duplicates in same owner.level
 * - ensures infinity_referred_users contains referral (atomic $addToSet)
 */
export async function addToInfinityTeam(
  userId: string,
  newReferralId: string,
  level?: number
) {
  if (!userId || !newReferralId) return;

  const userDoc: any = await User.findOne({ user_id: userId }).exec();
  if (!userDoc) return;

  if (!Array.isArray(userDoc.infinity_users)) userDoc.infinity_users = [];
  if (!Array.isArray(userDoc.infinity_referred_users))
    userDoc.infinity_referred_users = [];

  const targetLevel =
    typeof level === "number" && !isNaN(level) && level >= 1
      ? Number(level)
      : await getInfinityLevel(userId, newReferralId);

  // remove referral from other levels within same owner
  let modified = false;
  for (const lvlEntry of userDoc.infinity_users) {
    if (
      Array.isArray(lvlEntry.users) &&
      lvlEntry.users.includes(newReferralId) &&
      Number(lvlEntry.level) !== targetLevel
    ) {
      lvlEntry.users = lvlEntry.users.filter(
        (u: string) => idStr(u) !== idStr(newReferralId)
      );
      modified = true;
    }
  }
  userDoc.infinity_users = userDoc.infinity_users.filter(
    (e: any) => Array.isArray(e.users) && e.users.length > 0
  );

  // find or create level entry
  let existing = userDoc.infinity_users.find(
    (l: any) => Number(l.level) === Number(targetLevel)
  );
  if (existing) {
    if (!existing.users.includes(newReferralId)) {
      existing.users.push(newReferralId);
      modified = true;
    }
  } else {
    userDoc.infinity_users.push({ level: targetLevel, users: [newReferralId] });
    modified = true;
  }

  // local update to flat list (kept for doc consistency) — final persistence via atomic update below
  if (!userDoc.infinity_referred_users.includes(newReferralId)) {
    userDoc.infinity_referred_users.push(newReferralId);
    modified = true;
  }

  if (modified) {
    await userDoc.save();
  }

  // atomic ensure flat list contains referral and keep referred count in sync
  try {
    await User.updateOne(
      { user_id: userId },
      { $addToSet: { infinity_referred_users: newReferralId } }
    ).exec();
    await updateInfinityReferredCount(userId);
  } catch (err) {
    console.error("atomic addToSet infinity_referred_users failed:", err);
  }

  // set referral's infinity pointer
  await User.updateOne(
    { user_id: newReferralId },
    { $set: { infinity: userId } }
  ).exec();
  await Login.updateOne(
    { user_id: newReferralId },
    { $set: { infinity: userId } }
  ).exec();

  // update side arrays and counts
  await updateInfinitySideCount(userId, newReferralId);
}

/**
 * Processes deeper infinity levels based on even paid directs.
 * For any even child of `currentId`, we add it into `ownerId`'s infinity at the real level
 * computed from TreeNode and recurse.
 */
export async function processInfinityLevels(
  ownerId: string,
  currentId: string
) {
  const current: any = await User.findOne({ user_id: currentId }).exec();
  if (
    !current ||
    !Array.isArray(current.paid_directs) ||
    current.paid_directs.length === 0
  )
    return;

  for (let i = 0; i < current.paid_directs.length; i++) {
    const childId = current.paid_directs[i];
    if ((i + 1) % 2 === 0) {
      const level = await getInfinityLevel(ownerId, childId);
      await addToInfinityTeam(ownerId, childId, level);
      await processInfinityLevels(ownerId, childId);
    }
  }
}

/**
 * Rebuilds owner.infinity_referred_users from owner.referred_users,
 * keeping only active referrals (and preserving referred_users order).
 *
 * If you want to include non-active paid/advance users as well,
 * adjust the `activeSet` check below to include payment flags.
 */
export async function rebuildInfinityReferredFromReferredUsers(
  ownerId: string
) {
  const owner: any = await User.findOne({ user_id: ownerId }).exec();
  if (!owner) return;

  const referred = Array.isArray(owner.referred_users)
    ? owner.referred_users.slice()
    : [];
  if (referred.length === 0) {
    // empty out arrays
    await User.updateOne(
      { user_id: ownerId },
      { $set: { infinity_referred_users: [], infinity_referred_count: 0 } }
    ).exec();
    return;
  }

  // fetch all referred user docs in one query
  const activeDocs: any[] = await User.find({
    user_id: { $in: referred },
    user_status: "active",
  })
    .lean()
    .exec();
  const activeSet = new Set(activeDocs.map((r) => idStr(r.user_id)));

  // preserve order from referred_users
  const finalList: string[] = [];
  for (const rid of referred) {
    if (activeSet.has(idStr(rid))) finalList.push(idStr(rid));
  }

  await User.updateOne(
    { user_id: ownerId },
    {
      $set: {
        infinity_referred_users: finalList,
        infinity_referred_count: finalList.length,
      },
    }
  ).exec();
}

/**
 * Main function to rebuild infinity tree for a user.
 *
 * - Rebuilds infinity_referred_users from referred_users (active only) to maintain ordering and correctness.
 * - Applies odd/even placement:
 *    odd positions -> owner
 *    even positions -> sponsor (if exists) else owner
 * - Preserves paid_directs processing (unchanged)
 */
export async function updateInfinityTeam(userId: string) {
  const user: any = await User.findOne({ user_id: userId }).exec();
  if (!user) return;

  // ensure infinity_users exists locally
  if (!Array.isArray(user.infinity_users)) user.infinity_users = [];

  // 0) Rebuild flat referred list from referred_users (active only)
  await rebuildInfinityReferredFromReferredUsers(userId);
  // re-fetch owner to get updated infinity_referred_users
  const owner: any = await User.findOne({ user_id: userId }).exec();
  const refs: string[] = Array.isArray(owner.infinity_referred_users)
    ? owner.infinity_referred_users.slice()
    : [];

  // 1) preserve paid_directs logic
  if (Array.isArray(owner.paid_directs) && owner.paid_directs.length > 0) {
    if (!owner.referBy) {
      for (const childId of owner.paid_directs) {
        const level = await getInfinityLevel(userId, childId);
        await addToInfinityTeam(userId, childId, level);
        await processInfinityLevels(userId, childId);
      }
    } else {
      for (let i = 0; i < owner.paid_directs.length; i++) {
        const childId = owner.paid_directs[i];
        if ((i + 1) % 2 === 1) {
          const level = await getInfinityLevel(userId, childId);
          await addToInfinityTeam(userId, childId, level);
          await processInfinityLevels(userId, childId);
        } else {
          const sponsorLevel = await getInfinityLevel(owner.referBy, childId);
          await addToInfinityTeam(owner.referBy, childId, sponsorLevel);
          // ensure owner does not keep the child inside its level arrays
          await removeReferralFromOwnerLevels(userId, childId);
        }
      }
    }
  }

  // 2) Process ordering from infinity_referred_users (odd->owner, even->sponsor)
  for (let idx = 0; idx < refs.length; idx++) {
    const childId = refs[idx];
    if (!childId) continue;

    if ((idx + 1) % 2 === 1) {
      // odd -> owner
      await addToInfinityTeam(userId, childId);
      // also ensure sponsor levels don't incorrectly hold this referral as a result of previous runs? (we keep sponsor as-is)
    } else {
      // even -> sponsor if exists, otherwise owner
      if (owner.referBy) {
        await addToInfinityTeam(owner.referBy, childId);
        // remove from owner's level buckets to avoid duplication in infinity_users
        await removeReferralFromOwnerLevels(userId, childId);
      } else {
        await addToInfinityTeam(userId, childId);
      }
    }
  }

  // final counts
  await updateInfinityReferredCount(userId);
}

/**
 * When any user becomes active (by admin or payment), call this to ensure they
 * are added into their sponsor's infinity and propagate updates to ancestors.
 */
export async function addActivatedUserToInfinity(activatedUserId: string) {
  try {
    const activatedUser: any = await User.findOne({
      user_id: activatedUserId,
    }).exec();
    if (!activatedUser) return;

    const sponsorId = activatedUser.referBy;
    if (sponsorId) {
      // rebuild sponsor's flat list from referred_users (keeps ordering and active filter)
      await rebuildInfinityReferredFromReferredUsers(sponsorId);
      // re-run update for sponsor which will perform odd/even placement and remove duplicates from owner levels
      await updateInfinityTeam(sponsorId);
    }

    // propagate to ancestors to keep overall tree consistent
    await propagateInfinityUpdateToAncestors(activatedUserId);
  } catch (err) {
    console.error("addActivatedUserToInfinity error:", err);
  }
}

/**
 * Rebuild infinity upwards for all ancestors recursively.
 */
export async function propagateInfinityUpdateToAncestors(startUserId: string) {
  const current: any = await User.findOne({ user_id: startUserId }).exec();
  if (!current) return;

  let ancestorId = current.referBy;
  while (ancestorId) {
    await updateInfinityTeam(ancestorId);
    const ancestor: any = await User.findOne({ user_id: ancestorId }).exec();
    if (!ancestor) break;
    ancestorId = ancestor.referBy;
  }
}

export default {
  getInfinityLevel,
  detectInfinitySide,
  updateInfinitySideCount,
  addToInfinityTeam,
  processInfinityLevels,
  updateInfinityTeam,
  propagateInfinityUpdateToAncestors,
  addActivatedUserToInfinity,
  updateInfinityReferredCount,
  rebuildInfinityReferredFromReferredUsers,
  removeReferralFromOwnerLevels,
};

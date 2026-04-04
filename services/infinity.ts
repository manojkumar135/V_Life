import { User } from "@/models/user";
import { Login } from "@/models/login";
import TreeNode from "@/models/tree";

/**
 * Helper: normalize id
 */
function idStr(v: any) {
  return String(v ?? "");
}

// ============================================================
// FAST TREE NODE MAP — load ALL nodes once, reuse everywhere
// ============================================================

/**
 * Preloads all TreeNodes into a Map keyed by user_id.
 * Used to avoid per-node DB queries in level/side detection.
 */
async function buildTreeNodeMap(): Promise<Map<string, any>> {
  const allNodes = await TreeNode.find(
    {},
    { user_id: 1, parent: 1, left: 1, right: 1 }
  )
    .lean()
    .exec();
  return new Map(allNodes.map((n: any) => [idStr(n.user_id), n]));
}

/**
 * Fast level lookup using preloaded map — zero DB queries.
 * Level starts at 1 (direct paid direct = Level 1).
 * Fallback: returns 1 if not found.
 */
function getInfinityLevelFromMap(
  nodeMap: Map<string, any>,
  ownerId: string,
  childId: string
): number {
  let level = 1;
  let current = nodeMap.get(childId);
  if (!current) return 1;

  while (current?.parent) {
    if (current.parent === ownerId) return level;
    level++;
    current = nodeMap.get(current.parent);
    if (level > 50) break; // safety cap against infinite loops
  }
  return 1;
}

/**
 * Fast side detection using preloaded map — zero DB queries.
 * Returns: "left" | "right" | null
 */
function detectInfinitySideFromMap(
  nodeMap: Map<string, any>,
  ownerId: string,
  newReferralId: string
): "left" | "right" | null {
  const ownerNode = nodeMap.get(ownerId);
  let current = nodeMap.get(newReferralId);

  if (!current || !ownerNode) return null;

  while (current?.parent) {
    if (current.parent === ownerId) {
      const directChildId = current.user_id;
      if (ownerNode.left === directChildId) return "left";
      if (ownerNode.right === directChildId) return "right";
      return null;
    }
    current = nodeMap.get(current.parent);
  }

  return null;
}

// ============================================================
// ORIGINAL ASYNC VERSIONS (kept for backward compatibility)
// ============================================================

/**
 * Returns the infinity level of `childId` under `ownerId` by walking upward
 * through the binary tree using TreeNode.parent links.
 * Level starts at 1 (direct paid direct = Level 1).
 */
export async function getInfinityLevel(ownerId: string, childId: string) {
  let level = 1;
  let current: any = await TreeNode.findOne({ user_id: childId }).lean().exec();

  if (!current) return 1;

  while (current && current.parent) {
    if (current.parent === ownerId) return level;
    level++;
    current = await TreeNode.findOne({ user_id: current.parent })
      .lean()
      .exec();
  }

  return 1;
}

/**
 * Determine whether `newReferralId` is in owner's LEFT or RIGHT subtree.
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
    current = await TreeNode.findOne({ user_id: current.parent })
      .lean()
      .exec();
  }

  return null;
}

// ============================================================
// SIDE COUNT & REFERRED COUNT
// ============================================================

/**
 * Update owner's infinity_left_users / infinity_right_users arrays and counts.
 * Accepts optional preloaded nodeMap for speed.
 *
 * FIX: Uses $pull on the opposite side to prevent a user
 * from appearing in both left and right simultaneously.
 */
export async function updateInfinitySideCount(
  ownerId: string,
  newReferralId: string,
  nodeMap?: Map<string, any>
) {
  try {
    let side: "left" | "right" | null = null;

    if (nodeMap) {
      side = detectInfinitySideFromMap(nodeMap, ownerId, newReferralId);
    } else {
      side = await detectInfinitySide(ownerId, newReferralId);
    }

    if (!side) side = "left";

    if (side === "left") {
      await User.updateOne(
        { user_id: ownerId },
        {
          $addToSet: { infinity_left_users: newReferralId },
          $pull: { infinity_right_users: newReferralId },
        }
      ).exec();
    } else {
      await User.updateOne(
        { user_id: ownerId },
        {
          $addToSet: { infinity_right_users: newReferralId },
          $pull: { infinity_left_users: newReferralId },
        }
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
 * Keep infinity_referred_count in sync with infinity_referred_users length.
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

// ============================================================
// REMOVE REFERRAL FROM OWNER — ALL ARRAYS
// ============================================================

/**
 * FIX: Removes a referral from ALL four infinity arrays of a given owner:
 *   - infinity_users          (levelled array)
 *   - infinity_referred_users (flat list)
 *   - infinity_left_users     (side array) ← newly added
 *   - infinity_right_users    (side array) ← newly added
 * and recalculates all related counts.
 *
 * Previously only cleaned infinity_users and infinity_referred_users,
 * leaving stale entries in the side arrays causing count mismatches.
 */
export async function removeReferralFromOwner(
  ownerId: string,
  referralId: string
) {
  try {
    const ownerDoc: any = await User.findOne({ user_id: ownerId }).exec();
    if (!ownerDoc) return;

    let modified = false;

    // 1) Remove from levelled infinity_users array
    if (Array.isArray(ownerDoc.infinity_users)) {
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
    }

    // 2) Remove from flat infinity_referred_users list
    if (Array.isArray(ownerDoc.infinity_referred_users)) {
      const before = ownerDoc.infinity_referred_users.length;
      ownerDoc.infinity_referred_users = ownerDoc.infinity_referred_users.filter(
        (u: string) => idStr(u) !== idStr(referralId)
      );
      if (ownerDoc.infinity_referred_users.length !== before) modified = true;
    }

    // 3) FIX: Remove from infinity_left_users
    if (Array.isArray(ownerDoc.infinity_left_users)) {
      const before = ownerDoc.infinity_left_users.length;
      ownerDoc.infinity_left_users = ownerDoc.infinity_left_users.filter(
        (u: string) => idStr(u) !== idStr(referralId)
      );
      if (ownerDoc.infinity_left_users.length !== before) modified = true;
    }

    // 4) FIX: Remove from infinity_right_users
    if (Array.isArray(ownerDoc.infinity_right_users)) {
      const before = ownerDoc.infinity_right_users.length;
      ownerDoc.infinity_right_users = ownerDoc.infinity_right_users.filter(
        (u: string) => idStr(u) !== idStr(referralId)
      );
      if (ownerDoc.infinity_right_users.length !== before) modified = true;
    }

    if (modified) {
      // Recalculate all counts together
      ownerDoc.infinity_referred_count = ownerDoc.infinity_referred_users.length;
      ownerDoc.infinty_left_count = ownerDoc.infinity_left_users.length;
      ownerDoc.infinty_right_count = ownerDoc.infinity_right_users.length;
      await ownerDoc.save();
    }
  } catch (err) {
    console.error("removeReferralFromOwner error:", err);
  }
}

/**
 * Kept for backward compatibility — delegates to removeReferralFromOwner.
 */
export async function removeReferralFromOwnerLevels(
  ownerId: string,
  referralId: string
) {
  return removeReferralFromOwner(ownerId, referralId);
}

// ============================================================
// ONE-OWNER RULE — REMOVE FROM ALL OTHER OWNERS
// ============================================================

/**
 * FIX (new): Finds every user who currently has `referralId` in any of their
 * infinity arrays (excluding `correctOwnerId`) and removes it from them.
 *
 * Enforces the rule: one user ID can only belong to ONE person's infinity
 * team at any point in time.
 *
 * Called inside addToInfinityTeam before inserting into the new owner's team.
 */
async function removeReferralFromAllOtherOwners(
  correctOwnerId: string,
  referralId: string
) {
  try {
    const staleOwners: any[] = await User.find(
      {
        user_id: { $ne: correctOwnerId },
        $or: [
          { infinity_referred_users: referralId },
          { infinity_left_users: referralId },
          { infinity_right_users: referralId },
        ],
      },
      { user_id: 1 }
    )
      .lean()
      .exec();

    for (const staleOwner of staleOwners) {
      await removeReferralFromOwner(idStr(staleOwner.user_id), referralId);
    }
  } catch (err) {
    console.error("removeReferralFromAllOtherOwners error:", err);
  }
}

// ============================================================
// ADD TO INFINITY TEAM
// ============================================================

/**
 * Adds a user to infinity_users array (by level) and updates their infinity
 * sponsor, then updates side arrays & counts using TreeNode placement.
 *
 * - Idempotent: will not create duplicates in same owner.level
 * - FIX: Enforces one-owner rule — removes referral from ALL other owners first
 * - Ensures infinity_referred_users contains referral (atomic $addToSet)
 * - Accepts optional nodeMap for fast side detection (no extra DB queries)
 */
export async function addToInfinityTeam(
  userId: string,
  newReferralId: string,
  level?: number,
  nodeMap?: Map<string, any>
) {
  if (!userId || !newReferralId) return;

  // FIX: Enforce one-owner rule before inserting
  await removeReferralFromAllOtherOwners(userId, newReferralId);

  const userDoc: any = await User.findOne({ user_id: userId }).exec();
  if (!userDoc) return;

  if (!Array.isArray(userDoc.infinity_users)) userDoc.infinity_users = [];
  if (!Array.isArray(userDoc.infinity_referred_users))
    userDoc.infinity_referred_users = [];

  // Resolve target level
  let targetLevel: number;
  if (typeof level === "number" && !isNaN(level) && level >= 1) {
    targetLevel = Number(level);
  } else if (nodeMap) {
    targetLevel = getInfinityLevelFromMap(nodeMap, userId, newReferralId);
  } else {
    targetLevel = await getInfinityLevel(userId, newReferralId);
  }

  // Remove referral from wrong levels within same owner (level correction)
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

  // Find or create level entry
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

  // Local update to flat list
  if (!userDoc.infinity_referred_users.includes(newReferralId)) {
    userDoc.infinity_referred_users.push(newReferralId);
    modified = true;
  }

  if (modified) {
    await userDoc.save();
  }

  // Atomic ensure flat list contains referral and keep referred count in sync
  try {
    await User.updateOne(
      { user_id: userId },
      { $addToSet: { infinity_referred_users: newReferralId } }
    ).exec();
    await updateInfinityReferredCount(userId);
  } catch (err) {
    console.error("atomic addToSet infinity_referred_users failed:", err);
  }

  // Set referral's infinity pointer to the new correct owner
  await User.updateOne(
    { user_id: newReferralId },
    { $set: { infinity: userId } }
  ).exec();
  await Login.updateOne(
    { user_id: newReferralId },
    { $set: { infinity: userId } }
  ).exec();

  // Update side arrays and counts
  await updateInfinitySideCount(userId, newReferralId, nodeMap);
}

// ============================================================
// PROCESS INFINITY LEVELS (RECURSIVE)
// ============================================================

/**
 * Processes deeper infinity levels based on even paid directs.
 *
 * FIX (root cause of the duplicate-in-two-teams bug):
 *
 * Previously pulled ALL even-position children of `currentId` into
 * `ownerId`'s team unconditionally. This was wrong.
 *
 * Even-position directs of `currentId` belong to `currentId.infinity`
 * (current's own infinity sponsor) — NOT to any arbitrary ancestor.
 *
 * Fix: Only pull even-position children into `ownerId`'s team when
 * `ownerId` IS `current.infinity`. Otherwise skip entirely.
 *
 * Example of the bug this fixes:
 *   Sathi (infinity=Prayag) → pd[3]=Bhaskar (even → handed to Prayag ✓)
 *   Old: processInfinityLevels(Sathi, Bhaskar) ran and pulled Bhaskar's
 *        even-direct IND4129081 into SATHI's team ← WRONG
 *   New: Bhaskar.infinity=Prayag ≠ Sathi → skip ← CORRECT
 */
export async function processInfinityLevels(
  ownerId: string,
  currentId: string,
  nodeMap?: Map<string, any>
) {
  const current: any = await User.findOne({ user_id: currentId }).lean().exec();
  if (
    !current ||
    !Array.isArray(current.paid_directs) ||
    current.paid_directs.length === 0
  )
    return;

  // FIX: current's even-position directs belong to current's own infinity sponsor.
  // Only process them into ownerId's team if ownerId IS that sponsor.
  const currentInfinitySponsor = current.infinity ? idStr(current.infinity) : null;

  for (let i = 0; i < current.paid_directs.length; i++) {
    const childId = current.paid_directs[i];
    const position = i + 1;

    if (position % 2 === 0) {
      // Skip if ownerId is NOT current's infinity sponsor
      if (!currentInfinitySponsor || currentInfinitySponsor !== ownerId) {
        continue;
      }
      const level = nodeMap
        ? getInfinityLevelFromMap(nodeMap, ownerId, childId)
        : await getInfinityLevel(ownerId, childId);
      await addToInfinityTeam(ownerId, childId, level, nodeMap);
      await processInfinityLevels(ownerId, childId, nodeMap);
    }
    // Odd positions belong to current's own team — not ownerId's.
  }
}

// ============================================================
// REBUILD INFINITY REFERRED FROM REFERRED USERS
// ============================================================

/**
 * Rebuilds owner.infinity_referred_users from owner.referred_users,
 * keeping only active referrals (and preserving referred_users order).
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
    await User.updateOne(
      { user_id: ownerId },
      { $set: { infinity_referred_users: [], infinity_referred_count: 0 } }
    ).exec();
    return;
  }

  // Fetch all referred user docs in one query
  const activeDocs: any[] = await User.find({
    user_id: { $in: referred },
    user_status: "active",
  })
    .lean()
    .exec();
  const activeSet = new Set(activeDocs.map((r) => idStr(r.user_id)));

  // Preserve order from referred_users
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

// ============================================================
// ADD TO PAID DIRECTS ORDERED
// ============================================================

/**
 * Adds a newly activated user to their sponsor's paid_directs
 * in activation order (append-only — never re-sorts existing entries).
 *
 * - Idempotent: skips if newDirectId already in paid_directs
 * - Only appends to end — existing positions never change
 * - Updates paid_directs_count in the same DB call
 */
export async function addToPaidDirectsOrdered(
  sponsorId: string,
  newDirectId: string
) {
  try {
    const sponsor: any = await User.findOne({ user_id: sponsorId }).exec();
    if (!sponsor) return;

    const currentPaid: string[] = Array.isArray(sponsor.paid_directs)
      ? sponsor.paid_directs.map(idStr)
      : [];

    // Idempotent: already present, nothing to do
    if (currentPaid.includes(idStr(newDirectId))) return;

    const ordered = [...currentPaid, idStr(newDirectId)];

    await User.updateOne(
      { user_id: sponsorId },
      {
        $set: {
          paid_directs: ordered,
          paid_directs_count: ordered.length,
        },
      }
    ).exec();
  } catch (err) {
    console.error("addToPaidDirectsOrdered error:", err);
  }
}

// ============================================================
// UPDATE INFINITY TEAM (MAIN)
// ============================================================

/**
 * Main function to rebuild infinity team for a user.
 *
 * Rules:
 * - paid_directs is the ONLY source of truth for odd/even placement
 * - odd positions  → self's infinity team
 * - even positions → owner.infinity sponsor's infinity team
 *
 * FIX (null-sponsor branch): When owner has no infinity sponsor yet,
 * even-position directs are SKIPPED — not added to self.
 * They will be correctly placed when the owner's sponsor activates
 * and triggers updateInfinityTeam again with a valid infinity field.
 * Previously they were wrongly added to self, causing stale data
 * that persisted even after the real infinity sponsor was assigned.
 */
export async function updateInfinityTeam(userId: string) {
  const user: any = await User.findOne({ user_id: userId }).exec();
  if (!user) return;

  if (!Array.isArray(user.infinity_users)) user.infinity_users = [];

  // 0) Rebuild flat referred list from referred_users (active only)
  await rebuildInfinityReferredFromReferredUsers(userId);

  // Re-fetch to get updated data
  const owner: any = await User.findOne({ user_id: userId }).exec();

  // Preload ALL tree nodes ONCE
  const nodeMap = await buildTreeNodeMap();

  // 1) paid_directs is the ONLY source of truth for odd/even infinity placement
  if (Array.isArray(owner.paid_directs) && owner.paid_directs.length > 0) {

    const infinitySponsorId: string | null = owner.infinity
      ? idStr(owner.infinity)
      : null;

    if (!infinitySponsorId) {
      // No infinity sponsor yet.
      // FIX: Only place ODD-position directs into self.
      // SKIP even-position directs — cannot place them without a sponsor.
      // They will be correctly placed when this user's own sponsor activates.
      for (let i = 0; i < owner.paid_directs.length; i++) {
        const childId = owner.paid_directs[i];
        const position = i + 1;
        if (position % 2 === 1) {
          const level = getInfinityLevelFromMap(nodeMap, userId, childId);
          await addToInfinityTeam(userId, childId, level, nodeMap);
          await processInfinityLevels(userId, childId, nodeMap);
        }
        // Even → skip (no sponsor to hand off to yet)
      }
    } else {
      // Has infinity sponsor: odd → self, even → infinity sponsor
      for (let i = 0; i < owner.paid_directs.length; i++) {
        const childId = owner.paid_directs[i];
        if ((i + 1) % 2 === 1) {
          // Odd position → self
          const level = getInfinityLevelFromMap(nodeMap, userId, childId);
          await addToInfinityTeam(userId, childId, level, nodeMap);
          await processInfinityLevels(userId, childId, nodeMap);
        } else {
          // Even position → infinity sponsor
          const sponsorLevel = getInfinityLevelFromMap(
            nodeMap,
            infinitySponsorId,
            childId
          );
          await addToInfinityTeam(infinitySponsorId, childId, sponsorLevel, nodeMap);
          // Clean from self: removes from ALL four arrays + recalculates counts
          await removeReferralFromOwner(userId, childId);
        }
      }
    }
  }

  // Final counts
  await updateInfinityReferredCount(userId);
}

// ============================================================
// ADD ACTIVATED USER TO INFINITY
// ============================================================

/**
 * When any user becomes active (by admin or payment), call this to ensure
 * they are added into their sponsor's infinity team correctly.
 *
 * IMPORTANT: Call AFTER addToPaidDirectsOrdered so paid_directs is up to date.
 */
export async function addActivatedUserToInfinity(activatedUserId: string) {
  try {
    const activatedUser: any = await User.findOne({
      user_id: activatedUserId,
    }).lean().exec();
    if (!activatedUser) return;

    const sponsorId = activatedUser.referBy;
    if (sponsorId) {
      await rebuildInfinityReferredFromReferredUsers(sponsorId);
      await updateInfinityTeam(sponsorId);
    }
  } catch (err) {
    console.error("addActivatedUserToInfinity error:", err);
  }
}

// ============================================================
// PROPAGATE TO ANCESTORS (TARGETED — NOT FULL REBUILD)
// ============================================================

/**
 * Propagates infinity update to the activated user's infinity sponsor.
 *
 * Uses owner.infinity (not owner.referBy) to find the correct upline.
 * Does a targeted addToInfinityTeam for only the newly activated user
 * at the correct level — no full rebuild, no re-processing of old directs.
 * addToInfinityTeam enforces the one-owner rule via removeReferralFromAllOtherOwners.
 *
 * Called as fire-and-forget (non-blocking) from routes.
 */
export async function propagateInfinityUpdateToAncestors(startUserId: string) {
  try {
    const activatedUser: any = await User.findOne({ user_id: startUserId })
      .lean()
      .exec();
    if (!activatedUser) return;

    const infinitySponsorId = activatedUser.infinity
      ? idStr(activatedUser.infinity)
      : null;
    if (!infinitySponsorId) return;

    const nodeMap = await buildTreeNodeMap();
    const level = getInfinityLevelFromMap(nodeMap, infinitySponsorId, startUserId);
    await addToInfinityTeam(infinitySponsorId, startUserId, level, nodeMap);
  } catch (err) {
    console.error("propagateInfinityUpdateToAncestors error:", err);
  }
}

export default {
  getInfinityLevel,
  detectInfinitySide,
  updateInfinitySideCount,
  addToInfinityTeam,
  addToPaidDirectsOrdered,
  processInfinityLevels,
  updateInfinityTeam,
  propagateInfinityUpdateToAncestors,
  addActivatedUserToInfinity,
  updateInfinityReferredCount,
  rebuildInfinityReferredFromReferredUsers,
  removeReferralFromOwnerLevels,
  removeReferralFromOwner,
};
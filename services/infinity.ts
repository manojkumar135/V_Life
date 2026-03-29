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
// ORIGINAL ASYNC VERSIONS (kept for backward compatibility
// and for callers that don't have a nodeMap available)
// ============================================================

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
    current = await TreeNode.findOne({ user_id: current.parent })
      .lean()
      .exec();
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

// ============================================================
// REMOVE REFERRAL FROM OWNER LEVELS
// ============================================================

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

// ============================================================
// ADD TO INFINITY TEAM
// ============================================================

/**
 * Adds a user to infinity_users array (by level) and updates their infinity sponsor,
 * then updates side arrays & counts using TreeNode placement.
 *
 * - idempotent: will not create duplicates in same owner.level
 * - ensures infinity_referred_users contains referral (atomic $addToSet)
 * - accepts optional nodeMap for fast side detection (no extra DB queries)
 */
export async function addToInfinityTeam(
  userId: string,
  newReferralId: string,
  level?: number,
  nodeMap?: Map<string, any>
) {
  if (!userId || !newReferralId) return;

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

  // local update to flat list
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

  // update side arrays and counts — pass nodeMap if available
  await updateInfinitySideCount(userId, newReferralId, nodeMap);
}

// ============================================================
// PROCESS INFINITY LEVELS (RECURSIVE)
// ============================================================

/**
 * Processes deeper infinity levels based on even paid directs.
 * For any even child of `currentId`, we add it into `ownerId`'s infinity at the real level
 * computed from nodeMap (fast, zero DB) and recurse.
 * Accepts optional nodeMap for speed.
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

  for (let i = 0; i < current.paid_directs.length; i++) {
    const childId = current.paid_directs[i];
    if ((i + 1) % 2 === 0) {
      const level = nodeMap
        ? getInfinityLevelFromMap(nodeMap, ownerId, childId)
        : await getInfinityLevel(ownerId, childId);
      await addToInfinityTeam(ownerId, childId, level, nodeMap);
      await processInfinityLevels(ownerId, childId, nodeMap);
    }
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

    // Idempotent: already present, nothing to do — positions unchanged
    if (currentPaid.includes(idStr(newDirectId))) return;

    // ✅ Simply append — do NOT re-sort by referred_users.
    // paid_directs reflects activation order (first-come-first-served).
    // The odd/even infinity assignment depends on this order being stable.
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
// UPDATE INFINITY TEAM (MAIN — OPTIMIZED)
// ============================================================

/**
 * Main function to rebuild infinity tree for a user.
 *
 * OPTIMIZED:
 * - Preloads ALL TreeNodes once into a Map (zero per-node DB queries)
 * - paid_directs is the ONLY source of truth for odd/even placement
 * - odd positions → self, even positions → sponsor (if exists) else self
 * - Removed the conflicting infinity_referred_users second loop
 */
export async function updateInfinityTeam(userId: string) {
  const user: any = await User.findOne({ user_id: userId }).exec();
  if (!user) return;

  if (!Array.isArray(user.infinity_users)) user.infinity_users = [];

  // 0) Rebuild flat referred list from referred_users (active only)
  await rebuildInfinityReferredFromReferredUsers(userId);

  // Re-fetch owner to get updated data
  const owner: any = await User.findOne({ user_id: userId }).exec();

  // ✅ Preload ALL tree nodes ONCE — avoids per-node DB queries in level/side detection
  const nodeMap = await buildTreeNodeMap();

  // 1) paid_directs is the ONLY source of truth for odd/even infinity placement
  if (Array.isArray(owner.paid_directs) && owner.paid_directs.length > 0) {
    if (!owner.referBy) {
      // Root user: all paid_directs go to self
      for (const childId of owner.paid_directs) {
        const level = getInfinityLevelFromMap(nodeMap, userId, childId);
        await addToInfinityTeam(userId, childId, level, nodeMap);
        await processInfinityLevels(userId, childId, nodeMap);
      }
    } else {
      // Has sponsor: odd → self, even → sponsor
      for (let i = 0; i < owner.paid_directs.length; i++) {
        const childId = owner.paid_directs[i];
        if ((i + 1) % 2 === 1) {
          // odd position → self
          const level = getInfinityLevelFromMap(nodeMap, userId, childId);
          await addToInfinityTeam(userId, childId, level, nodeMap);
          await processInfinityLevels(userId, childId, nodeMap);
        } else {
          // even position → sponsor
          const sponsorLevel = getInfinityLevelFromMap(
            nodeMap,
            owner.referBy,
            childId
          );
          await addToInfinityTeam(owner.referBy, childId, sponsorLevel, nodeMap);
          await removeReferralFromOwnerLevels(userId, childId);
        }
      }
    }
  }

  // NOTE: Step 2 (infinity_referred_users loop) intentionally removed.
  // It used its own index causing even-position IDs to be wrongly added to self.
  // paid_directs loop above is the single source of truth for odd/even placement.

  // final counts
  await updateInfinityReferredCount(userId);
}

// ============================================================
// ADD ACTIVATED USER TO INFINITY (OPTIMIZED)
// ============================================================

/**
 * When any user becomes active (by admin or payment), call this to ensure they
 * are added into their sponsor's infinity.
 *
 * OPTIMIZED: Only updates the direct sponsor — no full ancestor chain rebuild.
 * Ancestor propagation is handled separately as a non-blocking background task.
 */
export async function addActivatedUserToInfinity(activatedUserId: string) {
  try {
    const activatedUser: any = await User.findOne({
      user_id: activatedUserId,
    }).lean().exec();
    if (!activatedUser) return;

    const sponsorId = activatedUser.referBy;
    if (sponsorId) {
      // Rebuild sponsor's flat list from referred_users (keeps ordering and active filter)
      await rebuildInfinityReferredFromReferredUsers(sponsorId);
      // Re-run update for sponsor: performs odd/even placement and removes duplicates
      await updateInfinityTeam(sponsorId);
    }

    // Propagate one level up (sponsor's sponsor) as background task
    // Callers should invoke propagateInfinityUpdateToAncestors non-blocking
  } catch (err) {
    console.error("addActivatedUserToInfinity error:", err);
  }
}

// ============================================================
// PROPAGATE TO ANCESTORS (OPTIMIZED — ONE LEVEL UP ONLY)
// ============================================================

/**
 * Propagates infinity update upward — only ONE level up (sponsor's sponsor).
 *
 * OPTIMIZED: Previously looped through entire ancestor chain causing
 * N × M DB calls. Now only updates one level up since each sponsor's
 * updateInfinityTeam already handles its own odd/even placement correctly.
 *
 * Called as fire-and-forget (non-blocking) from routes.
 */
export async function propagateInfinityUpdateToAncestors(startUserId: string) {
  try {
    const current: any = await User.findOne({ user_id: startUserId })
      .lean()
      .exec();
    if (!current?.referBy) return;

    // Walk up to sponsor's sponsor (one level above the direct sponsor)
    const directSponsor: any = await User.findOne({ user_id: current.referBy })
      .lean()
      .exec();
    if (!directSponsor?.referBy) return;

    // Update only sponsor's sponsor — not the entire chain
    await updateInfinityTeam(directSponsor.referBy);
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
};
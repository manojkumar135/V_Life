import { User } from "@/models/user";
import { Login } from "@/models/login";
import TreeNode from "@/models/tree";

/**
 * Returns the infinity level of `childId` under `ownerId` by walking upward
 * through the binary tree using TreeNode.parent links.
 *
 * Level starts at 1 (direct paid direct = Level 1)
 * AUTO fallback: if not found → returns 1
 */
export async function getInfinityLevel(ownerId: string, childId: string) {
  console.log(`\n🧭 getInfinityLevel(): owner=${ownerId}, child=${childId}`);

  let level = 1;
  let current: any = await TreeNode.findOne({ user_id: childId }).lean().exec();

  if (!current) {
    console.warn("⚠️ TREE NODE NOT FOUND for child. Defaulting to level 1");
    return 1;
  }

  // walk upward via parent links until we find owner
  while (current && current.parent) {
    if (current.parent === ownerId) {
      console.log(`✅ Found owner in path. Final Level = ${level}`);
      return level;
    }
    level++;
    current = await TreeNode.findOne({ user_id: current.parent }).lean().exec();
  }

  console.warn("⚠️ Child is NOT in owner branch. AUTO MODE → Level 1");
  return 1;
}

/**
 * Determine whether `newReferralId` is in owner's LEFT or RIGHT subtree using TreeNode.
 * Returns: "left" | "right" | null
 */
export async function detectInfinitySide(ownerId: string, newReferralId: string) {
  console.log(`\n↔️ detectInfinitySide(): owner=${ownerId}, child=${newReferralId}`);

  const ownerNode: any = await TreeNode.findOne({ user_id: ownerId }).lean().exec();
  let current: any = await TreeNode.findOne({ user_id: newReferralId }).lean().exec();

  if (!current) {
    console.warn("⚠️ Child tree node not found:", newReferralId);
    return null;
  }
  if (!ownerNode) {
    console.warn("⚠️ Owner tree node not found:", ownerId);
    return null;
  }

  // walk up until we reach an immediate child under owner
  while (current && current.parent) {
    if (current.parent === ownerId) {
      const directChildId = current.user_id;
      if (ownerNode.left === directChildId) {
        console.log(`✅ Detected LEFT side: directChild=${directChildId}`);
        return "left";
      }
      if (ownerNode.right === directChildId) {
        console.log(`✅ Detected RIGHT side: directChild=${directChildId}`);
        return "right";
      }

      console.warn(
        `⚠️ Direct child ${directChildId} found under owner ${ownerId} but owner.left/right don't match`
      );
      return null;
    }

    current = await TreeNode.findOne({ user_id: current.parent }).lean().exec();
  }

  console.warn("⚠️ Could not find owner in the upward chain for child:", newReferralId);
  return null;
}

/**
 * Update owner's infinity_left_users / infinity_right_users arrays and counts.
 */
export async function updateInfinitySideCount(ownerId: string, newReferralId: string) {
  try {
    console.log(`\n↕️ updateInfinitySideCount(): owner=${ownerId}, child=${newReferralId}`);

    let side = await detectInfinitySide(ownerId, newReferralId);

    if (!side) {
      console.warn("⚠️ Side detection failed → AUTO fallback = left");
      side = "left";
    }

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

    const ownerRaw: any = await User.findOne({ user_id: ownerId }).lean().exec();
    if (!ownerRaw) {
      console.warn("⚠️ Owner user record not found while updating counts:", ownerId);
      return;
    }

    const leftCount = Array.isArray(ownerRaw.infinity_left_users) ? ownerRaw.infinity_left_users.length : 0;
    const rightCount = Array.isArray(ownerRaw.infinity_right_users) ? ownerRaw.infinity_right_users.length : 0;

    await User.updateOne(
      { user_id: ownerId },
      { $set: { infinty_left_count: leftCount, infinty_right_count: rightCount } }
    ).exec();

    console.log(`📊 Updated counts for ${ownerId} → left:${leftCount} right:${rightCount}`);
  } catch (err) {
    console.error("❌ updateInfinitySideCount error:", err);
  }
}

/**
 * Adds a user to infinity_users array (by level) and updates their infinity sponsor,
 * then updates side arrays & counts using TreeNode placement.
 *
 * Improvements:
 * - Compute real level using TreeNode unless explicit level is intentionally provided.
 * - Remove the user from other levels before inserting to avoid duplicates across levels.
 */
export async function addToInfinityTeam(
  userId: string,
  newReferralId: string,
  level?: number
) {
  console.log(`\n➕ addToInfinityTeam(): Adding ${newReferralId} → ${userId} @ requested Level ${level ?? "auto"}`);

  if (!userId || !newReferralId) return;

  const userDoc: any = await User.findOne({ user_id: userId }).exec();
  if (!userDoc) {
    console.warn("⚠️ Owner user not found:", userId);
    return;
  }

  // Ensure infinity_users exists
  if (!Array.isArray(userDoc.infinity_users)) {
    userDoc.infinity_users = [];
  }

  // Determine correct level using TreeNode if not explicitly provided or forced
  let targetLevel = typeof level === "number" && !isNaN(level) ? Number(level) : await getInfinityLevel(userId, newReferralId);

  // Normalize level to integer >=1
  if (!targetLevel || targetLevel < 1) targetLevel = 1;

  // Remove referral from any other level entries (dedupe across levels)
  let modified = false;
  for (const lvlEntry of userDoc.infinity_users) {
    if (Array.isArray(lvlEntry.users) && lvlEntry.users.includes(newReferralId) && Number(lvlEntry.level) !== Number(targetLevel)) {
      lvlEntry.users = lvlEntry.users.filter((u: string) => u !== newReferralId);
      modified = true;
    }
  }

  // Clean up empty level entries
  userDoc.infinity_users = userDoc.infinity_users.filter((e: any) => Array.isArray(e.users) && e.users.length > 0);

  // Find or create target level entry
  let existingLevelEntry = userDoc.infinity_users.find((lvl: any) => Number(lvl.level) === Number(targetLevel));
  if (existingLevelEntry) {
    if (!existingLevelEntry.users.includes(newReferralId)) {
      existingLevelEntry.users.push(newReferralId);
      modified = true;
      console.log("📌 Pushed newReferral to existing level entry");
    } else {
      console.log("⚠️ Skipping — user already exists in this level");
    }
  } else {
    userDoc.infinity_users.push({ level: targetLevel, users: [newReferralId] });
    modified = true;
    console.log("📌 Creating new level entry and adding user");
  }

  if (modified) {
    await userDoc.save();
    console.log("✅ Saved infinity_users for owner:", userId);
  } else {
    // still ensure we saved earlier if no structural changes but infinity may still be set on referral
    console.log("ℹ️ No changes to owner's infinity_users needed");
  }

  // Update the referred user's infinity sponsor (always set to direct sponsor for reference)
  await User.updateOne({ user_id: newReferralId }, { $set: { infinity: userId } }).exec();
  await Login.updateOne({ user_id: newReferralId }, { $set: { infinity: userId } }).exec();

  // Update left/right side arrays and counts
  await updateInfinitySideCount(userId, newReferralId);

  console.log(`✅ addToInfinityTeam completed for ${newReferralId} -> ${userId} (final level ${targetLevel})`);
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
  console.log(`\n🔍 processInfinityLevels(): Owner=${ownerId}, Current=${currentId}`);

  const current: any = await User.findOne({ user_id: currentId }).exec();
  if (!current || !Array.isArray(current.paid_directs) || current.paid_directs.length === 0) {
    console.log("⚠️ No paid_directs found. Stopping recursion.");
    return;
  }

  for (let i = 0; i < current.paid_directs.length; i++) {
    const childId = current.paid_directs[i];

    if ((i + 1) % 2 === 0) {
      console.log(`✅ EVEN Paid Direct #${i + 1} → ${childId}`);

      // compute real tree-based level from owner->child
      const level = await getInfinityLevel(ownerId, childId);
      await addToInfinityTeam(ownerId, childId, level);

      console.log(`🔁 Recursing into child ${childId}`);
      await processInfinityLevels(ownerId, childId);
    } else {
      console.log(`⏭️ ODD Paid Direct #${i + 1} → Skipped for deeper level`);
    }
  }
}

/**
 * Main function to rebuild infinity tree for a user.
 *
 * Behavior:
 * - For every paid_direct, we compute the correct level (TreeNode-based) and add accordingly.
 * - Odd/even logic still used to decide whether some directs are processed under sponsor vs owner,
 *   but final placement always uses getInfinityLevel owner-based computation to avoid wrong level assignment.
 */
export async function updateInfinityTeam(userId: string) {
  console.log(`\n♾️ updateInfinityTeam(): Building Infinity for ${userId}`);

  const user: any = await User.findOne({ user_id: userId }).exec();
  if (!user || !Array.isArray(user.paid_directs) || user.paid_directs.length === 0) {
    console.log("⚠️ User has no paid_directs → Skip");
    return;
  }

  // Ensure infinity_users exists
  if (!Array.isArray(user.infinity_users)) user.infinity_users = [];

  if (!user.referBy) {
    console.log("👑 No sponsor → all paid_directs go to their computed levels under the user");
    for (const childId of user.paid_directs) {
      const level = await getInfinityLevel(userId, childId);
      await addToInfinityTeam(userId, childId, level);
      await processInfinityLevels(userId, childId);
    }
  } else {
    console.log("👥 Has sponsor → applying odd/even logic but placing using TreeNode level");
    for (let i = 0; i < user.paid_directs.length; i++) {
      const childId = user.paid_directs[i];

      if ((i + 1) % 2 === 1) {
        console.log(`🔹 ODD direct → compute level under ${userId}:`, childId);
        const level = await getInfinityLevel(userId, childId);
        await addToInfinityTeam(userId, childId, level);
        await processInfinityLevels(userId, childId);
      } else {
        console.log(`🔸 EVEN direct → goes to sponsor ${user.referBy}:`, childId);
        const sponsorLevel = await getInfinityLevel(user.referBy, childId);
        await addToInfinityTeam(user.referBy, childId, sponsorLevel);
      }
    }
  }

  console.log("✅ Infinity build completed for", userId);
}

/**
 * Rebuild infinity upwards for all ancestors recursively.
 */
export async function propagateInfinityUpdateToAncestors(startUserId: string) {
  console.log(`\n📡 propagateInfinityUpdateToAncestors(): Starting from ${startUserId}`);

  const current: any = await User.findOne({ user_id: startUserId }).exec();
  if (!current) return;

  let ancestorId = current.referBy;
  while (ancestorId) {
    console.log(`🔼 Rebuilding Infinity for ancestor: ${ancestorId}`);
    await updateInfinityTeam(ancestorId);

    const ancestor: any = await User.findOne({ user_id: ancestorId }).exec();
    if (!ancestor) break;

    ancestorId = ancestor.referBy;
  }

  console.log("✅ Finished ancestor propagation");
}

export default {
  getInfinityLevel,
  detectInfinitySide,
  updateInfinitySideCount,
  addToInfinityTeam,
  processInfinityLevels,
  updateInfinityTeam,
  propagateInfinityUpdateToAncestors,
};

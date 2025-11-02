// services/infinity.ts
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
 * Option C: uses TreeNode.left / TreeNode.right placement to decide.
 *
 * Returns: "left" | "right" | null (null if cannot determine)
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

      // direct child found but owner.left/right do not match (tree mismatch)
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
 *
 * Behavior:
 *  - Uses `detectInfinitySide()` (TreeNode left/right)
 *  - If side === "left" => add to infinity_left_users and update infinty_left_count
 *  - If side === "right" => add to infinity_right_users and update infinty_right_count
 *  - If side === null (cannot detect) => AUTO fallback => push into left array by default
 *
 * Implementation details:
 *  - Uses $addToSet to avoid duplicates
 *  - After $addToSet we re-read the owner doc (as plain object) to update count fields
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
      // add to left array if not present
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

    // re-read owner to set counts exactly equal to array lengths
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
 * then updates side arrays & counts using TreeNode placement (Option C).
 *
 * Ensures: no duplicates inside the level array.
 */
export async function addToInfinityTeam(
  userId: string,
  newReferralId: string,
  level = 1
) {
  console.log(`\n➕ addToInfinityTeam(): Adding ${newReferralId} → ${userId} @ Level ${level}`);

  if (!userId) return;
  const userDoc: any = await User.findOne({ user_id: userId }).exec();
  if (!userDoc) {
    console.warn("⚠️ Owner user not found:", userId);
    return;
  }

  // Ensure infinity_users exists
  if (!Array.isArray(userDoc.infinity_users)) {
    userDoc.infinity_users = [];
  }

  // Find or create level entry
  const existingLevelEntry = userDoc.infinity_users.find((lvl: any) => Number(lvl.level) === Number(level));

  if (existingLevelEntry) {
    if (!existingLevelEntry.users.includes(newReferralId)) {
      console.log("📌 Pushing newReferral to existing level entry");
      existingLevelEntry.users.push(newReferralId);
    } else {
      console.log("⚠️ Skipping — user already exists in this level");
    }
  } else {
    console.log("📌 Creating new level entry and adding user");
    userDoc.infinity_users.push({ level, users: [newReferralId] });
  }

  // Save the owner with updated infinity_users
  await userDoc.save();
  console.log("✅ Saved infinity_users for owner:", userId);

  // Update the referred user's infinity sponsor
  await User.updateOne({ user_id: newReferralId }, { $set: { infinity: userId } }).exec();
  await Login.updateOne({ user_id: newReferralId }, { $set: { infinity: userId } }).exec();

  // Update side arrays and counts (left/right) based on TreeNode placement (Option C)
  await updateInfinitySideCount(userId, newReferralId);

  console.log(`✅ addToInfinityTeam completed for ${newReferralId} -> ${userId} (level ${level})`);
}

/**
 * Processes deeper infinity levels based on even paid directs.
 * For any even child of `currentId`, we add it into `ownerId`'s infinity at the real level
 * computed from TreeNode.
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
 * NOTE: Option A chosen: do NOT reset side arrays during rebuild here. We will only manage
 * additions so existing left/right arrays remain intact.
 *
 * Odd paid directs go into user's own level 1; even paid directs go to sponsor
 * at the real TreeNode-based level.
 */
export async function updateInfinityTeam(userId: string) {
  console.log(`\n♾️ updateInfinityTeam(): Building Infinity for ${userId}`);

  const user: any = await User.findOne({ user_id: userId }).exec();
  if (!user || !Array.isArray(user.paid_directs) || user.paid_directs.length === 0) {
    console.log("⚠️ User has no paid_directs → Skip");
    return;
  }

  // Do not reset left/right arrays or counts (Option A)
  // But ensure infinity_users array exists for working
  if (!Array.isArray(user.infinity_users)) user.infinity_users = [];

  if (!user.referBy) {
    console.log("👑 No sponsor → all paid_directs go to Level 1");
    for (const childId of user.paid_directs) {
      await addToInfinityTeam(userId, childId, 1);
      await processInfinityLevels(userId, childId);
    }
  } else {
    console.log("👥 Has sponsor → applying odd/even logic");
    for (let i = 0; i < user.paid_directs.length; i++) {
      const childId = user.paid_directs[i];

      if ((i + 1) % 2 === 1) {
        console.log(`🔹 ODD direct → L1 of ${userId}:`, childId);
        await addToInfinityTeam(userId, childId, 1);
        await processInfinityLevels(userId, childId);
      } else {
        console.log(`🔸 EVEN direct → goes to sponsor ${user.referBy}:`, childId);

        const level = await getInfinityLevel(user.referBy, childId);
        await addToInfinityTeam(user.referBy, childId, level);
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

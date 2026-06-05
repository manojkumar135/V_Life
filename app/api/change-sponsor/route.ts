// app/api/change-sponsor/route.ts
// Admin-only: change a user's referBy (sponsor) with strict validation
// Rules:
//   1. Requesting user must be admin
//   2. Target user must be INACTIVE (not deactivated by admin)
//   3. New sponsor must be a strict ancestor of the target user in the binary tree
//   4. Path from new sponsor down to target user must be purely left-only OR purely right-only
//   5. Only referBy field is updated (no binary tree restructuring)

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/user";
import { Login } from "@/models/login";
import TreeNode from "@/models/tree";

/* ─── tiny helpers ───────────────────────────────────────────────── */

function idStr(v: any): string {
  return String(v ?? "").trim();
}

/** Walk the tree upward from `childId` and collect the full ancestor chain.
 *  Returns  [childId, parentId, grandParentId, …, rootId]
 */
async function getAncestorChain(childId: string): Promise<string[]> {
  const chain: string[] = [];
  let currentId: string | null = childId;

  while (currentId) {
    chain.push(currentId);
    const node = await TreeNode.findOne({ user_id: currentId })
      .select("parent")
      .lean<{ parent?: string | null }>()
      .exec();
    if (!node) break;
    currentId = node.parent ?? null;
  }

  return chain;
}

/**
 * Validates that `candidateSponsorId` is a **strict ancestor** of `targetUserId`
 * AND that every hop from candidateSponsor → … → targetUser's parent follows
 * the SAME side (all-left or all-right).
 *
 * Returns: { valid: true, side: "left"|"right" }  on success
 *          { valid: false, reason: string }         on failure
 */
async function validateNewSponsor(
  targetUserId: string,
  candidateSponsorId: string,
): Promise<
  { valid: true; side: "left" | "right" } | { valid: false; reason: string }
> {
  if (targetUserId === candidateSponsorId) {
    return { valid: false, reason: "Sponsor cannot be the same as the user." };
  }

  // Build ancestor chain for target (includes target itself)
  const chain = await getAncestorChain(targetUserId);
  // chain[0] = targetUserId, chain[1] = parent, chain[2] = grandparent, ...

  // The candidate must appear ABOVE the target — meaning in chain but NOT as chain[0]
  const idxInChain = chain.indexOf(candidateSponsorId);
  if (idxInChain <= 0) {
    // idxInChain === -1 → not an ancestor at all
    // idxInChain === 0  → that IS the target itself
    return {
      valid: false,
      reason:
        "New sponsor must be an ancestor (upline) of the user in the binary tree.",
    };
  }

  // Path from candidateSponsor down to target's parent (not target itself):
  //   chain[idxInChain] = candidateSponsor
  //   chain[idxInChain - 1] = … → chain[1] = targetUser's parent
  // We need to check each hop stays on one side.

  const pathFromSponsorDown = chain.slice(1, idxInChain + 1).reverse();
  // pathFromSponsorDown[0] = candidateSponsor, last = targetUser's direct parent

  let determinedSide: "left" | "right" | null = null;

  for (let i = 0; i < pathFromSponsorDown.length - 1; i++) {
    const ancestorId = pathFromSponsorDown[i];
    const childId = pathFromSponsorDown[i + 1];

    const ancestorNode = await TreeNode.findOne({ user_id: ancestorId })
      .select("left right")
      .lean<{ left?: string | null; right?: string | null }>()
      .exec();

    if (!ancestorNode) {
      return {
        valid: false,
        reason: `Tree inconsistency: node ${ancestorId} not found.`,
      };
    }

    const wentLeft = idStr(ancestorNode.left) === childId;
    const wentRight = idStr(ancestorNode.right) === childId;

    if (!wentLeft && !wentRight) {
      return {
        valid: false,
        reason: `Tree inconsistency: ${childId} is not a direct child of ${ancestorId}.`,
      };
    }

    const hopSide: "left" | "right" = wentLeft ? "left" : "right";

    if (determinedSide === null) {
      determinedSide = hopSide;
    } else if (determinedSide !== hopSide) {
      return {
        valid: false,
        reason:
          "New sponsor must be in the extreme top-left or extreme top-right lineage " +
          "(the entire path from sponsor to user must follow one side only — all-left or all-right).",
      };
    }
  }

  // Edge-case: candidateSponsor is target's direct parent (chain length 2 → path has 1 hop only)
  // determinedSide would have been set on the single hop — that is fine.

  if (!determinedSide) {
    // Should only happen if the path had no hops, i.e. direct parent relation with 0 intermediate
    // Treat as valid — sponsor IS the direct parent, any side is fine
    // (direct parent's side check is implied by tree structure)
    // Find which side target sits under its direct parent
    const parentId = chain[1];
    const parentNode = await TreeNode.findOne({ user_id: parentId })
      .select("left right")
      .lean<{ left?: string | null; right?: string | null }>()
      .exec();
    if (parentNode) {
      determinedSide =
        idStr(parentNode.left) === targetUserId ? "left" : "right";
    } else {
      determinedSide = "left";
    }
  }

  return { valid: true, side: determinedSide };
}

/* ─── GET: look up user info for the popup ───────────────────────── */

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const userId = idStr(searchParams.get("user_id"));
    const sponsorId = idStr(searchParams.get("sponsor_id"));

    // Fetch user info
    if (userId && !sponsorId) {
      const user = await User.findOne({ user_id: userId })
        .select("user_id user_name user_status status_notes referBy")
        .lean<{
          user_id: string;
          user_name: string;
          user_status: string;
          status_notes?: string;
          referBy?: string;
        }>()
        .exec();

      if (!user) {
        return NextResponse.json(
          { success: false, message: "User not found" },
          { status: 404 },
        );
      }

      // Also fetch current sponsor's name so the modal can display it
      let current_referBy_name = "";
      if (user.referBy) {
        const sponsorDoc = await User.findOne({ user_id: user.referBy })
          .select("user_name")
          .lean<{ user_name: string }>()
          .exec();
        current_referBy_name = sponsorDoc?.user_name ?? "";
      }

      return NextResponse.json({
        success: true,
        data: {
          user_id: user.user_id,
          user_name: user.user_name,
          user_status: user.user_status,
          status_notes: user.status_notes ?? "",
          current_referBy: user.referBy ?? "",
          current_referBy_name, // ← NEW
        },
      });
    }

    // Fetch sponsor info (validate candidate)
    if (sponsorId) {
      const sponsor = await User.findOne({ user_id: sponsorId })
        .select("user_id user_name user_status status_notes")
        .lean<{
          user_id: string;
          user_name: string;
          user_status: string;
          status_notes?: string;
        }>()
        .exec();

      if (!sponsor) {
        return NextResponse.json(
          { success: false, message: "Sponsor not found" },
          { status: 404 },
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          sponsor_id: sponsor.user_id,
          sponsor_name: sponsor.user_name,
        },
      });
    }

    return NextResponse.json(
      { success: false, message: "Provide user_id or sponsor_id param" },
      { status: 400 },
    );
  } catch (err: any) {
    console.error("GET /api/change-sponsor error:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Internal server error" },
      { status: 500 },
    );
  }
}

/* ─── POST: validate + apply the sponsor change ─────────────────── */

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { admin_user_id, target_user_id, new_sponsor_id } = body;

    if (!admin_user_id || !target_user_id || !new_sponsor_id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "admin_user_id, target_user_id and new_sponsor_id are required.",
        },
        { status: 400 },
      );
    }

    // ── 1. Confirm requester is admin ──────────────────────────────
    const adminLogin = await Login.findOne({ user_id: idStr(admin_user_id) })
      .select("role")
      .lean<{ role?: string }>()
      .exec();

    const adminUser = await User.findOne({ user_id: idStr(admin_user_id) })
      .select("role")
      .lean<{ role?: string }>()
      .exec();

    // Login role takes priority
    const adminRole = adminLogin?.role || adminUser?.role;

    if (!adminRole || adminRole !== "admin") {
      return NextResponse.json(
        { success: false, message: "Access denied. Admin only." },
        { status: 403 },
      );
    }
    // ── 2. Fetch target user ───────────────────────────────────────
    const targetUser = await User.findOne({ user_id: idStr(target_user_id) })
      .select("user_id user_name user_status status_notes referBy")
      .lean<{
        user_id: string;
        user_name: string;
        user_status: string;
        status_notes?: string;
        referBy?: string;
      }>()
      .exec();

    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: "Target user not found." },
        { status: 404 },
      );
    }

    // ── 3. Target must be INACTIVE and NOT deactivated by admin ───
    const isInactive =
      targetUser.user_status === "inactive" || !targetUser.user_status;

    const isDeactivatedByAdmin =
      String(targetUser.status_notes ?? "")
        .trim()
        .toLowerCase() === "deactivated by admin";

    if (!isInactive || isDeactivatedByAdmin) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Sponsor can only be changed for INACTIVE users (not deactivated by admin).",
        },
        { status: 422 },
      );
    }

    // ── 4. New sponsor must exist ──────────────────────────────────
    const newSponsor = await User.findOne({ user_id: idStr(new_sponsor_id) })
      .select("user_id user_name")
      .lean<{ user_id: string; user_name: string }>()
      .exec();

    if (!newSponsor) {
      return NextResponse.json(
        { success: false, message: "New sponsor not found." },
        { status: 404 },
      );
    }

    // No-op check
    if (idStr(targetUser.referBy) === idStr(new_sponsor_id)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "New sponsor is the same as the current sponsor. No change made.",
        },
        { status: 422 },
      );
    }

    // ── 5. Tree placement validation ───────────────────────────────
    const validation = await validateNewSponsor(
      idStr(target_user_id),
      idStr(new_sponsor_id),
    );

    if (!validation.valid) {
      return NextResponse.json(
        { success: false, message: validation.reason },
        { status: 422 },
      );
    }

    // ── 6. Apply the change — only referBy in User + Login ────────
    //    Binary tree structure is NOT touched.
    const oldSponsorId = idStr(targetUser.referBy);

    await User.updateOne(
      { user_id: idStr(target_user_id) },
      { $set: { referBy: idStr(new_sponsor_id) } },
    ).exec();

    await Login.updateOne(
      { user_id: idStr(target_user_id) },
      { $set: { referBy: idStr(new_sponsor_id) } },
    ).exec();

    // ── 7. Update referred_users on old and new sponsor ──────────
    if (oldSponsorId) {
      await User.updateOne(
        { user_id: oldSponsorId },
        { $pull: { referred_users: idStr(target_user_id) } },
      ).exec();
    }

    await User.updateOne(
      { user_id: idStr(new_sponsor_id) },
      { $addToSet: { referred_users: idStr(target_user_id) } },
    ).exec();

    // Also update TreeNode refer_by field to stay in sync
    await TreeNode.updateOne(
      { user_id: idStr(target_user_id) },
      { $set: { refer_by: idStr(new_sponsor_id) } },
    ).exec();

    return NextResponse.json({
      success: true,
      message: `Sponsor changed successfully from ${oldSponsorId || "none"} to ${idStr(new_sponsor_id)}.`,
      data: {
        target_user_id: idStr(target_user_id),
        old_sponsor_id: oldSponsorId,
        new_sponsor_id: idStr(new_sponsor_id),
        side: validation.side,
      },
    });
  } catch (err: any) {
    console.error("POST /api/change-sponsor error:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Internal server error" },
      { status: 500 },
    );
  }
}

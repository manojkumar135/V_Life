import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import TreeNode from "@/models/tree";
import { User } from "@/models/user";

// Helper to recursively collect team members
async function collectTeam(userId, side, allNodes, collected = new Set()) {
  const node = allNodes.find((n) => n.user_id === userId);
  if (!node) return collected;

  const childId = node[side];
  if (childId) {
    collected.add(childId);
    await collectTeam(childId, "left", allNodes, collected);
    await collectTeam(childId, "right", allNodes, collected);
  }

  return collected;
}

// GET /api/team-operations?user_id=USER123&team=left&search=abc
export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get("user_id");
    const team = searchParams.get("team"); // "left" or "right"
    const search = searchParams.get("search") || "";

    if (!user_id || !team) {
      return NextResponse.json(
        { error: "user_id and team are required" },
        { status: 400 }
      );
    }

    // 1️⃣ Load all tree nodes (to avoid many queries in recursion)
    const allNodes = await TreeNode.find({}).lean();

    // 2️⃣ Find root node
    const root = allNodes.find((n) => n.user_id === user_id);
    if (!root) {
      return NextResponse.json({ data: [], total: 0 });
    }

    // 3️⃣ Collect user_ids of the given team
    const collectedIds = await collectTeam(user_id, team, allNodes);

    if (collectedIds.size === 0) {
      return NextResponse.json({ data: [], total: 0 });
    }

    // 4️⃣ Fetch user details from User table
    let users = await User.find({ user_id: { $in: [...collectedIds] } }).lean();

    // 5️⃣ Apply search filter if given
    if (search) {
      const regex = new RegExp(search, "i");
      users = users.filter(
        (u) =>
          regex.test(u.user_name) ||
          regex.test(u.mail) ||
          regex.test(u.contact || "")
      );
    }

    return NextResponse.json({
      data: users,
      total: users.length,
    });
  } catch (error) {
    console.error("❌ Error in /api/team-operations:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

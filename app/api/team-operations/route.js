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

// GET /api/team-operations?user_id=USER123&team=left&search=user,123456
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

    // 4️⃣ Build query
    let query = { user_id: { $in: [...collectedIds] } };

    if (search) {
      // Split by comma and trim spaces
      const searchTerms = search.split(",").map((s) => s.trim()).filter(Boolean);

      // Build OR conditions for each search term across all fields
      query.$or = searchTerms.flatMap((term) => {
        const regex = new RegExp("^" + term, "i");
        return [
          { user_id: regex },
          { user_name: regex },
          { mail: regex },
          { contact: regex },
          { address: regex },
          { pincode: regex },
          { country: regex },
          { state: regex },
          { district: regex },
          { locality: regex },
          { user_status: regex },
          { status_notes: regex }
        ];
      });
    }

    // 5️⃣ Fetch user details from User table with filtering in DB
    const users = await User.find(query).sort({ created_at: -1 }).lean();

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

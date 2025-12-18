import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import TreeNode from "@/models/tree";
import { User } from "@/models/user";

/* ---------------- TEAM COLLECTION (ITERATIVE – FASTER) ---------------- */
function collectTeamIterative(rootId, side, nodeMap) {
  const collected = new Set();
  const stack = [];

  const root = nodeMap.get(rootId);
  if (root?.[side]) stack.push(root[side]);

  while (stack.length) {
    const currentId = stack.pop();
    if (!currentId || collected.has(currentId)) continue;

    collected.add(currentId);
    const node = nodeMap.get(currentId);
    if (node?.left) stack.push(node.left);
    if (node?.right) stack.push(node.right);
  }

  return collected;
}

/* ---------------- API ---------------- */
export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get("user_id");
    const team = searchParams.get("team");
    const search = searchParams.get("search") || "";

    if (!user_id || !team) {
      return NextResponse.json(
        { error: "user_id and team are required" },
        { status: 400 }
      );
    }

    /* 1️⃣ LOAD TREE ONCE */
    const allNodes = await TreeNode.find({}).lean();

    const nodeMap = new Map();
    for (const n of allNodes) nodeMap.set(n.user_id, n);

    if (!nodeMap.has(user_id)) {
      return NextResponse.json({ data: [], total: 0 });
    }

    /* 2️⃣ COLLECT TEAM IDS (FAST) */
    const teamIds = collectTeamIterative(user_id, team, nodeMap);
    if (!teamIds.size) {
      return NextResponse.json({ data: [], total: 0 });
    }

    /* 3️⃣ USER QUERY */
    const query = { user_id: { $in: [...teamIds] } };

    if (search) {
      const terms = search
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      query.$or = terms.flatMap((term) => {
        const regex = new RegExp("^" + term, "i");
        return [
          { user_id: regex },
          { user_name: regex },
          { mail: regex },
          { contact: regex },
          { address: regex },
          { pincode: regex },
          { country: regex },
          { rank: regex },
          { state: regex },
          { district: regex },
          { locality: regex },
          { user_status: regex },
          { status_notes: regex },
        ];
      });
    }

    /* 4️⃣ FETCH USERS ONCE */
    const users = await User.find(query)
      .sort({ created_at: -1 })
      .lean();

    if (!users.length) {
      return NextResponse.json({ data: [], total: 0 });
    }

    /* 5️⃣ BUILD BV MAP (ONE QUERY ONLY) */
    const allInfinityIds = new Set();

    for (const u of users) {
      (u.infinity_left_users || []).forEach((id) =>
        allInfinityIds.add(id)
      );
      (u.infinity_right_users || []).forEach((id) =>
        allInfinityIds.add(id)
      );
    }

    const bvDocs = await User.find(
      { user_id: { $in: [...allInfinityIds] } },
      { user_id: 1, self_bv: 1 }
    ).lean();

    const bvMap = new Map(
      bvDocs.map((u) => [u.user_id, u.self_bv || 0])
    );

    /* 6️⃣ CALCULATE BV IN MEMORY */
    for (const user of users) {
      const leftBV = (user.infinity_left_users || []).reduce(
        (sum, id) => sum + (bvMap.get(id) || 0),
        0
      );

      const rightBV = (user.infinity_right_users || []).reduce(
        (sum, id) => sum + (bvMap.get(id) || 0),
        0
      );

      user.leftBV = leftBV;
      user.rightBV = rightBV;
      user.cumulativeBV =
        leftBV > 0 && rightBV > 0 ? Math.min(leftBV, rightBV) : 0;
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

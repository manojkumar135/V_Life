import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import TreeNode from "@/models/tree";
import { User } from "@/models/user";

/**
 * Collect DOWNLINE ONLY (binary children recursively)
 */
function collectDescendants(
  startId: string,
  nodeMap: Map<string, any>,
  collected: Set<string> = new Set()
): Set<string> {
  const node = nodeMap.get(startId);
  if (!node) return collected;

  if (node.left) {
    collected.add(node.left);
    collectDescendants(node.left, nodeMap, collected);
  }

  if (node.right) {
    collected.add(node.right);
    collectDescendants(node.right, nodeMap, collected);
  }

  return collected;
}

/**
 * Build binary subtree
 */
function buildTree(
  id: string | null,
  nodeMap: Map<string, any>,
  userMap: Map<string, any>
): any {
  if (!id) return null;
  const node = nodeMap.get(id);
  const user = userMap.get(id);

  const left = node.left ? buildTree(node.left, nodeMap, userMap) : null;
  const right = node.right ? buildTree(node.right, nodeMap, userMap) : null;

  const count = (n: any): number =>
    !n ? 0 : 1 + count(n.left) + count(n.right);

  return {
    user_id: node.user_id,
    name: node.name,
    contact: node.contact || "",
    mail: node.mail || "",
    user_status: node.status || "inactive",

    /** INFO ONLY — NO TREE TRAVERSAL */
    parent: node.parent || "",
    referBy: user?.referBy || "",
    infinity: user?.infinity ?? "none",
    infinityLeft: user?.infinty_left_count || 0,
    infinityRight: user?.infinty_right_count || 0,

    /** BUSINESS DATA */
    rank: user?.rank || "none",
    bv: user?.bv || 0,
    sv: user?.sv || 0,
    referrals: user?.referred_users?.length || 0,
    status_notes: user?.status_notes || "",

    /** TREE CHILDREN */
    left,
    right,

    leftCount: count(left),
    rightCount: count(right),
  };
}

export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);

    const user_id = searchParams.get("user_id"); // Logged in user
    const search = searchParams.get("search"); // Target

    if (!user_id) {
      return NextResponse.json(
        { success: false, message: "Missing user_id" },
        { status: 400 }
      );
    }

    /** Validate logged user */
    const loginUser = await User.findOne({ user_id }).lean();
    if (!loginUser) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    /** Load entire tree once */
    const allNodes = await TreeNode.find({}).lean();
    const nodeMap = new Map(allNodes.map((n) => [n.user_id, n]));

    /** Validate logged user in tree */
    if (!nodeMap.has(user_id)) {
      return NextResponse.json(
        { success: false, message: "Tree node not found" },
        { status: 404 }
      );
    }

    /** Collect all IDs below root */
    const downlineIds = collectDescendants(user_id, nodeMap);

    /**
     * SEARCH CHECK
     */
    if (search) {
      const s = search.trim().toLowerCase();

      let isDownline = false;
      for (const id of downlineIds) {
        if (id.toLowerCase() === s) {
          isDownline = true;
          break;
        }
      }

      /**
       * ❗️ STRICT RULE
       * If NOT found in downline → return error
       */
      if (!isDownline) {
        return NextResponse.json({
          success: false,
          message: "User not found in your downline",
        });
      }

      /** Build subtree from search node */
      const subtreeIds = collectDescendants(search, nodeMap);
      subtreeIds.add(search);

      const users = await User.find({
        user_id: { $in: Array.from(subtreeIds) },
      }).lean();

      const userMap = new Map(users.map((u) => [u.user_id, u]));

      const tree = buildTree(search, nodeMap, userMap);

      return NextResponse.json({
        success: true,
        startFrom: search,
        data: tree,
      });
    }

    /**
     * NO SEARCH → return root tree
     */
    const allowed = new Set([user_id, ...downlineIds]);

    const users = await User.find({
      user_id: { $in: Array.from(allowed) },
    }).lean();

    const userMap = new Map(users.map((u) => [u.user_id, u]));

    const tree = buildTree(user_id, nodeMap, userMap);

    return NextResponse.json({
      success: true,
      startFrom: user_id,
      data: tree,
    });
  } catch (err: any) {
    console.error("TREE ERROR:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Server error" },
      { status: 500 }
    );
  }
}

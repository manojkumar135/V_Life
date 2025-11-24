import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import TreeNode from "@/models/tree";
import { User } from "@/models/user";

/**
 * Collect DOWNLINE ONLY children
 */
function collectDescendants(
  startId: string,
  nodeMap: Map<string, any>,
  collected: Set<string> = new Set()
): Set<string> {
  if (!startId || collected.has(startId)) return collected;
  collected.add(startId);

  const node = nodeMap.get(startId);
  if (!node) return collected;

  // ONLY children allowed (never parent / sponsor)
  if (node.left) collectDescendants(node.left, nodeMap, collected);
  if (node.right) collectDescendants(node.right, nodeMap, collected);

  return collected;
}

/**
 * Safe search ONLY inside downline
 */
function searchNode(
  nodeId: string | null,
  nodeMap: Map<string, any>,
  searchLower: string,
  allowedIds: Set<string>
): string | null {
  if (!nodeId || !allowedIds.has(nodeId)) return null;
  const node = nodeMap.get(nodeId);
  if (!node) return null;

  if (
    node.user_id.toLowerCase() === searchLower ||
    (node.name && node.name.toLowerCase().includes(searchLower))
  ) {
    return node.user_id;
  }

  if (node.left) {
    const found = searchNode(node.left, nodeMap, searchLower, allowedIds);
    if (found) return found;
  }
  if (node.right) {
    const found = searchNode(node.right, nodeMap, searchLower, allowedIds);
    if (found) return found;
  }
  return null;
}

/**
 * Build tree DOWNWARD only
 */
function buildTree(
  id: string | null,
  nodeMap: Map<string, any>,
  userMap: Map<string, any>,
  allowedIds: Set<string>
): any {
  // node rejected if not part of allowed subtree
  if (!id || !allowedIds.has(id)) return null;

  const node = nodeMap.get(id);
  const user = userMap.get(id);

  // Recursively build ONLY children inside subtree
  const left =
    node.left && allowedIds.has(node.left)
      ? buildTree(node.left, nodeMap, userMap, allowedIds)
      : null;

  const right =
    node.right && allowedIds.has(node.right)
      ? buildTree(node.right, nodeMap, userMap, allowedIds)
      : null;

  // count subtree users
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
    const user_id = searchParams.get("user_id");
    const search = searchParams.get("search");

    if (!user_id) {
      return NextResponse.json(
        { success: false, message: "Missing user_id" },
        { status: 400 }
      );
    }

    /** Load login user */
    const loginUser = await User.findOne({ user_id }).lean();
    if (!loginUser) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    const role = loginUser.role || "user";

    /** Validate login user node */
    const selfNode = await TreeNode.findOne({ user_id }).lean();
    if (!selfNode) {
      return NextResponse.json(
        { success: false, message: "Tree node not found" },
        { status: 404 }
      );
    }

    /** Fetch whole tree once */
    const allNodes = await TreeNode.find({}).lean();
    const nodeMap = new Map(allNodes.map((n) => [n.user_id, n]));

    /**
     * 🔥 KEY ACCESS CONTROL
     * Always collect from login user DOWNWARDS ONLY
     */
    const downlineIds = collectDescendants(user_id, nodeMap);

    /** Load user docs only for allowed nodes */
    const userDocs = await User.find({
      user_id: { $in: Array.from(downlineIds) },
    }).lean();
    const userMap = new Map(userDocs.map((u) => [u.user_id, u]));

    /** Build tree only from logged user ID */
    const tree = buildTree(user_id, nodeMap, userMap, downlineIds);

    /** SEARCH */
    if (search) {
      const q = search.trim().toLowerCase();

      /** ADMIN → global search */
      if (role === "admin") {
        const found = allNodes.find(
          (n) =>
            n.user_id.toLowerCase() === q ||
            (n.name && n.name.toLowerCase().includes(q))
        );

        if (!found)
          return NextResponse.json({
            success: false,
            message: "User not found",
          });

        return NextResponse.json({
          success: true,
          data: tree,
          highlight: found.user_id,
          role,
        });
      }

      /** USER → downline search only */
      const highlight = searchNode(user_id, nodeMap, q, downlineIds);

      if (!highlight) {
        return NextResponse.json({
          success: false,
          message: "User not found in your downline",
        });
      }

      return NextResponse.json({
        success: true,
        data: tree,
        highlight,
        role,
      });
    }

    /** Default return tree for logged user */
    return NextResponse.json({
      success: true,
      role,
      downlineCount: downlineIds.size,
      data: tree,
    });
  } catch (err: any) {
    console.error("TREE API ERROR:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Server error" },
      { status: 500 }
    );
  }
}

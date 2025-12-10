import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import TreeNode from "@/models/tree";
import { User } from "@/models/user";

/** Collect DOWNLINE ONLY (binary children recursively) */
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

/** Pre-calculate infinity PV/BV in userMap */
function calculateInfinityValues(userMap: Map<string, any>) {
  for (const [id, user] of userMap) {
    const leftUsers = user.infinity_left_users || [];
    const rightUsers = user.infinity_right_users || [];

    const leftDocs = leftUsers.map((uId: string) => userMap.get(uId));
    const rightDocs = rightUsers.map((uId: string) => userMap.get(uId));

    user.leftBV = leftDocs.reduce((s: number, u: { bv?: number } | undefined) => s + (u?.bv || 0), 0);
    user.rightBV = rightDocs.reduce((s: number, u: { bv?: number } | undefined) => s + (u?.bv || 0), 0);

    user.leftPV = leftDocs.reduce((s: number, u: { pv?: number } | undefined) => s + (u?.pv || 0), 0);
    user.rightPV = rightDocs.reduce((s: number, u: { pv?: number } | undefined) => s + (u?.pv || 0), 0);
  }
}

/** Build binary subtree */
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

    parent: node.parent || "",
    referBy: user?.referBy || "",
    infinity: user?.infinity ?? "none",
    infinityLeft: user?.infinty_left_count || 0,
    infinityRight: user?.infinty_right_count || 0,

    rank: user?.rank || "none",
    bv: user?.bv || 0,
    pv: user?.pv || 0,
    referrals: user?.referred_users?.length || 0,
    status_notes: user?.status_notes || "",

    /** 💥 Infinity values added here */
    leftBV: user?.leftBV ?? 0,
    rightBV: user?.rightBV ?? 0,
    leftPV: user?.leftPV ?? 0,
    rightPV: user?.rightPV ?? 0,

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

    if (!user_id)
      return NextResponse.json({ success: false, message: "Missing user_id" });

    const loginUser = await User.findOne({ user_id }).lean();
    if (!loginUser)
      return NextResponse.json({ success: false, message: "User not found" });

    const allNodes = await TreeNode.find({}).lean();
    const nodeMap = new Map(allNodes.map((n) => [n.user_id, n]));

    if (!nodeMap.has(user_id))
      return NextResponse.json({
        success: false,
        message: "Tree node not found",
      });

    const downlineIds = collectDescendants(user_id, nodeMap);

    /** SEARCH CASE */
    if (search) {
      const s = search.trim().toLowerCase();
      const match = Array.from(downlineIds).find(
        (id) => id.toLowerCase() === s
      );

      if (!match)
        return NextResponse.json({
          success: false,
          message: "User not in your downline",
        });

      const subtreeIds = collectDescendants(search, nodeMap);
      subtreeIds.add(search);

      const users = await User.find({
        user_id: { $in: Array.from(subtreeIds) },
      }).lean();
      const userMap = new Map(users.map((u) => [u.user_id, u]));

      calculateInfinityValues(userMap);
      const tree = buildTree(search, nodeMap, userMap);

      return NextResponse.json({
        success: true,
        startFrom: search,
        data: tree,
      });
    }

    /** ROOT CASE */
    const allowedIds = new Set([user_id, ...downlineIds]);

    const users = await User.find({
      user_id: { $in: Array.from(allowedIds) },
    }).lean();
    const userMap = new Map(users.map((u) => [u.user_id, u]));

    calculateInfinityValues(userMap);
    const tree = buildTree(user_id, nodeMap, userMap);

    return NextResponse.json({
      success: true,
      startFrom: user_id,
      data: tree,
    });
  } catch (err: any) {
    console.error("TREE ERROR:", err);
    return NextResponse.json({ success: false, message: err.message });
  }
}

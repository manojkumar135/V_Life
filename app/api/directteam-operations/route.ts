import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/user";
import TreeNode from "@/models/tree";

export interface UserType {
  user_id: string;
  user_name?: string;
  mail?: string;
  contact?: string;
  referred_users?: string[];
}

interface TreeNodeType {
  user_id: string;
  left?: string | null;
  right?: string | null;
  parent?: string | null;
}

/** 🧩 Helper: find if target is in left or right team of root */
function findTeamPosition(
  targetId: string,
  rootId: string,
  nodeMap: Map<string, TreeNodeType>
): "left" | "right" | null {
  let current = nodeMap.get(targetId);
  if (!current) return null;

  while (current?.parent) {
    const parent = nodeMap.get(current.parent);
    if (!parent) break;

    // if parent is root, we can decide immediately
    if (parent.user_id === rootId) {
      if (parent.left === current.user_id) return "left";
      if (parent.right === current.user_id) return "right";
    }

    // move upward
    current = parent;
  }

  // if we reached here, go upward recursively to find root path
  const parent = nodeMap.get(current?.parent || "");
  if (!parent) return null;
  return findTeamPosition(parent.user_id, rootId, nodeMap);
}

export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const rootId = searchParams.get("user_id");

    if (!rootId) {
      return NextResponse.json({ error: "user_id is required" }, { status: 400 });
    }

    const rootUser = await User.findOne({ user_id: rootId }).lean<UserType>();
    if (!rootUser || !rootUser.referred_users?.length) {
      return NextResponse.json({ data: [], total: 0 });
    }

    // Fetch all nodes
    const allNodes: TreeNodeType[] = await TreeNode.find({}).lean<TreeNodeType[]>();
    const nodeMap = new Map<string, TreeNodeType>();
    allNodes.forEach((n) => nodeMap.set(n.user_id, n));

    const result = [];
    for (const refId of rootUser.referred_users) {
      const team = findTeamPosition(refId, rootId, nodeMap);
      const user = await User.findOne({ user_id: refId }).lean<UserType>();

      if (user) result.push({ ...user, team });
    }

    return NextResponse.json({ data: result, total: result.length });
  } catch (error) {
    console.error("❌ Error in /api/directteam-operations:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

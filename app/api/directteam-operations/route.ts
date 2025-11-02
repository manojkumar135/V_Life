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

/** 🔍 Helper to get both team and level */
function findLevelAndTeam(
  targetId: string,
  rootId: string,
  nodeMap: Map<string, TreeNodeType>
): { team: "left" | "right" | null; level: number | null } {
  if (targetId === rootId) return { team: null, level: 0 };

  let current = nodeMap.get(targetId);
  if (!current) return { team: null, level: null };

  let level = 0;
  let team: "left" | "right" | null = null;

  while (current?.parent) {
    const parent = nodeMap.get(current.parent);
    if (!parent) break;

    level++;

    if (parent.user_id === rootId) {
      if (parent.left === current.user_id) team = "left";
      if (parent.right === current.user_id) team = "right";
      return { team, level };
    }

    current = parent;
  }

  return { team: null, level: null };
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

    const allNodes: TreeNodeType[] = await TreeNode.find({}).lean<TreeNodeType[]>();
    const nodeMap = new Map(allNodes.map((n) => [n.user_id, n]));

    const referredUsers = await User.find({
      user_id: { $in: rootUser.referred_users }
    }).lean<UserType[]>();

    const result = referredUsers.map((user) => {
      const { team, level } = findLevelAndTeam(user.user_id, rootId, nodeMap);
      return { ...user, team, level };
    });

    return NextResponse.json({ data: result, total: result.length });
  } catch (error) {
    console.error("❌ Error in /api/directteam-operations:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

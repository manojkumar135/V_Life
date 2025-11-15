import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/user";
import TreeNode from "@/models/tree";
import { History } from "@/models/history";

// ----------------- Types -----------------
export interface InfinityLevel {
  level: number;
  users: string[];
}

export interface UserType {
  user_id: string;
  user_name?: string;
  mail?: string;
  contact?: string;
  address?: string;
  pincode?: string;
  country?: string;
  state?: string;
  district?: string;
  locality?: string;
  user_status?: string;
  infinity_users?: InfinityLevel[];
}

export interface TreeNodeType {
  _id?: any;
  user_id: string;
  left?: string | null;
  right?: string | null;
  parent?: string | null;
}

// ----------------- GET API -----------------
export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const rootId = searchParams.get("user_id");

    if (!rootId) {
      return NextResponse.json(
        { error: "user_id is required" },
        { status: 400 }
      );
    }

    // 1️⃣ Fetch root user with infinity_users
    const rootUser = await User.findOne({
      user_id: rootId,
    })
    .lean<UserType | null>();

    if (!rootUser?.infinity_users || rootUser.infinity_users.length === 0) {
      return NextResponse.json({ data: [], total: 0 });
    }

    // 2️⃣ Fetch tree nodes for team mapping
    const allNodes = await TreeNode.find({}).lean<TreeNodeType[]>();
    const nodeMapByUser = new Map<string, TreeNodeType>();
    const nodeMapById = new Map<string, TreeNodeType>();
    allNodes.forEach((node) => {
      if (node.user_id) nodeMapByUser.set(node.user_id, node);
      if (node._id) nodeMapById.set(String(node._id), node);
    });

    // helper: resolve a reference (could be user_id string OR ObjectId string) -> user_id
    function resolveUserIdFromRef(ref: any): string | undefined {
      if (!ref) return undefined;
      const s = String(ref);
      // if direct user_id present in user map
      if (nodeMapByUser.has(s)) return s;
      // if it's an _id reference
      const byId = nodeMapById.get(s);
      if (byId && byId.user_id) return byId.user_id;
      // fallback: try to find node whose _id matches this ref
      for (const n of nodeMapByUser.values()) {
        if (String(n._id) === s) return n.user_id;
      }
      return undefined;
    }

    // helper: find node object from either user_id or _id ref
    function getNodeFromRef(ref: any): TreeNodeType | undefined {
      if (!ref) return undefined;
      const s = String(ref);
      if (nodeMapByUser.has(s)) return nodeMapByUser.get(s);
      if (nodeMapById.has(s)) return nodeMapById.get(s);
      return undefined;
    }

    // helper: determine left/right/unknown for target under root
    function determineTeamUnderRoot(
      rootNode: TreeNodeType | undefined,
      targetNode: TreeNodeType | undefined
    ): "left" | "right" | "unknown" {
      if (!rootNode || !targetNode) return "unknown";

      // walk upward from targetNode until we reach rootNode (or run out)
      let current: TreeNodeType | undefined = targetNode;
      while (current && current.parent) {
        const parentUserId = resolveUserIdFromRef(current.parent);
        if (!parentUserId) break;

        if (parentUserId === rootNode.user_id) {
          // current is direct child under rootNode
          const directChildUserId = current.user_id;
          const leftUserId = resolveUserIdFromRef(rootNode.left);
          const rightUserId = resolveUserIdFromRef(rootNode.right);
          if (leftUserId && leftUserId === directChildUserId) return "left";
          if (rightUserId && rightUserId === directChildUserId) return "right";
          return "unknown";
        }

        // move up
        current = getNodeFromRef(parentUserId);
      }

      return "unknown";
    }

    // prepare root node object (by user or by _id)
    const rootNode =
      nodeMapByUser.get(rootId) ||
      (() => {
        // try id lookup
        for (const n of nodeMapByUser.values()) {
          if (String(n._id) === rootId) return n;
        }
        return undefined;
      })();

    // 3️⃣ Process infinity levels
    const results: (UserType & { level: number; team: string })[] = [];
    const seenUserIds = new Set<string>();

    for (const levelObj of rootUser.infinity_users) {
      const { level, users } = levelObj;

      for (const uid of users) {
        if (!uid) continue;
        if (seenUserIds.has(uid)) continue; // skip duplicates
        seenUserIds.add(uid);

        const userData = await User.findOne({ user_id: uid })
          .sort({ createdAt: -1 })
          .lean<UserType>();
        if (!userData) continue;

        // ✅ Check if user has paid advance (amount >= 10000 and status Completed)
        const advanceHistory = await History.findOne({
          user_id: uid,
          advance: true,
          amount: { $gte: 10000 },
          status: "Completed",
        });

        if (!advanceHistory) continue; // skip if user hasn't paid advance

        // Determine team (left/right/unknown) using tree structure by walking upward
        const targetNode = nodeMapByUser.get(uid) || getNodeFromRef(uid);
        const team = determineTeamUnderRoot(rootNode, targetNode);

        results.push({
          ...userData,
          level,
          team,
        });
      }
    }

    return NextResponse.json({
      data: results,
      total: results.length,
    });
  } catch (error) {
    console.error("❌ Error in /api/infinityteam:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

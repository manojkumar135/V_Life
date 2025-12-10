// import { infinity } from '@/services/infinity';
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
  rank?: string;
  user_status?: string;
  infinity_users?: InfinityLevel[];
  infinity_left_users?: string[];
  infinity_right_users?: string[];
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
    const search = searchParams.get("search") || "";

    if (!rootId) {
      return NextResponse.json(
        { error: "user_id is required" },
        { status: 400 }
      );
    }

    // 1️⃣ Fetch root user with infinity_users
    const rootUser = await User.findOne({
      user_id: rootId,
    }).lean<UserType | null>();

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

    function resolveUserIdFromRef(ref: any): string | undefined {
      if (!ref) return undefined;
      const s = String(ref);
      if (nodeMapByUser.has(s)) return s;
      const byId = nodeMapById.get(s);
      if (byId && byId.user_id) return byId.user_id;
      for (const n of nodeMapByUser.values()) {
        if (String(n._id) === s) return n.user_id;
      }
      return undefined;
    }

    function getNodeFromRef(ref: any): TreeNodeType | undefined {
      if (!ref) return undefined;
      const s = String(ref);
      if (nodeMapByUser.has(s)) return nodeMapByUser.get(s);
      if (nodeMapById.has(s)) return nodeMapById.get(s);
      return undefined;
    }

    function determineTeamUnderRoot(
      rootNode: TreeNodeType | undefined,
      targetNode: TreeNodeType | undefined
    ): "left" | "right" | "unknown" {
      if (!rootNode || !targetNode) return "unknown";
      let current: TreeNodeType | undefined = targetNode;
      while (current && current.parent) {
        const parentUserId = resolveUserIdFromRef(current.parent);
        if (!parentUserId) break;
        if (parentUserId === rootNode.user_id) {
          const directChildUserId = current.user_id;
          const leftUserId = resolveUserIdFromRef(rootNode.left);
          const rightUserId = resolveUserIdFromRef(rootNode.right);
          if (leftUserId && leftUserId === directChildUserId) return "left";
          if (rightUserId && rightUserId === directChildUserId) return "right";
          return "unknown";
        }
        current = getNodeFromRef(parentUserId);
      }
      return "unknown";
    }

    const rootNode =
      nodeMapByUser.get(rootId) ||
      (() => {
        for (const n of nodeMapByUser.values()) {
          if (String(n._id) === rootId) return n;
        }
        return undefined;
      })();

    // 3️⃣ Process infinity levels
    const results: (UserType & {
      level: number;
      team: string;
      leftBV: number;
      rightBV: number;
      cumulativeBV: number;
    })[] = [];

    const seenUserIds = new Set<string>();

    for (const levelObj of rootUser.infinity_users) {
      const { level, users } = levelObj;

      for (const uid of users) {
        if (!uid) continue;
        if (seenUserIds.has(uid)) continue;
        seenUserIds.add(uid);

        const userData = await User.findOne({ user_id: uid })
          .sort({ createdAt: -1 })
          .lean<UserType>();
        if (!userData) continue;

        const targetNode = nodeMapByUser.get(uid) || getNodeFromRef(uid);
        const team = determineTeamUnderRoot(rootNode, targetNode);

        // 🔥 Cumulative BV calculation added
        const leftUsers = userData.infinity_left_users || [];
        const rightUsers = userData.infinity_right_users || [];

        const leftUserDocs = await User.find(
          { user_id: { $in: leftUsers } },
          { self_bv: 1 }
        ).lean();

        const rightUserDocs = await User.find(
          { user_id: { $in: rightUsers } },
          { self_bv: 1 }
        ).lean();

        const leftBV = leftUserDocs.reduce(
          (sum, u) => sum + (u.self_bv || 0),
          0
        );
        const rightBV = rightUserDocs.reduce(
          (sum, u) => sum + (u.self_bv || 0),
          0
        );

        const cumulativeBV =
          leftBV > 0 && rightBV > 0 ? Math.min(leftBV, rightBV) : 0;

        results.push({
          ...userData,
          level,
          team,
          leftBV,
          rightBV,
          cumulativeBV,
        });
      }
    }

    // 🔍 4️⃣ Apply Search (unchanged)
    let finalResults = results;

    if (search) {
      const terms = search
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .map((t) => t.toLowerCase());

      finalResults = results.filter((item) => {
        const values = [
          item.user_id,
          item.user_name,
          item.mail,
          item.contact,
          item.address,
          item.pincode,
          item.country,
          item.state,
          item.district,
          item.locality,
          item.user_status,
          item.rank,
          String(item.level),
          item.team,
        ]
          .filter(Boolean)
          .map((v) => String(v).toLowerCase());

        return terms.every((term) =>
          values.some((field) => field.startsWith(term))
        );
      });
    }

    return NextResponse.json({
      data: finalResults,
      total: finalResults.length,
    });
  } catch (error) {
    console.error("❌ Error in /api/infinityteam:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

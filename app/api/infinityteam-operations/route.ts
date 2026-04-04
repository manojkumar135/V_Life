import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/user";
import TreeNode from "@/models/tree";

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
  infinity?: string;
  infinity_users?: InfinityLevel[];
  infinity_left_users?: string[];
  infinity_right_users?: string[];
  self_bv?: number;
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

    // 1) Fetch root user — only need infinity_users for level lookup
    const rootUser = await User.findOne({ user_id: rootId })
      .lean<UserType | null>();

    if (!rootUser) {
      return NextResponse.json({ data: [], total: 0 });
    }

    // 2) Build level lookup map from rootUser.infinity_users
    //    This is used as a reference only — NOT as the source of who's in the team.
    //    Key: user_id → level number
    const levelMap = new Map<string, number>();
    if (Array.isArray(rootUser.infinity_users)) {
      for (const lvlObj of rootUser.infinity_users) {
        if (!Array.isArray(lvlObj.users)) continue;
        for (const uid of lvlObj.users) {
          if (uid && !levelMap.has(uid)) {
            levelMap.set(uid, lvlObj.level);
          }
        }
      }
    }

    // 3) SOURCE OF TRUTH: fetch all users whose infinity field === rootId
    //    This prevents duplicates and stale infinity_users data from
    //    affecting what's shown — each user can only have one infinity value.
    const teamMembers = await User.find(
      { infinity: rootId },
      {
        user_id: 1,
        user_name: 1,
        mail: 1,
        contact: 1,
        address: 1,
        pincode: 1,
        country: 1,
        state: 1,
        district: 1,
        locality: 1,
        rank: 1,
        user_status: 1,
        infinity: 1,
        infinity_left_users: 1,
        infinity_right_users: 1,
        self_bv: 1,
      }
    )
      .lean<UserType[]>();

    if (teamMembers.length === 0) {
      return NextResponse.json({ data: [], total: 0 });
    }

    // 4) Load all TreeNodes into maps for side + level detection
    const allNodes = await TreeNode.find(
      {},
      { user_id: 1, parent: 1, left: 1, right: 1 }
    ).lean<TreeNodeType[]>();

    const nodeMapByUser = new Map<string, TreeNodeType>();
    const nodeMapById = new Map<string, TreeNodeType>();
    for (const node of allNodes) {
      if (node.user_id) nodeMapByUser.set(node.user_id, node);
      if (node._id) nodeMapById.set(String(node._id), node);
    }

    // Resolve a ref (user_id string or ObjectId string) to user_id
    function resolveUserId(ref: any): string | undefined {
      if (!ref) return undefined;
      const s = String(ref);
      if (nodeMapByUser.has(s)) return s;
      const byId = nodeMapById.get(s);
      if (byId?.user_id) return byId.user_id;
      return undefined;
    }

    function getNodeForUser(uid: string): TreeNodeType | undefined {
      return nodeMapByUser.get(uid);
    }

    // Walk up the tree from targetNode until we hit rootNode,
    // then check whether the direct child under root is left or right.
    function determineTeam(
      rootNode: TreeNodeType | undefined,
      targetNode: TreeNodeType | undefined
    ): "left" | "right" | "unknown" {
      if (!rootNode || !targetNode) return "unknown";
      let current: TreeNodeType | undefined = targetNode;
      while (current?.parent) {
        const parentUserId = resolveUserId(current.parent);
        if (!parentUserId) break;
        if (parentUserId === rootNode.user_id) {
          const leftUserId = resolveUserId(rootNode.left);
          const rightUserId = resolveUserId(rootNode.right);
          if (leftUserId && leftUserId === current.user_id) return "left";
          if (rightUserId && rightUserId === current.user_id) return "right";
          return "unknown";
        }
        current = getNodeForUser(parentUserId);
      }
      return "unknown";
    }

    // Walk up the tree from childId to rootId, counting hops.
    // Returns the level (1 = direct child of root) or 0 if not found.
    function getLevelFromTree(rootUserId: string, childUserId: string): number {
      let level = 1;
      let current = getNodeForUser(childUserId);
      if (!current) return 0;
      while (current?.parent) {
        const parentUserId = resolveUserId(current.parent);
        if (!parentUserId) break;
        if (parentUserId === rootUserId) return level;
        level++;
        current = getNodeForUser(parentUserId);
        if (level > 50) break; // safety cap
      }
      return 0;
    }

    const rootNode = getNodeForUser(rootId);

    // 5) Collect all self_bv values in one batch query for BV calculations
    //    (team members' side users are already embedded in the docs above)
    //    We need self_bv of users inside each member's left/right teams.
    //    Gather all referenced IDs first.
    const allSideUserIds = new Set<string>();
    for (const member of teamMembers) {
      for (const id of member.infinity_left_users ?? []) allSideUserIds.add(id);
      for (const id of member.infinity_right_users ?? []) allSideUserIds.add(id);
    }

    // Batch fetch self_bv for all side users in one query
    const sideUserBvDocs = await User.find(
      { user_id: { $in: [...allSideUserIds] } },
      { user_id: 1, self_bv: 1 }
    ).lean<{ user_id: string; self_bv?: number }[]>();

    const bvByUserId = new Map<string, number>();
    for (const doc of sideUserBvDocs) {
      bvByUserId.set(doc.user_id, doc.self_bv ?? 0);
    }

    // 6) Build final results
    const results = teamMembers.map((member) => {
      const targetNode = getNodeForUser(member.user_id);
      const team = determineTeam(rootNode, targetNode);

      // Level: prefer levelMap (from infinity_users) for speed,
      // fall back to tree traversal if not present (handles stale/missing entries)
      const level =
        levelMap.get(member.user_id) ??
        getLevelFromTree(rootId, member.user_id) ??
        0;

      // BV calculations using batched data
      const leftBV = (member.infinity_left_users ?? []).reduce(
        (sum, uid) => sum + (bvByUserId.get(uid) ?? 0),
        0
      );
      const rightBV = (member.infinity_right_users ?? []).reduce(
        (sum, uid) => sum + (bvByUserId.get(uid) ?? 0),
        0
      );
      const cumulativeBV =
        leftBV > 0 && rightBV > 0 ? Math.min(leftBV, rightBV) : 0;

      return {
        ...member,
        level,
        team,
        leftBV,
        rightBV,
        cumulativeBV,
      };
    });

    // Sort by level ascending so UI shows the closest members first
    results.sort((a, b) => a.level - b.level);

    // 7) Apply search filter
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
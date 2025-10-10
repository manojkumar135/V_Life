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
    }).lean<UserType | null>();
    if (!rootUser?.infinity_users || rootUser.infinity_users.length === 0) {
      return NextResponse.json({ data: [], total: 0 });
    }

    // 2️⃣ Fetch tree nodes for team mapping
    const allNodes = await TreeNode.find({}).lean<TreeNodeType[]>();
    const nodeMap = new Map<string, TreeNodeType>();
    allNodes.forEach((node) => nodeMap.set(node.user_id, node));

    // 3️⃣ Process infinity levels
    const results: (UserType & { level: number; team: string })[] = [];
    const seenUserIds = new Set<string>();

    for (const levelObj of rootUser.infinity_users) {
      const { level, users } = levelObj;

      for (const uid of users) {
        if (seenUserIds.has(uid)) continue; // skip duplicates
        seenUserIds.add(uid);

        const userData = await User.findOne({ user_id: uid }).lean<UserType>();
        if (!userData) continue;

        // ✅ Check if user has paid advance (amount >= 10000 and status Completed)
        const advanceHistory = await History.findOne({
          user_id: uid,
          advance: true,
          amount: { $gte: 10000 },
          status: "Completed",
        });

        if (!advanceHistory) continue; // skip if user hasn't paid advance

        // Determine team (left/right/unknown) using tree structure
        let team: "left" | "right" | "unknown" = "unknown";
        const node = nodeMap.get(uid);
        if (node?.parent) {
          const parentNode = nodeMap.get(node.parent);
          if (parentNode?.left === uid) team = "left";
          if (parentNode?.right === uid) team = "right";
        }

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

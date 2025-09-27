import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/user";
import TreeNode from "@/models/tree";

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
  referred_users?: string[];
}

interface TreeNodeType {
  user_id: string;
  left?: string | null;
  right?: string | null;
  parent?: string | null;
}

export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const rootId = searchParams.get("user_id");
    const search = searchParams.get("search") || "";

    if (!rootId) {
      return NextResponse.json({ error: "user_id is required" }, { status: 400 });
    }

    // 1️⃣ Fetch root user
    const rootUser = await User.findOne({ user_id: rootId }).lean<UserType>();
    if (!rootUser || !rootUser.referred_users || rootUser.referred_users.length === 0) {
      return NextResponse.json({ data: [], total: 0 });
    }

    // 2️⃣ Fetch all tree nodes to determine team
    const allNodes: TreeNodeType[] = await TreeNode.find({}).lean<TreeNodeType[]>();
    const nodeMap = new Map<string, TreeNodeType>();
    allNodes.forEach((node) => nodeMap.set(node.user_id, node));

    // 3️⃣ Determine team (left or right) for each referred_user
    const usersWithTeam: (UserType & { team: "left" | "right" })[] = [];

    for (const refId of rootUser.referred_users) {
      const node = nodeMap.get(refId);
      if (!node) continue;

      let team: "left" | "right" = "left"; // default

      // Check if this node is left or right child of root
      const rootNode = nodeMap.get(rootId);
      if (rootNode?.left === refId) team = "left";
      else if (rootNode?.right === refId) team = "right";

      // Fetch referred user details
      const userData = await User.findOne({ user_id: refId }).lean<UserType>();
      if (userData) {
        usersWithTeam.push({ ...userData, team });
      }
    }

    // 4️⃣ Optional search
    let filteredUsers = usersWithTeam;
    if (search.trim()) {
      const searchTerms = search.split(",").map((s) => s.trim()).filter(Boolean);
      filteredUsers = usersWithTeam.filter((user) =>
        searchTerms.some((term) =>
          Object.values(user)
            .filter((v) => typeof v === "string")
            .some((val) => val!.toLowerCase().startsWith(term.toLowerCase()))
        )
      );
    }

    return NextResponse.json({ data: filteredUsers, total: filteredUsers.length });
  } catch (error) {
    console.error("❌ Error in /api/directteam-operations:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

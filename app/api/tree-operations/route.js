import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import TreeNode from "@/models/tree";
import { User } from "@/models/user";

// 🛠 Recursive builder with counts + User details
async function buildTree(userId) {
  if (!userId) return null;

  // Fetch from Tree structure
  const node = await TreeNode.findOne({ user_id: userId }).lean();
  if (!node) return null;

  // Fetch user details
  const user = await User.findOne({ user_id: userId }).lean();

  // Recursively build children
  const leftNode = node.left ? await buildTree(node.left) : null;
  const rightNode = node.right ? await buildTree(node.right) : null;

  // Count members in left & right subtrees
  const countMembers = (subtree) => {
    if (!subtree) return 0;
    return 1 + countMembers(subtree.left) + countMembers(subtree.right);
  };

  return {
    user_id: node.user_id,
    name: node.name,
    user_status: node.status || "inactive",
    rank: user?.rank || "none",
    contact: node.contact || "",
    mail: node.mail || "",
    parent: node.parent || "",

    // ✅ From User collection
    bv: user?.bv || 0,
    sv: user?.sv || 0,
    referBy: user?.referBy || "",
    referrals: user?.referred_users?.length || 0,

    // ✅ Binary structure
    left: leftNode,
    right: rightNode,

    // ✅ Counts
    leftCount: countMembers(leftNode),
    rightCount: countMembers(rightNode),
  };
}

// 📌 API handler
export async function GET(req) {
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

    // 🌳 Build full binary tree for the root
    const tree = await buildTree(user_id);
    if (!tree) {
      return NextResponse.json(
        { success: false, message: "Tree not found" },
        { status: 404 }
      );
    }

    // 🔍 Search logic
    if (search) {
      const searchLower = search.toLowerCase();

      const findNode = (node) => {
        if (!node) return null;
        if (
          node.user_id.toLowerCase() === searchLower ||
          (node.name && node.name.toLowerCase().includes(searchLower))
        ) {
          return node;
        }
        return findNode(node.left) || findNode(node.right);
      };

      const foundNode = findNode(tree);
      return NextResponse.json({
        success: true,
        data: tree,
        highlight: foundNode ? foundNode.user_id : null,
      });
    }

    return NextResponse.json({ success: true, data: tree });
  } catch (error) {
    console.error("❌ Error in tree-operations API:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Server error" },
      { status: 500 }
    );
  }
}

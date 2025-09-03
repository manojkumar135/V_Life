import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import TreeNode from "@/models/tree";

// 🛠 Recursive tree builder
async function buildTree(userId) {
  if (!userId) return null;

  const node = await TreeNode.findOne({ user_id: userId }).lean();
  if (!node) return null;

  return {
    user_id: node.user_id,
    name: node.name,
    user_status: node.status || "inactive",
    contact: node.contact || "",
    mail: node.mail || "",
    left: node.left ? await buildTree(node.left) : null,
    right: node.right ? await buildTree(node.right) : null,
  };
}

// 📌 GET handler
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

    // 🌳 Build full binary tree
    const tree = await buildTree(user_id);
    if (!tree) {
      return NextResponse.json(
        { success: false, message: "Tree not found" },
        { status: 404 }
      );
    }

    // 🔍 Search logic
    let highlight = null;
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
      highlight = foundNode ? foundNode.user_id : null;
    }

    return NextResponse.json({ success: true, data: tree, highlight });
  } catch (error) {
    console.error("❌ Error in tree-operations API:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Server error" },
      { status: 500 }
    );
  }
}

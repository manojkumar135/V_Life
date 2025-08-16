import TreeNode from "@/models/tree";
import mongoose from "mongoose";

/**
 * Build a nested tree starting at nodeId.
 * depth = current depth (internal)
 * maxDepth = maximum depth to fetch (e.g., up to 100)
 * Returns a minimal, nested structure suitable for UI.
 */
export async function buildTree(
  nodeId: mongoose.Types.ObjectId,
  depth = 0,
  maxDepth = 100
): Promise<any> {
  if (!nodeId || depth > maxDepth) return null;

  const node = await TreeNode.findById(nodeId).lean();
  if (!node || Array.isArray(node)) return null;

  const result: any = {
    _id: (node._id as mongoose.Types.ObjectId).toString(),
    user_id: node.user_id,
    name: node.name,
  };

  // If we reached maxDepth, don't recurse further
  if (depth === maxDepth) {
    result.left = null;
    result.right = null;
    return result;
  }

  result.left = node.left ? await buildTree(node.left as any, depth + 1, maxDepth) : null;
  result.right = node.right ? await buildTree(node.right as any, depth + 1, maxDepth) : null;

  return result;
}

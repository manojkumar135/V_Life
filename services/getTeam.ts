import TreeNode from "@/models/tree";

/**
 * Load entire tree into memory once
 */
export const loadTreeMap = async () => {
  const allNodes = await TreeNode.find({}).lean();

  return new Map(
    allNodes.map((node: any) => [node.user_id, node])
  );
};

/**
 * Get team (left/right) using preloaded nodeMap
 */
export const getUserTeamFromMap = (
  rootUserId: string,
  targetUserId: string,
  nodeMap: Map<string, any>
): "left" | "right" | "any" => {
  if (!rootUserId || !targetUserId) return "any";

  const rootNode = nodeMap.get(rootUserId);
  if (!rootNode) return "any";

  // Direct match
  if (rootNode.left === targetUserId) return "left";
  if (rootNode.right === targetUserId) return "right";

  const queue: { nodeId: string; team: "left" | "right" }[] = [];

  if (rootNode.left)
    queue.push({ nodeId: rootNode.left, team: "left" });

  if (rootNode.right)
    queue.push({ nodeId: rootNode.right, team: "right" });

  while (queue.length) {
    const { nodeId, team } = queue.shift()!;
    if (!nodeId) continue;

    if (nodeId === targetUserId) return team;

    const child = nodeMap.get(nodeId);
    if (child) {
      if (child.left)
        queue.push({ nodeId: child.left, team });
      if (child.right)
        queue.push({ nodeId: child.right, team });
    }
  }

  return "any";
};

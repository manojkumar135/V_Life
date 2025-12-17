import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { History } from "@/models/history";
import TreeNode from "@/models/tree";
import { getCurrentWindow } from "@/app/api/CronJobs/Daily/matching-bonus/logic";

function getTimeRemaining(end: Date): string {
  const now = new Date();
  let diff = end.getTime() - now.getTime();
  if (diff <= 0) return "00:00:00";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function getTeamUserIdsFromMap(
  allNodesMap: Map<string, any>,
  rootUserId: string,
  side: "left" | "right"
): string[] {
  const result: string[] = [];
  const queue: string[] = [];

  const rootNode = allNodesMap.get(rootUserId);
  if (!rootNode) return [];

  const firstChild = side === "left" ? rootNode.left : rootNode.right;
  if (!firstChild) return [];

  queue.push(firstChild);

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    result.push(currentId);

    const currentNode = allNodesMap.get(currentId);
    if (!currentNode) continue;

    if (currentNode.left) queue.push(currentNode.left);
    if (currentNode.right) queue.push(currentNode.right);
  }

  return result;
}

export async function GET(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get("user_id");

    if (!user_id)
      return NextResponse.json({
        success: false,
        message: "Missing user_id",
      });

    const { start, end } = getCurrentWindow();

    const historiesInWindow = await History.find({
      first_payment: true,
      first_order: true,
      ischecked: false,
      created_at: { $gte: start, $lte: end },
    }).lean();

    

    

    if (!historiesInWindow.length) {
      return NextResponse.json({
        success: true,
        message: "No active advance payments in current window",
        leftTeam: 0,
        rightTeam: 0,
        timeRemaining: getTimeRemaining(end),
      });
    }

    const treeNodes = await TreeNode.find({}).lean();
    const allNodesMap = new Map(treeNodes.map((n: any) => [n.user_id, n]));

    const leftTeamIds = getTeamUserIdsFromMap(allNodesMap, user_id, "left");
    const rightTeamIds = getTeamUserIdsFromMap(allNodesMap, user_id, "right");

    const leftCount = historiesInWindow.filter((h) =>
      leftTeamIds.includes(h.user_id)
    ).length;
    const rightCount = historiesInWindow.filter((h) =>
      rightTeamIds.includes(h.user_id)
    ).length;

    return NextResponse.json({
      success: true,
      message: "Team slot data fetched successfully",
      user_id,
      leftTeam: leftCount,
      rightTeam: rightCount,
      timeRemaining: getTimeRemaining(end),
      window: { start, end },
    });
  } catch (error) {
    console.error("Error in /team-slot:", error);
    return NextResponse.json({
      success: false,
      message: "Internal Server Error",
    });
  }
}

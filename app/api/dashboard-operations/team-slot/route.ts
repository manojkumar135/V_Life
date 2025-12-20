import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { History } from "@/models/history";
import TreeNode from "@/models/tree";
import { Order } from "@/models/order";
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

    if (!user_id) {
      return NextResponse.json({
        success: false,
        message: "Missing user_id",
      });
    }

    const { start, end } = getCurrentWindow();

    /* ---------------- HISTORIES IN WINDOW ---------------- */
    const historiesInWindow = await History.find({
      first_payment: true,
      first_order: true,
      ischecked: false,
      created_at: { $gte: start, $lte: end },
    }).lean();

    // console.log(historiesInWindow)

    if (!historiesInWindow.length) {
      return NextResponse.json({
        success: true,
        message: "No active advance payments in current window",
        leftTeam: 0,
        rightTeam: 0,
        timeRemaining: getTimeRemaining(end),
      });
    }

    /* ---------------- TREE MAP ---------------- */
    const treeNodes = await TreeNode.find({}).lean();
    const allNodesMap = new Map(treeNodes.map((n: any) => [n.user_id, n]));

    const leftTeamIds = getTeamUserIdsFromMap(allNodesMap, user_id, "left");
    const rightTeamIds = getTeamUserIdsFromMap(allNodesMap, user_id, "right");

    /* ---------------- ORDERS LOOKUP ---------------- */
    const orderIds = historiesInWindow.map(h => h.order_id);

    const orders = await Order.find(
      { order_id: { $in: orderIds } },
      { order_id: 1, order_pv: 1 }
    ).lean();

    const orderPvMap = new Map(
      orders.map(o => [o.order_id, Number(o.order_pv || 0)])
    );

    /* ---------------- PV CALCULATION ---------------- */
    let leftPV = 0;
    let rightPV = 0;

    for (const h of historiesInWindow) {
      const pv = orderPvMap.get(h.order_id) || 0;

      if (leftTeamIds.includes(h.user_id)) {
        leftPV += pv;
      } else if (rightTeamIds.includes(h.user_id)) {
        rightPV += pv;
      }
    }

    /* ---------------- RESPONSE ---------------- */
    return NextResponse.json({
      success: true,
      message: "Team slot data fetched successfully",
      user_id,
      leftTeam: leftPV,
      rightTeam: rightPV,
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

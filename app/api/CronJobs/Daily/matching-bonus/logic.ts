// app/api/CronJobs/Daily/matching-bonus/logic.ts
import { connectDB } from "@/lib/mongodb";
import { History } from "@/models/history";
import { DailyPayout } from "@/models/payout";
import TreeNode from "@/models/tree";
import { Wallet } from "@/models/wallet";
import { generateUniqueCustomId } from "@/utils/server/customIdGenerator";
import { hasAdvancePaid } from "@/utils/hasAdvancePaid";

function formatDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

// ✅ Get current 12-hour IST window converted to UTC
export function getCurrentWindow() {
  const now = new Date();

  let start: Date;
  let end: Date;

  // Get IST hours
  const istHours =
    now.getUTCHours() + 5 + (now.getUTCMinutes() + 30 >= 60 ? 1 : 0);

  if (istHours < 12) {
    // 12:00 AM - 11:59 AM IST
    start = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0,
        0,
        0
      )
    );
    end = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        5,
        59,
        59,
        999
      )
    ); // 11:59 AM IST = 5:59 UTC
  } else {
    // 12:00 PM - 11:59 PM IST
    start = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        6,
        0,
        0
      )
    ); // 12:00 PM IST = 6:00 UTC
    end = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        17,
        59,
        59,
        999
      )
    ); // 11:59 PM IST = 17:59 UTC
  }

  // console.log(`[Matching Bonus] Current UTC window: ${start.toISOString()} - ${end.toISOString()}`);
  return { start, end };
}

// ✅ Convert history date+time (IST) -> UTC Date object
export function historyToUTCDate(history: any) {
  // history.date = "DD-MM-YYYY", history.time = "HH:MM:SS" (IST)
  const [day, month, year] = history.date.split("-").map(Number);
  const [hours, minutes, seconds] = history.time.split(":").map(Number);

  // IST -> UTC by subtracting 5h30m
  const utcHours = hours - 5;
  const utcMinutes = minutes - 30;

  return new Date(
    Date.UTC(year, month - 1, day, utcHours, utcMinutes, seconds)
  );
}

// ✅ Traverse tree to get all left/right team IDs
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

// ✅ Get all users with left/right teams and histories
export async function getUserTeamsAndHistories() {
  await connectDB();
  const { start, end } = getCurrentWindow();

  const histories = await History.find({
    first_payment: true,
    advance: true,
    ischecked: false,
  });

  const historiesInWindow = histories.filter((h) => {
    const historyDate = historyToUTCDate(h);
    return historyDate >= start && historyDate <= end;
  });

  const treeNodes = await TreeNode.find({});
  const allNodesMap = new Map(treeNodes.map((n) => [n.user_id, n]));

  const result = [];

  for (const node of treeNodes) {
    const leftTeamIds = getTeamUserIdsFromMap(
      allNodesMap,
      node.user_id,
      "left"
    );
    const rightTeamIds = getTeamUserIdsFromMap(
      allNodesMap,
      node.user_id,
      "right"
    );

    const leftHistories = historiesInWindow.filter((h) =>
      leftTeamIds.includes(h.user_id)
    );
    const rightHistories = historiesInWindow.filter((h) =>
      rightTeamIds.includes(h.user_id)
    );

    result.push({
      user_id: node.user_id,
      name: node.name,
      left_team: leftTeamIds,
      right_team: rightTeamIds,
      left_histories: leftHistories,
      right_histories: rightHistories,
    });
  }

  return result;
}

// ✅ Run Matching Bonus
export async function runMatchingBonus() {
  try {
    const teamsAndHistories = await getUserTeamsAndHistories();

    for (const u of teamsAndHistories) {
      // console.log("------------------------------------------------");
      // console.log(`User: ${u.user_id} - ${u.name}`);
      // console.log("Left team IDs:", u.left_team);
      // console.log("Right team IDs:", u.right_team);
      // console.log("Left histories:", u.left_histories.map(h => h.user_id));
      // console.log("Right histories:", u.right_histories.map(h => h.user_id));

      const match = u.left_histories.length > 0 && u.right_histories.length > 0;
      // console.log("Match eligible:", match);

      if (match) {
        // ✅ Check if user is active
        const node = await TreeNode.findOne({ user_id: u.user_id });
        if (!node || node.user_status !== "active") continue;

        // ✅ Check if user has paid advance ≥ 10000
        const advancePaid = await hasAdvancePaid(u.user_id, 10000);
        if (!advancePaid.hasPermission) continue;

        const now = new Date();
        const payout_id = await generateUniqueCustomId("PY", DailyPayout, 8, 8);

        // ✅ Format date
        const formattedDate = formatDate(now);

        // ✅ Find wallet of the user
        const wallet = await Wallet.findOne({ user_id: u.user_id });
        const walletId = wallet ? wallet.wallet_id : null;

        // ✅ Create Daily Payout
        const payout = await DailyPayout.create({
          transaction_id: `MB${Date.now()}`,
          payout_id,
          user_id: u.user_id,
          user_name: u.name,
          wallet_id: walletId,
          name: "Matching Bonus",
          title: "Matching Bonus",
          account_holder_name: wallet?.account_holder_name || "",
          bank_name: wallet?.bank_name || "",
          account_number: wallet?.account_number || "",
          ifsc_code: wallet?.ifsc_code || "",
          date: formattedDate,
          time: now.toTimeString().slice(0, 5),
          available_balance: wallet?.balance || 0,
          amount: 5000,
          transaction_type: "Credit",
          status: "Completed",
          details: "Daily Matching Bonus",
          left_users: u.left_histories.map((h) => ({
            user_id: h.user_id,
            transaction_id: h.transaction_id,
            amount: h.amount,
          })),
          right_users: u.right_histories.map((h) => ({
            user_id: h.user_id,
            transaction_id: h.transaction_id,
            amount: h.amount,
          })),
          created_by: "system",
          last_modified_by: "system",
          last_modified_at: now,
        });

        // ✅ If payout created, create history record
        if (payout) {
          await History.create({
            transaction_id: payout.transaction_id,
            wallet_id: payout.wallet_id,
            user_id: payout.user_id,
            user_name: payout.user_name,
            account_holder_name: payout.account_holder_name,
            bank_name: payout.bank_name,
            account_number: payout.account_number,
            ifsc_code: payout.ifsc_code,
            date: payout.date,
            time: payout.time,
            available_balance: payout.available_balance,
            amount: payout.amount,
            transaction_type: payout.transaction_type,
            details: payout.details,
            status: payout.status,
            first_payment: false,
            advance: false,
            ischecked: false,
            created_by: "system",
            last_modified_by: "system",
            last_modified_at: now,
          });
        }

        // ✅ Mark histories as checked
        await History.updateMany(
          {
            _id: {
              $in: [...u.left_histories, ...u.right_histories].map(
                (h) => h._id
              ),
            },
          },
          { $set: { ischecked: true } }
        );

        // console.log(`[Matching Bonus] Payout and History created for user: ${u.user_id}, Wallet: ${walletId}`);
      }
    }

    // console.log("[Matching Bonus] Execution completed");
  } catch (err) {
    console.error("[Matching Bonus] Error:", err);
    throw err;
  }
}

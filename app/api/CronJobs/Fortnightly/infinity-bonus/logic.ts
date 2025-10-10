import { connectDB } from "@/lib/mongodb";
import { DailyPayout, WeeklyPayout } from "@/models/payout";
import TreeNode from "@/models/tree";
import { Wallet } from "@/models/wallet";
import { History } from "@/models/history";
import { generateUniqueCustomId } from "@/utils/server/customIdGenerator";

function formatDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function parseDDMMYYYY(dateStr: string): Date {
  const [dd, mm, yyyy] = dateStr.split("-").map(Number);
  return new Date(yyyy, mm - 1, dd);
}

// ✅ Get payouts from last 15 days
async function getLast15DaysMatchingPayouts() {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - 15);

  const allPayouts = await DailyPayout.find({ name: "Matching Bonus" });
  const filtered = allPayouts.filter((p) => {
    const payoutDate = parseDDMMYYYY(p.date);
    return payoutDate >= start && payoutDate <= now;
  });

  console.log(`[Debug] Found ${filtered.length} Matching Bonus payouts in last 15 days`);
  filtered.forEach((p) =>
    console.log(` - ${p.user_id} | ${p.user_name} | ${p.date} | ₹${p.amount}`)
  );

  return filtered;
}

// ✅ Build user tree map
async function getTreeNodesMap() {
  const nodes = await TreeNode.find({});
  console.log(`[Debug] Loaded ${nodes.length} tree nodes`);
  return new Map(nodes.map((n) => [n.user_id, n]));
}

// ✅ Get all downstream users recursively (infinity team)
function getInfinityTeam(allNodesMap: Map<string, any>, rootUserId: string): string[] {
  const result: string[] = [];
  const queue: string[] = [];

  const rootNode = allNodesMap.get(rootUserId);
  if (!rootNode) return [];

  if (rootNode.left) queue.push(rootNode.left);
  if (rootNode.right) queue.push(rootNode.right);

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

// ✅ Run Infinity Bonus
export async function runInfinityBonus() {
  try {
    await connectDB();

    console.log("🔄 [Infinity Bonus] Starting execution...");

    const last15DaysPayouts = await getLast15DaysMatchingPayouts();
    if (!last15DaysPayouts.length) {
      console.log("[Infinity Bonus] ⚠️ No Matching Bonus payouts found in last 15 days.");
      return;
    }

    const allNodesMap = await getTreeNodesMap();

    // Map of user_id → payouts received
    const userPayoutMap = new Map<string, typeof last15DaysPayouts>();
    for (const p of last15DaysPayouts) {
      if (!userPayoutMap.has(p.user_id)) userPayoutMap.set(p.user_id, []);
      userPayoutMap.get(p.user_id)!.push(p);
    }

    console.log(`[Debug] Built userPayoutMap for ${userPayoutMap.size} users`);

    let createdCount = 0;

    // Iterate through all users in the tree
    for (const [user_id, node] of allNodesMap) {
      if (node.user_status !== "active") continue;

      console.log(`\n[User: ${user_id}] Checking infinity team for ${node.name}`);

      const infinityTeam = getInfinityTeam(allNodesMap, user_id);
      console.log(`   └─ Found ${infinityTeam.length} team members`);

      if (!infinityTeam.length) continue;

      // Collect payouts from all infinity team members
      const eligiblePayouts: typeof last15DaysPayouts = [];
      for (const teamUserId of infinityTeam) {
        const payouts = userPayoutMap.get(teamUserId);
        if (payouts) eligiblePayouts.push(...payouts);
      }

      console.log(`   └─ Found ${eligiblePayouts.length} eligible payouts from team`);

      if (!eligiblePayouts.length) continue;

      // 50% of total team payouts = Infinity Bonus
      const totalBonus = eligiblePayouts.reduce((sum, p) => sum + p.amount * 0.5, 0);

      console.log(`   └─ Total Infinity Bonus for ${node.name}: ₹${totalBonus}`);

      const now = new Date();
      const payout_id = await generateUniqueCustomId("FP", WeeklyPayout, 8, 8);
      const wallet = await Wallet.findOne({ user_id });
      const walletId = wallet ? wallet.wallet_id : null;

      if (!wallet) {
        console.log(`   ⚠️ No wallet found for ${user_id}, skipping payout.`);
        continue;
      }

      // ✅ Create Weekly Infinity Payout
      const payout = await WeeklyPayout.create({
        transaction_id: `IB${Date.now()}`,
        payout_id,
        user_id,
        user_name: node.name,
        wallet_id: walletId,
        name: "Infinity Bonus",
        title: "Infinity Bonus",
        account_holder_name: wallet?.account_holder_name || "",
        bank_name: wallet?.bank_name || "",
        account_number: wallet?.account_number || "",
        ifsc_code: wallet?.ifsc_code || "",
        date: formatDate(now),
        time: now.toTimeString().slice(0, 5),
        available_balance: wallet?.balance || 0,
        amount: totalBonus,
        transaction_type: "Credit",
        status: "Completed",
        details: "Infinity Bonus (15-day)",
        team_users: eligiblePayouts.map((p) => ({
          user_id: p.user_id,
          amount: p.amount,
          transaction_id: p.transaction_id,
        })),
        created_by: "system",
        last_modified_by: "system",
        last_modified_at: now,
      });

      console.log(`   ✅ Infinity Payout created for ${node.name}: ₹${totalBonus}`);

      // ✅ Log into History
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

      createdCount++;
    }

    console.log(`\n[Infinity Bonus] ✅ Execution completed. Total created: ${createdCount}`);

  } catch (err) {
    console.error("[Infinity Bonus] ❌ Error:", err);
    throw err;
  }
}

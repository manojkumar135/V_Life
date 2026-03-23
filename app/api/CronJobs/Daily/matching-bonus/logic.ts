import { connectDB } from "@/lib/mongodb";
import { History } from "@/models/history";
import { DailyPayout } from "@/models/payout";
import TreeNode from "@/models/tree";
import { User } from "@/models/user";
import { Wallet } from "@/models/wallet";
import { Order } from "@/models/order";
import { generateUniqueCustomId } from "@/utils/server/customIdGenerator";
import { Alert } from "@/models/alert";
import { getTotalPayout } from "@/services/totalpayout";
import {
  evaluateAndUpdateHoldStatus,
  currentMonth,
} from "@/services/monthlyHoldService";
import { updateClub } from "@/services/clubrank";
import { addRewardScore } from "@/services/updateRewardScore";
import { determineHoldReasons } from "@/services/payoutHoldService";

function formatDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

async function checkFirstOrder(user_id: string) {
  if (!user_id) {
    return {
      hasFirstOrder: false,
      hasPermission: false,
      reason: "Missing user_id",
    };
  }

  const user = await User.findOne({ user_id })
    .select("status_notes")
    .lean<{ status_notes?: string }>();

  if (!user) {
    return {
      hasFirstOrder: false,
      hasPermission: false,
      reason: "User not found",
    };
  }

  const note = user.status_notes?.toLowerCase()?.trim();
  const activatedByAdmin =
    note === "activated by admin" || note === "activated";

  const hasFirstOrder = await Order.exists({ user_id });

  return {
    hasFirstOrder: !!hasFirstOrder,
    activatedByAdmin,
    hasPermission: activatedByAdmin || !!hasFirstOrder,
    reason: activatedByAdmin
      ? "Activated by admin"
      : hasFirstOrder
        ? "First order placed"
        : "No orders placed",
  };
}

// Get current 12-hour IST window converted to UTC
export function getCurrentWindow() {
  const nowUTC = new Date();

  // Convert UTC → IST
  const nowIST = new Date(nowUTC.getTime() + 5.5 * 60 * 60 * 1000);

  const year = nowIST.getUTCFullYear();
  const month = nowIST.getUTCMonth();
  const date = nowIST.getUTCDate();
  const hour = nowIST.getUTCHours();

  let startIST: Date;
  let endIST: Date;

  if (hour < 12) {
    // 🌅 12:00 AM – 11:59 AM IST
    startIST = new Date(Date.UTC(year, month, date, 0, 0, 0));
    endIST = new Date(Date.UTC(year, month, date, 11, 59, 59, 999));
  } else {
    // 🌇 12:00 PM – 11:59 PM IST
    startIST = new Date(Date.UTC(year, month, date, 12, 0, 0));
    endIST = new Date(Date.UTC(year, month, date, 23, 59, 59, 999));
  }

  // Convert IST → UTC for MongoDB
  const startUTC = new Date(startIST.getTime() - 5.5 * 60 * 60 * 1000);
  const endUTC = new Date(endIST.getTime() - 5.5 * 60 * 60 * 1000);

  return { start: startUTC, end: endUTC };
}

function generateTransactionId(prefix = "MB") {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");

  return `${prefix}-${yyyy}${mm}${dd}${hh}${min}${ss}`;
}
const txId = generateTransactionId("MB");

// historyToUTCDate kept for diagnostics / fallback (not used for filtering)
export function historyToUTCDate(history: any): Date {
  if (!history?.date || !history?.time) {
    throw new Error("Invalid history object: missing date or time");
  }

  const dateParts = history.date.split("-").map((s: string) => s.trim());
  if (dateParts.length !== 3) {
    throw new Error("Invalid date format in history");
  }

  let day: number;
  let month: number;
  let year: number;
  if (dateParts[0].length === 4) {
    year = Number(dateParts[0]);
    month = Number(dateParts[1]);
    day = Number(dateParts[2]);
  } else {
    day = Number(dateParts[0]);
    month = Number(dateParts[1]);
    year = Number(dateParts[2]);
  }

  if ([day, month, year].some((n) => !Number.isFinite(n))) {
    throw new Error("Invalid numeric date parts in history");
  }

  const timeStr = String(history.time).trim();
  const timeRegex = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i;
  const m = timeStr.match(timeRegex);
  if (!m) {
    throw new Error("Invalid time format in history: " + timeStr);
  }
  let hh = Number(m[1]);
  const mm = Number(m[2]);
  const ss = m[3] ? Number(m[3]) : 0;
  const ampm = m[4] ? m[4].toUpperCase() : null;

  if (ampm) {
    if (hh === 12) hh = 0;
    if (ampm === "PM") hh += 12;
  }

  const istMillis = Date.UTC(year, month - 1, day, hh, mm, ss);
  const utcMillis = istMillis - (5 * 60 + 30) * 60 * 1000;
  return new Date(utcMillis);
}

// Traverse tree to get all left/right team IDs
function getTeamUserIdsFromMap(
  allNodesMap: Map<string, any>,
  rootUserId: string,
  side: "left" | "right",
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

// Get all users with left/right teams and histories (uses created_at window)
export async function getUserTeamsAndHistories() {
  await connectDB();
  const { start, end } = getCurrentWindow();

  // Select histories using created_at (UTC) window to avoid fragile parsing
  const historiesInWindow = (await History.find({
    status: "Completed",
    ischecked: false,
    created_at: { $gte: start, $lte: end },
    $or: [{ first_order: true }, { advance: true }],
  }).lean()) as any[];

  console.log(
    `[Matching Bonus] UTC window: ${start.toISOString()} - ${end.toISOString()}`,
  );
  console.log(
    `[Matching Bonus] historiesInWindow count: ${historiesInWindow.length}`,
  );

  const treeNodes = (await TreeNode.find({}).lean()) as any[];
  const allNodesMap = new Map<string, any>(
    treeNodes.map((n: any) => [n.user_id, n]),
  );

  const result: Array<{
    user_id: string;
    name?: string;
    contact?: string;
    mail?: string;
    status?: string;
    left_team: string[];
    right_team: string[];
    left_histories: any[];
    right_histories: any[];
  }> = [];

  for (const node of treeNodes) {
    const leftTeamIds = getTeamUserIdsFromMap(
      allNodesMap,
      node.user_id,
      "left",
    );
    const rightTeamIds = getTeamUserIdsFromMap(
      allNodesMap,
      node.user_id,
      "right",
    );

    const leftHistories = historiesInWindow.filter((h) =>
      leftTeamIds.includes(h.user_id),
    );
    const rightHistories = historiesInWindow.filter((h) =>
      rightTeamIds.includes(h.user_id),
    );

    result.push({
      user_id: node.user_id,
      name: node.name,
      contact: node.contact,
      mail: node.mail,
      status: node.status,
      left_team: leftTeamIds,
      right_team: rightTeamIds,
      left_histories: leftHistories,
      right_histories: rightHistories,
    });
  }

  return result;
}

// Run Matching Bonus
export async function runMatchingBonus() {
  try {
    await connectDB();
    const teamsAndHistories = await getUserTeamsAndHistories();

    let totalPayouts = 0;

    // ✅ IN-MEMORY dedup set — key: user_id
    // Prevents releasing 2 matching bonuses to the same user
    // within a single cron run even if something causes the loop
    // to visit the same user twice.
    const processedThisRun = new Set<string>();

    const allOrderIds = teamsAndHistories
      .flatMap((u) => [...u.left_histories, ...u.right_histories])
      .map((h) => h.order_id)
      .filter(Boolean);

    const orders = await Order.find(
      { order_id: { $in: allOrderIds } },
      { order_id: 1, order_pv: 1 },
    ).lean();

    const orderPvMap = new Map(
      orders.map((o) => [o.order_id, Number(o.order_pv || 0)]),
    );

    for (const u of teamsAndHistories) {
      let leftPV = 0;
      let rightPV = 0;

      for (const h of u.left_histories) {
        if (h.advance === true) {
          leftPV += 100; // ✅ fixed PV for advance
        } else {
          leftPV += orderPvMap.get(h.order_id) || 0;
        }
      }

      for (const h of u.right_histories) {
        if (h.advance === true) {
          rightPV += 100; // ✅ fixed PV for advance
        } else {
          rightPV += orderPvMap.get(h.order_id) || 0;
        }
      }

      // 🔒 cap at 100 PV per side
      const effectiveLeftPV = Math.min(leftPV, 100);
      const effectiveRightPV = Math.min(rightPV, 100);

      // ✅ compulsory condition
      const match = effectiveLeftPV >= 100 && effectiveRightPV >= 100;
      if (!match) continue;

      const node = (await TreeNode.findOne({
        user_id: u.user_id,
      }).lean()) as any;
      if (!node || node.status !== "active") continue;

      const firstOrder = await checkFirstOrder(u.user_id);

      // ─────────────────────────────────────────────────────────────
      // ✅ GUARD 1 — In-Memory: prevents double payout within this run
      // ─────────────────────────────────────────────────────────────
      if (processedThisRun.has(u.user_id)) {
        console.log(
          `⚠️ [In-Memory Guard] Matching Bonus already processed this run for ${u.user_id}, skipping.`,
        );
        continue;
      }

      // ─────────────────────────────────────────────────────────────
      // ✅ GUARD 2 — DB: prevents double payout if cron runs twice today
      // Checks DailyPayout for an existing Matching Bonus for this
      // user today (same date string, same window half-day).
      // ─────────────────────────────────────────────────────────────
      const todayFormatted = formatDate(
        new Date(
          new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
        ),
      );
      const alreadyPaid = await DailyPayout.findOne({
        user_id: u.user_id,
        name: "Matching Bonus",
        date: todayFormatted,
      }).lean();

      if (alreadyPaid) {
        console.log(
          `⚠️ [DB Guard] Matching Bonus already exists today for ${u.user_id}, skipping.`,
        );
        // Mark histories as checked so they won't reappear
        const historyIds = [...u.left_histories, ...u.right_histories]
          .map((h: any) => h._id)
          .filter(Boolean);
        if (historyIds.length > 0) {
          await History.updateMany(
            { _id: { $in: historyIds } },
            { $set: { ischecked: true } },
          );
        }
        continue;
      }

      // ✅ Register in-memory BEFORE creating payout
      processedThisRun.add(u.user_id);

      const now = new Date();
      const istNow = new Date(
        new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
      );
      const payout_id = await generateUniqueCustomId("PY", DailyPayout, 8, 8);
      const formattedDate = formatDate(
        new Date(
          new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
        ),
      );
      const wallet = (await Wallet.findOne({
        user_id: u.user_id,
      }).lean()) as any;
      const user = (await User.findOne({ user_id: u.user_id }).lean()) as any;
      const isPanVerified =
        wallet?.pan_verified === true ||
        String(wallet?.pan_verified).toLowerCase() === "yes";

      const walletId = wallet ? wallet.wallet_id : null;

      const totalAmount = 5000;

      // ── Determine payout status ──────────────────────────────────────
      //
      //  Hold priority (all 4 conditions checked via determineHoldReasons):
      //   1. No wallet / no account_number             → OnHold (NO_WALLET)
      //   2. Wallet exists but inactive                → OnHold (WALLET_INACTIVE)
      //   3. Wallet change request pending             → OnHold (WALLET_UNDER_REVIEW)
      //   4. Prior month PV uncleared / this month
      //      crossed threshold with PV unmet           → OnHold (PV_NOT_FULFILLED)
      //   5. All clear                                 → Pending
      //
      //  evaluateAndUpdateHoldStatus MUST be called first so that
      //  MonthlyPayoutTracker.total_payout is updated BEFORE
      //  determineHoldReasons reads it for the PV check.

      // Step 1: Update monthly tracker total (WRITE)
      await evaluateAndUpdateHoldStatus(u.user_id, totalAmount);

      // Step 2: Read all 4 hold conditions with full metadata (READ)
      const hold = await determineHoldReasons(u.user_id, currentMonth());

      const payoutStatus: "Pending" | "OnHold" | "Completed" = hold.status;

      // Percentages
      let withdrawAmount = 0;
      let rewardAmount = 0;
      let tdsAmount = 0;
      let adminCharge = 0;

      if (wallet && isPanVerified) {
        // PAN Verified
        withdrawAmount = Number((totalAmount * 0.8).toFixed(2));
        rewardAmount = Number((totalAmount * 0.08).toFixed(2));
        tdsAmount = Number((totalAmount * 0.02).toFixed(2));
        adminCharge = Number((totalAmount * 0.1).toFixed(2));
      } else {
        // PAN Not Verified OR No wallet
        withdrawAmount = Number((totalAmount * 0.62).toFixed(2));
        rewardAmount = Number((totalAmount * 0.08).toFixed(2));
        tdsAmount = Number((totalAmount * 0.2).toFixed(2));
        adminCharge = Number((totalAmount * 0.1).toFixed(2));
      }

      const payout = await DailyPayout.create({
        transaction_id: payout_id,
        payout_id,
        user_id: u.user_id,
        user_name: u.name,
        rank: wallet?.rank,
        wallet_id: walletId,
        pan_verified: isPanVerified || false,
        mail: u.mail || "",
        contact: u.contact || "",
        user_status: u.status || "active",

        name: "Matching Bonus",
        title: "Matching Bonus",
        account_holder_name: wallet?.account_holder_name || "",
        bank_name: wallet?.bank_name || "",
        account_number: wallet?.account_number || "",
        ifsc_code: wallet?.ifsc_code || "",
        date: formattedDate,
        time: istNow.toTimeString().slice(0, 5),
        available_balance: wallet?.balance || 0,
        amount: totalAmount,
        totalamount: totalAmount,
        withdraw_amount: withdrawAmount,
        reward_amount: rewardAmount,
        tds_amount: tdsAmount,
        admin_charge: adminCharge,
        to: u.user_id,
        from: "",
        transaction_type: "Credit",
        status: payoutStatus,
        details: "Daily Matching Bonus",

        // ✅ ADDED: hold metadata — so admin knows WHY payout is OnHold
        hold_reasons: hold.reasons,
        hold_reason_labels: hold.labels,
        hold_release_reason: hold.summary,

        left_users: u.left_histories.map((h: any) => ({
          user_id: h.user_id,
          transaction_id: h.transaction_id,
          amount: h.amount,
        })),
        right_users: u.right_histories.map((h: any) => ({
          user_id: h.user_id,
          transaction_id: h.transaction_id,
          amount: h.amount,
        })),
        created_by: "system",
        last_modified_by: "system",
        last_modified_at: istNow,
      });

      const totalPayout = await getTotalPayout(u.user_id);

      // 🔹 Capture BEFORE state
      const beforeUser = (await User.findOne({ user_id: u.user_id })
        .select("rank club")
        .lean()) as any;

      const updatedClub = await updateClub(u.user_id, totalPayout);

      if (updatedClub && beforeUser) {
        // 🎉 CLUB ENTRY ALERT (ONLY WHEN CLUB CHANGES)
        if (beforeUser.club !== updatedClub.newClub) {
          await Alert.create({
            user_id: u.user_id,
            title: `🎉 ${updatedClub.newClub} Club Achieved`,
            description: `Congrats! Welcome to the ${updatedClub.newClub} Club 🎉`,
            priority: "high",
            read: false,
            link: "/dashboards",
            role: "user",
            date: formattedDate,
            created_at: istNow,
          });
        }

        // 🎖️ RANK ACHIEVEMENT ALERT (EVERY RANK CHANGE)
        if (beforeUser.rank !== updatedClub.newRank) {
          await Alert.create({
            user_id: u.user_id,
            title: `🎖️ ${updatedClub.newRank} Rank Achieved`,
            description: `Congratulations! You achieved ${updatedClub.newRank} rank 🎖️`,
            priority: "high",
            read: false,
            link: "/dashboards",
            role: "user",
            date: formattedDate,
            created_at: istNow,
          });
        }
      }

      if (payout) {
        totalPayouts++;

        await History.create({
          transaction_id: payout.transaction_id,
          wallet_id: payout.wallet_id,
          user_id: payout.user_id,
          user_name: payout.user_name,
          rank: payout.rank,
          pan_verified: payout.pan_verified,
          mail: payout.mail,
          contact: payout.contact,
          user_status: payout.user_status,
          account_holder_name: payout.account_holder_name,
          bank_name: payout.bank_name,
          account_number: payout.account_number,
          ifsc_code: payout.ifsc_code,
          date: payout.date,
          time: payout.time,
          available_balance: payout.available_balance,
          amount: payout.amount,
          total_amount: payout.amount,
          withdraw_amount: payout.withdraw_amount,
          reward_amount: payout.reward_amount,
          tds_amount: payout.tds_amount,
          admin_charge: payout.admin_charge,
          to: payout.to,
          from: payout.from,
          transaction_type: payout.transaction_type,
          details: payout.details,
          status: payout.status,
          first_payment: false,
          advance: false,
          ischecked: false,
          created_by: "system",
          last_modified_by: "system",
          last_modified_at: istNow,
        });

        await addRewardScore({
          user_id: u.user_id,
          points: withdrawAmount,
          source: "matching_bonus",
          reference_id: payout.payout_id,
          remarks: `Matching bonus for cycle ${formattedDate}`,
          type: "daily",
        });

        await addRewardScore({
          user_id: u.user_id,
          points: rewardAmount,
          source: "matching_bonus",
          reference_id: payout.payout_id,
          remarks: `Matching bonus (reward) for cycle ${formattedDate}`,
          type: "reward",
        });

        await Alert.create({
          user_id: u.user_id,
          user_name: u.name,
          user_contact: u.contact,
          user_email: u.mail,
          user_status: u.status || "active",
          related_id: payout.payout_id,
          link: "/wallet/payout/daily",
          title: "Matching Bonus Released 🎉",
          description: `Your matching bonus of ₹${totalAmount.toLocaleString()} has been released.`,
          role: "user",
          priority: "medium",
          read: false,
          date: formattedDate,
          created_at: istNow,
        });
      }

      // ✅ Mark histories as checked IMMEDIATELY after payout is created
      // so a second run of the same cron won't re-process them
      const historyIds = [...u.left_histories, ...u.right_histories]
        .map((h: any) => h._id)
        .filter(Boolean);
      if (historyIds.length > 0) {
        await History.updateMany(
          { _id: { $in: historyIds } },
          { $set: { ischecked: true } },
        ).exec();
      }

      console.log(
        `[Matching Bonus] Payout created for ${u.user_id} status=${payout?.status} histories marked: ${historyIds.length}`,
      );
    }

    if (totalPayouts > 0) {
      await Alert.create({
        role: "admin",
        title: "Matching Bonus Payouts Released",
        description: `${totalPayouts} user payout(s) have been successfully released today.`,
        priority: "high",
        read: false,
        link: "/wallet/payout/daily",
        date: formatDate(new Date()),
        created_at: new Date(),
      });
      console.log(
        `[Matching Bonus] Admin alert created for ${totalPayouts} payouts`,
      );
    }
  } catch (err) {
    console.error("[Matching Bonus] Error:", err);
    throw err;
  }
}

export default {
  runMatchingBonus,
  getUserTeamsAndHistories,
  getCurrentWindow,
};

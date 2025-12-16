//api/history-operations/route.js


import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { History } from "@/models/history";
import { User } from "@/models/user";
import { Login } from "@/models/login";
import TreeNode from "@/models/tree";
import { Rank } from "@/models/rank";
import { Wallet } from "@/models/wallet";
import mongoose from "mongoose";
import { Alert } from "@/models/alert";

import {
  updateInfinityTeam,
  rebuildInfinity,
  propagateInfinityUpdateToAncestors,
} from "@/services/infinity";


const date = new Date();

// ✅ Helper: Resolve user_id from TreeNode reference (ObjectId or string)
async function resolveChildUserId(nodeRef) {
  if (!nodeRef) return null;
  try {
    if (typeof nodeRef === "string" && mongoose.Types.ObjectId.isValid(nodeRef)) {
      const childNode = await TreeNode.findById(nodeRef).lean();
      return childNode?.user_id || String(nodeRef);
    }
    if (typeof nodeRef === "string") {
      const tn = await TreeNode.findOne({ user_id: nodeRef }).lean();
      return tn ? nodeRef : String(nodeRef);
    }
    return String(nodeRef);
  } catch {
    return String(nodeRef);
  }
}

// ✅ Helper: Detect whether targetUserId is in left/right team of rootUserId
async function getUserTeam(rootUserId, targetUserId) {
  if (!rootUserId || !targetUserId) return "any";

  const allNodes = await TreeNode.find({}).lean();
  const nodeMap = new Map(allNodes.map(n => [n.user_id, n]));

  const rootNode = nodeMap.get(rootUserId);
  if (!rootNode) return "any";

  // Direct left/right match
  if (rootNode.left === targetUserId) return "left";
  if (rootNode.right === targetUserId) return "right";

  // BFS traversal
  const queue = [
    { nodeId: rootNode.left, team: "left" },
    { nodeId: rootNode.right, team: "right" },
  ];

  while (queue.length) {
    const { nodeId, team } = queue.shift();
    if (!nodeId) continue;
    if (nodeId === targetUserId) return team;

    const child = nodeMap.get(nodeId);
    if (child) {
      queue.push({ nodeId: child.left, team });
      queue.push({ nodeId: child.right, team });
    }
  }

  return "any";
}

// -------------------------------------------------------------
// UTIL: Update rank across all collections
// -------------------------------------------------------------
async function updateUserRank(userId, rankLevel, qualifiedUsers) {
  const rankKey = `${rankLevel}_star`;

  await Rank.findOneAndUpdate(
    { user_id: userId },
    {
      $set: {
        [`ranks.${rankKey}`]: {
          qualified_users: qualifiedUsers,
          achieved_at: new Date(),
        },
      },
    },
    { upsert: true }
  );

  const clubValue = "Star";


  await User.updateOne({ user_id: userId }, {
    $set: {
      rank: String(rankLevel), club: clubValue,
      last_modified_at: new Date(),
    }
  });
  await Login.updateOne({ user_id: userId }, {
    $set: {
      rank: String(rankLevel), club: clubValue,
      last_modified_at: new Date(),
    }
  });
  await TreeNode.updateOne({ user_id: userId }, {
    $set: {
      rank: String(rankLevel), club: clubValue,
      last_modified_at: new Date(),
    }
  });
  await Wallet.updateOne({ user_id: userId }, {
    $set: {
      rank: String(rankLevel), club: clubValue,
      last_modified_at: new Date(),
    }
  });
}

// -------------------------------------------------------------
// NEW — FIXED RANK LOGIC (DO NOT MODIFY)
// -------------------------------------------------------------
async function checkAndUpgradeRank(user) {
  console.log(`Checking rank for ${user.user_id}`);

  let currentRank = parseInt(user.rank === "none" ? "0" : user.rank);
  if (currentRank >= 5) return;

  // -------------------------------------------------------------
  // STEP 1 — FETCH PAID DIRECTS WITH TEAM SIDE
  // -------------------------------------------------------------
  const directs = await User.find({ referBy: user.user_id }).lean();
  const paidDirects = [];

  for (const direct of directs) {
    const paid = await History.findOne({
      user_id: direct.user_id,
      $or: [
        { advance: true },
        { first_order: true },
      ],
    }).lean();
    if (paid) {
      const team = await getUserTeam(user.user_id, direct.user_id);
      if (team === "left" || team === "right") {
        paidDirects.push({
          user_id: direct.user_id,
          user_name: direct.user_name,
          team,
          payment_id: paid._id,
        });
      }
    }
  }

  // -------------------------------------------------------------
  // STEP 2 — SPLIT INTO LEFT / RIGHT POOLS
  // -------------------------------------------------------------
  let leftPool = paidDirects.filter(u => u.team === "left");
  let rightPool = paidDirects.filter(u => u.team === "right");

  // -------------------------------------------------------------
  // STEP 3 — LOAD EXISTING RANKS AND REMOVE USED USERS
  // -------------------------------------------------------------
  const rankRecord = await Rank.findOne({ user_id: user.user_id }).lean();
  const usedUsers = [];

  if (rankRecord?.ranks) {
    Object.values(rankRecord.ranks).forEach(rank => {
      if (rank.qualified_users) {
        rank.qualified_users.forEach(u => usedUsers.push(u.user_id));
      }
    });
  }

  // Remove previously used users
  leftPool = leftPool.filter(u => !usedUsers.includes(u.user_id));
  rightPool = rightPool.filter(u => !usedUsers.includes(u.user_id));

  // -------------------------------------------------------------
  // STEP 4 — ASSIGN RANKS (ONE LEFT + ONE RIGHT PER STAR)
  // -------------------------------------------------------------
  for (let nextRank = currentRank + 1; nextRank <= 5; nextRank++) {
    const rankKey = `${nextRank}_star`;

    // Stop if shortage
    if (leftPool.length < 1 || rightPool.length < 1) {
      await Rank.findOneAndUpdate(
        { user_id: user.user_id },
        {
          $set: {
            [`ranks.${rankKey}.unused_left`]: leftPool,
            [`ranks.${rankKey}.unused_right`]: rightPool,
          },
        },
        { upsert: true }
      );
      console.log(`Stopped at ${nextRank}-star due to shortage`);
      break;
    }

    // CONSUME one left + one right
    const left = leftPool.shift();
    const right = rightPool.shift();

    const qualifiedUsers = [
      {
        user_id: left.user_id,
        user_name: left.user_name,
        payment_id: left.payment_id,
        team: "left",
      },
      {
        user_id: right.user_id,
        user_name: right.user_name,
        payment_id: right.payment_id,
        team: "right",
      },
    ];

    // Save the rank
    await Rank.findOneAndUpdate(
      { user_id: user.user_id },
      {
        $set: {
          [`ranks.${rankKey}.qualified_users`]: qualifiedUsers,
          [`ranks.${rankKey}.achieved_at`]: new Date(),
          [`ranks.${rankKey}.unused_left`]: leftPool,
          [`ranks.${rankKey}.unused_right`]: rightPool,
        },
      },
      { upsert: true }
    );

    await updateUserRank(user.user_id, nextRank, qualifiedUsers);

    console.log(`⭐ ${nextRank}-star assigned to ${user.user_id}`);

    currentRank = nextRank;
  }

  // -------------------------------------------------------------
  // STEP 5 — SAVE EXTRA USERS
  // -------------------------------------------------------------
  const extraUsers = [...leftPool, ...rightPool];

  await Rank.findOneAndUpdate(
    { user_id: user.user_id },
    { $set: { extra: { qualified_users: extraUsers } } },
    { upsert: true }
  );

  console.log(`Final rank for ${user.user_id}: ${currentRank}`);
}





// ✅ POST - Create payment record
// api/history-operations/route.ts (POST ONLY)

export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();

    // History is PURE ledger now
    body.first_payment = false;
    body.advance = false;
    body.ischecked = false;

    const history = await History.create(body);

    return NextResponse.json(
      { success: true, data: history },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}


// GET - Fetch all history records OR single history record by id / transaction_id

export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);

    const id = searchParams.get("id") || searchParams.get("transaction_id");
    const user_id = searchParams.get("user_id");
    const search = searchParams.get("search");
    const role = searchParams.get("role");
    const date = searchParams.get("date");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    // -------------------
    // Lookup by ID or transaction_id
    // -------------------
    if (id) {
      let history;
      if (mongoose.Types.ObjectId.isValid(id)) {
        history = await History.findById(id);
      } else {
        history = await History.findOne({ transaction_id: id });
      }

      if (!history) {
        return NextResponse.json(
          { success: false, message: "History not found", data: [] },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, data: [history] }, { status: 200 });
    }

    // -------------------
    // Role-based query
    // -------------------
    let baseQuery = {};
    if (role) {
      if (role === "user") {
        if (!user_id) {
          return NextResponse.json(
            { success: false, message: "user_id is required for role=user", data: [] },
            { status: 400 }
          );
        }
        baseQuery.user_id = user_id;
      } else if (role === "admin") {
        baseQuery = {};
      } else {
        return NextResponse.json(
          { success: false, message: "Invalid role", data: [] },
          { status: 400 }
        );
      }
    }

    // -------------------
    // Date parsing helper
    // -------------------
    function parseDate(input) {
      if (!input) return null;
      input = input.trim();

      // dd-mm-yyyy or dd/mm/yyyy
      let match = input.match(/^(\d{2})[-\/](\d{2})[-\/](\d{4})$/);
      if (match) {
        const [_, day, month, year] = match;
        return new Date(Number(year), Number(month) - 1, Number(day));
      }

      // yyyy-mm-dd or yyyy/mm/dd
      match = input.match(/^(\d{4})[-\/](\d{2})[-\/](\d{2})$/);
      if (match) {
        const [_, year, month, day] = match;
        return new Date(Number(year), Number(month) - 1, Number(day));
      }

      // fallback
      const d = new Date(input);
      return isNaN(d.getTime()) ? null : d;
    }

    // -------------------
    // Build filter conditions
    // -------------------
    const conditions = [];

    // Search filter
    if (search) {
      const searchTerms = search
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      if (searchTerms.length) {
        const searchConditions = searchTerms.flatMap((term) => {
          const regex = new RegExp("^" + term, "i");
          const conds = [
            { transaction_id: regex },
            { user_id: regex },
            { user_name: regex },
            { status: regex },
            { details: regex },
            { date: regex }
          ];
          if (!isNaN(Number(term))) {
            const num = Number(term);
            conds.push({ $expr: { $eq: [{ $floor: "$amount" }, num] } });
          }
          return conds;
        });

        conditions.push({ $or: searchConditions });
      }
    }

    // -------------------
    // Single date filter (date field is string 'dd-mm-yyyy')
    // -------------------
    if (date && !from && !to) {
      const parsedDate = parseDate(date);
      if (parsedDate) {
        const day = ("0" + parsedDate.getDate()).slice(-2);
        const month = ("0" + (parsedDate.getMonth() + 1)).slice(-2);
        const year = parsedDate.getFullYear();
        const formatted = `${day}-${month}-${year}`; // dd-mm-yyyy
        conditions.push({ date: formatted });
      }
    }

    // -------------------
    // Date range filter (from/to)
    // -------------------
    if (from || to) {
      const startDate = parseDate(from);
      const endDate = parseDate(to);

      if (startDate && endDate) {
        const startDay = ("0" + startDate.getDate()).slice(-2);
        const startMonth = ("0" + (startDate.getMonth() + 1)).slice(-2);
        const startYear = startDate.getFullYear();

        const endDay = ("0" + endDate.getDate()).slice(-2);
        const endMonth = ("0" + (endDate.getMonth() + 1)).slice(-2);
        const endYear = endDate.getFullYear();

        const startFormatted = `${startDay}-${startMonth}-${startYear}`;
        const endFormatted = `${endDay}-${endMonth}-${endYear}`;

        conditions.push({ date: { $gte: startFormatted, $lte: endFormatted } });
      }
    }

    // -------------------
    // Combine baseQuery with all conditions
    // -------------------
    const finalQuery =
      conditions.length > 0 ? { $and: [baseQuery, ...conditions] } : baseQuery;

    let histories = await History.find(finalQuery).sort({
      // date:-1,
      // last_modified_at: -1,
      created_at: -1,
    });

    if (role === "user") {
      histories = histories.filter((h) => {
        const details = String(h.details || "").trim();

        // Exact match: "Order Payment"
        if (details === "Order Payment") return false;

        // Starts with: "Order Payment (...)"
        if (details.startsWith("Order Payment (")) return false;

        return true; // keep everything else
      });
    }

    return NextResponse.json({ success: true, data: histories }, { status: 200 });
  } catch (error) {
    console.error("GET history error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Server error", data: [] },
      { status: 500 }
    );
  }
}


// PUT - Replace a history record
export async function PUT(request) {
  try {
    await connectDB();
    const { id, transaction_id, ...rest } = await request.json();
    const updateId = id || transaction_id;

    if (!updateId) {
      return NextResponse.json(
        { success: false, message: "ID or transaction_id is required" },
        { status: 400 }
      );
    }

    let updatedHistory;
    if (mongoose.Types.ObjectId.isValid(updateId)) {
      updatedHistory = await History.findByIdAndUpdate(updateId, rest, { new: true });
    } else {
      updatedHistory = await History.findOneAndUpdate({ transaction_id: updateId }, rest, { new: true });
    }

    if (!updatedHistory) {
      return NextResponse.json({ success: false, message: "History record not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedHistory }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// PATCH - Partial update of a history record
export async function PATCH(request) {
  try {
    await connectDB();
    const { id, transaction_id, ...updates } = await request.json();

    let updatedHistory;
    if (mongoose.Types.ObjectId.isValid(id || transaction_id)) {
      updatedHistory = await History.findByIdAndUpdate(id || transaction_id, updates, { new: true });
    } else {
      updatedHistory = await History.findOneAndUpdate({ transaction_id }, updates, { new: true });
    }

    if (!updatedHistory) {
      return NextResponse.json({ success: false, message: "History record not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedHistory }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// DELETE - Remove a history record
export async function DELETE(request) {
  try {
    await connectDB();
    const { id, transaction_id } = await request.json();

    let deletedHistory;
    if (mongoose.Types.ObjectId.isValid(id || transaction_id)) {
      deletedHistory = await History.findByIdAndDelete(id || transaction_id);
    } else {
      deletedHistory = await History.findOneAndDelete({ transaction_id });
    }

    if (!deletedHistory) {
      return NextResponse.json({ success: false, message: "History record not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "History record deleted" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

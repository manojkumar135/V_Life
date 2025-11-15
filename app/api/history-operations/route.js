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

// ✅ Helper: Update or insert rank details
async function updateUserRank(userId, rankLevel, qualifiedUsers) {
  const rankKey = `${rankLevel}_star`;

  await Rank.findOneAndUpdate(
    { user_id: userId },
    {
      $set: {
        user_name: qualifiedUsers.length ? qualifiedUsers[0]?.referrer_name || undefined : undefined,
        [`ranks.${rankKey}`]: {
          qualified_users: qualifiedUsers,
          achieved_at: new Date(),
        },
      },
    },
    { upsert: true, new: true }
  );

  await User.updateOne({ user_id: userId }, { $set: { rank: String(rankLevel) } });
  await Login.updateOne(
    { user_id: userId },
    { $set: { rank: String(rankLevel) } }
  );
  await TreeNode.updateOne({ user_id: userId }, { $set: { rank: String(rankLevel) } });
  await Wallet.updateOne({ user_id: userId }, { $set: { rank: String(rankLevel) } });


}

// ✅ Rank Upgrade Logic
async function checkAndUpgradeRank(user) {
  console.log(`Checking rank for user: ${user.user_id}`);
  const currentRank = parseInt(user.rank === "none" ? "0" : user.rank, 10);

  if (currentRank >= 5) {
    console.log(`${user.user_id} is already at 5-star rank.`);
    return;
  }

  const directs = await User.find({ referBy: user.user_id }).lean();
  const treeNode = await TreeNode.findOne({ user_id: user.user_id }).lean();
  const leftUserId = await resolveChildUserId(treeNode?.left);
  const rightUserId = await resolveChildUserId(treeNode?.right);

  const paidDirects = [];
  for (const direct of directs) {
    const paid = await History.findOne({ user_id: direct.user_id, advance: true }).lean();
    if (paid) {
      const team = await getUserTeam(user.user_id, direct.user_id);
      paidDirects.push({ user: direct, payment_id: paid._id, team });
    }
  }

  const totalPaid = paidDirects.length;
  const leftUser = paidDirects.find(d => d.team === "left");
  const rightUser = paidDirects.find(d => d.team === "right");

  let rankRecord = await Rank.findOne({ user_id: user.user_id }).lean();
  if (!rankRecord) {
    await Rank.create({ user_id: user.user_id, user_name: user.user_name || "", ranks: {} });
    rankRecord = await Rank.findOne({ user_id: user.user_id }).lean();
  }

  // Partial qualification record
  if (currentRank < 1) {
    const existingQualified = rankRecord?.ranks?.["1_star"]?.qualified_users || [];
    const toAdd = [];

    if (leftUser && !existingQualified.some(u => u.team === "left")) {
      toAdd.push({
        user_id: leftUser.user.user_id,
        user_name: leftUser.user.user_name || "",
        team: "left",
        payment_id: leftUser.payment_id,
      });
    }
    if (rightUser && !existingQualified.some(u => u.team === "right")) {
      toAdd.push({
        user_id: rightUser.user.user_id,
        user_name: rightUser.user.user_name || "",
        team: "right",
        payment_id: rightUser.payment_id,
      });
    }

    if (toAdd.length) {
      const merged = [...existingQualified, ...toAdd];
      await Rank.findOneAndUpdate(
        { user_id: user.user_id },
        { $set: { "ranks.1_star.qualified_users": merged } },
        { upsert: true }
      );
      console.log(`Partial 1-star progress for ${user.user_id}:`, merged);
      rankRecord = await Rank.findOne({ user_id: user.user_id }).lean();
    }
  }

  // Full 1-star
  if (currentRank < 1 && leftUser && rightUser) {
    await updateUserRank(user.user_id, 1, [
      {
        user_id: leftUser.user.user_id,
        user_name: leftUser.user.user_name || "",
        team: "left",
        payment_id: leftUser.payment_id,
      },
      {
        user_id: rightUser.user.user_id,
        user_name: rightUser.user.user_name || "",
        team: "right",
        payment_id: rightUser.payment_id,
      },
    ]);
    console.log(`${user.user_id} achieved 1-star rank ✅`);
    return;
  }

  // 2-star to 5-star logic
  if (currentRank >= 1 && currentRank < 5) {
    const nextRank = currentRank + 1;
    const requiredPaid = nextRank * 2;
    if (totalPaid >= requiredPaid) {
      const qualifiedUsers = paidDirects
        .slice(requiredPaid - 2, requiredPaid)
        .map(d => ({
          user_id: d.user.user_id,
          user_name: d.user.user_name || "",
          team: d.team,
          payment_id: d.payment_id,
        }));

      await updateUserRank(user.user_id, nextRank, qualifiedUsers);
      console.log(`${user.user_id} achieved ${nextRank}-star rank ✅`);
      return;
    }
  }

  // Already 5-star
  if (currentRank >= 5) {
    const extraUsers = paidDirects.map(d => ({
      user_id: d.user.user_id,
      user_name: d.user.user_name || "",
      team: d.team,
      payment_id: d.payment_id,
    }));
    await Rank.findOneAndUpdate(
      { user_id: user.user_id },
      { $set: { "ranks.extra": { qualified_users: extraUsers } } },
      { upsert: true }
    );
  }
}

// ✅ POST - Create payment record
export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();

    const existingPayment = await History.findOne({ user_id: body.user_id });
    const isAdvancePayment =
      !existingPayment &&
      (body.advance === true || body.source === "advance") &&
      Number(body.amount) >= 10000;

    body.first_payment = !existingPayment;
    body.advance = isAdvancePayment;
    body.ischecked = false;

    const newHistory = await History.create(body);

    // After advance payment
    if (isAdvancePayment) {
      const user = await User.findOne({ user_id: body.user_id });

      if (user) {
        const updateData = {
          user_status: "active",
          status: "active",
          status_notes: "Activated automatically after advance payment",
          activated_date: `${String(date.getDate()).padStart(2, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()}`,
          last_modified_at: new Date(),
        };

        await Promise.all([
          User.updateOne({ user_id: body.user_id }, { $set: updateData }),
          Login.updateMany({ user_id: body.user_id }, { $set: updateData }),
          TreeNode.updateOne({ user_id: body.user_id }, { $set: updateData }),
          Wallet.updateOne({ user_id: body.user_id }, { $set: updateData }),

        ]);

        // ✅ Create alert for activation
        await Alert.create({
          user_id: user.user_id,
          user_name: user.user_name || "",
          user_contact: user.user_contact || "",
          user_email: user.user_email || "",
          user_status: "active",
          role: "user",
          priority: "high",
          title: "🎉 Account Activated!",
          description: `Hi ${user.user_name}, your account is now active. You can start placing orders and earning rewards.`,
          type: "activation",
          link: "/orders",
          read: false,
          date: (() => {
            const dd = String(date.getDate()).padStart(2, "0");
            const mm = String(date.getMonth() + 1).padStart(2, "0");
            const yyyy = date.getFullYear();
            return `${dd}-${mm}-${yyyy}`;
          })(),
        });
      }

      if (user?.referBy) {
        const referrerId = user.referBy;
        console.log("\n====================================");
        console.log("🎯 ADVANCE PAYMENT TRIGGERED FOR:", user.user_id);
        console.log("👤 Referrer:", referrerId);

        // 1️⃣ Add direct referral (no duplicates)
        const updateResult = await User.updateOne(
          { user_id: referrerId, paid_directs: { $ne: user.user_id } },
          {
            $addToSet: { paid_directs: user.user_id },
            $inc: { paid_directs_count: 1 },
          }
        );

        console.log("📌 paid_directs update result:", updateResult);

        const refBefore = await User.findOne({ user_id: referrerId });
        console.log("✅ Updated paid_directs for referrer:", refBefore?.paid_directs);

        // 2️⃣ Update Infinity team (referrer + upper chain)
        console.log("\n🚀 Calling updateInfinityTeam for:", referrerId);
        await updateInfinityTeam(referrerId);

        console.log("🔁 Propagating Infinity to ancestors...");
        await propagateInfinityUpdateToAncestors(referrerId);
        console.log("✅ Infinity propagation completed");

        // 3️⃣ Rank validation
        const referrer = await User.findOne({ user_id: referrerId }, { _id: 0 });
        if (referrer) {
          try {
            console.log("\n🏆 Checking Rank Upgrade for:", referrer.user_id);
            const oldRank = referrer.rank;

            await checkAndUpgradeRank(referrer);
            // Fetch updated rank
            const updatedReferrer = await User.findOne({ user_id: referrer.user_id });
            if (updatedReferrer && updatedReferrer.rank !== oldRank) {
              console.log(`🎉 ${referrer.user_id} achieved new rank: ${updatedReferrer.rank}`);

              // ✅ Create Alert for Rank Achievement
              await Alert.create({
                user_id: referrer.user_id,
                user_name: updatedReferrer.user_name || "",
                user_contact: updatedReferrer.user_contact || "",
                user_email: updatedReferrer.user_email || "",
                user_status: updatedReferrer.user_status || "active",
                role: "user",
                priority: "high",
                title: "🎖️ Rank Achieved!",
                description: `Congratulations ${updatedReferrer.user_name}! You've achieved Rank ${updatedReferrer.rank}. Keep up the great work!`,
                type: "achievement",
                link: "/dashboards",
                read: false,
                date: (() => {
                  const now = new Date();
                  const dd = String(now.getDate()).padStart(2, "0");
                  const mm = String(now.getMonth() + 1).padStart(2, "0");
                  const yyyy = now.getFullYear();
                  return `${dd}-${mm}-${yyyy}`;
                })(),
              });
            }
            console.log("✅ Rank check completed");
          } catch (err) {
            console.error("❌ Rank upgrade error:", err);
          }
        }

        console.log("====================================\n");
      }


    }

    return NextResponse.json({ success: true, data: newHistory }, { status: 201 });
  } catch (error) {
    console.error("Error creating history:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
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

    const histories = await History.find(finalQuery).sort({ date: -1 });

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

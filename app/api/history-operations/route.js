import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { History } from "@/models/history";
import { User } from "@/models/user";
import { Login } from "@/models/login";
import TreeNode from "@/models/tree";
import { Rank } from "@/models/rank";
import mongoose from "mongoose";


const date = new Date();

// 🔹 Update or insert rank details in Rank collection + User table
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
    { upsert: true, new: true }
  );

  await User.updateOne({ user_id: userId }, { $set: { rank: String(rankLevel) } });
}

// 🔹 Check rank conditions and upgrade if eligible
async function checkAndUpgradeRank(user) {
  const currentRank = parseInt(user.rank === "none" ? "0" : user.rank);

  // 🛑 Stop processing if already at max rank (5-star)
  if (currentRank >= 5) {
    console.log(`${user.user_id} is already at 5-star rank.`);
    return;
  }

  // 🔹 Fetch all direct users referred by this user
  const directs = await User.find({ referBy: user.user_id });

  // 🔹 Find directs who have paid advance
  const paidDirects = [];
  for (const direct of directs) {
    const paid = await History.findOne({ user_id: direct.user_id, advance: true });
    if (paid) {
      paidDirects.push({
        user: direct,
        payment_id: paid._id,
      });
    }
  }

  const totalPaid = paidDirects.length;

  // 🟡 For 1-star: one left + one right, both advance-paid
  if (currentRank < 1) {
    const leftUser = paidDirects.find((d) => d.user.user_id === user.left);
    const rightUser = paidDirects.find((d) => d.user.user_id === user.right);

    if (leftUser && rightUser) {
      await updateUserRank(user.user_id, 1, [
        {
          user_id: leftUser.user.user_id,
          team: "left",
          payment_id: leftUser.payment_id,
        },
        {
          user_id: rightUser.user.user_id,
          team: "right",
          payment_id: rightUser.payment_id,
        },
      ]);
      console.log(`${user.user_id} achieved 1-star rank ✅`);
      return;
    }
  }

  // 🟢 For 2-star to 5-star: every 2 more advance-paid directs (any team)
  if (currentRank >= 1 && currentRank < 5) {
    const nextRank = currentRank + 1;
    const requiredPaid = nextRank * 2; // total advance-paid needed to reach next rank

    if (totalPaid >= requiredPaid) {
      const qualifiedUsers = paidDirects
        .slice(requiredPaid - 2, requiredPaid)
        .map((d) => ({
          user_id: d.user.user_id,
          team: "any",
          payment_id: d.payment_id,
        }));

      await updateUserRank(user.user_id, nextRank, qualifiedUsers);
      console.log(`${user.user_id} achieved ${nextRank}-star rank ✅`);
      return;
    }
  }

  // 📝 If user is 5-star or not yet eligible, just keep future records in Rank doc
  if (currentRank >= 5) {
    const extraUsers = paidDirects.map((d) => ({
      user_id: d.user.user_id,
      team: "any",
      payment_id: d.payment_id,
    }));

    await Rank.findOneAndUpdate(
      { user_id: user.user_id },
      { $set: { "ranks.extra": { qualified_users: extraUsers } } },
      { upsert: true }
    );

    console.log(`${user.user_id} already 5-star, extra directs recorded.`);
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();

    // 🔹 Check if user already has any payment history
    const existingPayment = await History.findOne({ user_id: body.user_id });

    const isAdvancePayment =
      !existingPayment &&
      (body.advance === true || body.source === "advance") &&
      body.amount >= 10000;

    body.first_payment = !existingPayment;
    body.advance = isAdvancePayment;
    body.ischecked = false;


    // 🔹 Create payment record
    const newHistory = await History.create(body);

    // 🔹 If advance payment, check rank for referrer
    if (isAdvancePayment) {
      const user = await User.findOne({ user_id: body.user_id });

      if (user) {
        const updateData = {
          user_status: "active",
          status: "active",
          status_notes: "Activated automatically after advance payment",
          activated_date: `${String(date.getDate()).padStart(2, '0')}-${String(
            date.getMonth() + 1
          ).padStart(2, '0')}-${date.getFullYear()}`,

          last_modified_at: new Date(),
        };

        // 1️⃣ Update User collection
        await User.findOneAndUpdate({ user_id: body.user_id }, { $set: updateData });

        // 2️⃣ Update Login collection
        await Login.updateMany({ user_id: body.user_id }, { $set: updateData });

        // 3️⃣ Update TreeNode collection
        await TreeNode.findOneAndUpdate({ user_id: body.user_id }, { $set: updateData });
      }


      if (user?.referBy) {
        const referrer = await User.findOne({ user_id: user.referBy });
        if (referrer) await checkAndUpgradeRank(referrer);
      }
    }



    return NextResponse.json({ success: true, data: newHistory }, { status: 201 });
  } catch (error) {
    console.error("Error:", error);
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

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { History } from "@/models/history";
import mongoose from "mongoose";

// POST - Create new history record
export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();
    const newHistory = await History.create(body);
    return NextResponse.json({ success: true, data: newHistory }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// GET - Fetch all history records OR single history record by id / transaction_id
export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);

    const id = searchParams.get("id") || searchParams.get("transaction_id");
    const userId = searchParams.get("user_id");
    const minAmount = parseFloat(searchParams.get("minAmount") || "10000");
    const search = searchParams.get("search");

    // 🔹 If ID or transaction_id is provided → fetch single history record
    if (id) {
      let history;
      if (mongoose.Types.ObjectId.isValid(id)) {
        history = await History.findById(id);
      } else {
        history = await History.findOne({ transaction_id: id });
      }

      if (!history) {
        return NextResponse.json(
          { success: false, message: "History record not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, data: history }, { status: 200 });
    }

    // ✅ Build query
    let query = {};

    // If user_id is passed
    if (userId) {
      query.user_id = userId;
    }

    // If minAmount is passed
    if (!isNaN(minAmount) && minAmount > 0) {
      query.amount = { $gte: minAmount };
    }

    // If search is passed
    if (search) {
      const searchTerms = search
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      query.$or = searchTerms.flatMap((term) => {
        const regex = new RegExp("^" + term, "i"); 
        return [
          { transaction_id: regex },
          { user_id: regex },
          { amount: regex },
          { type: regex },
          { status: regex },
          { description: regex },
        ];
      });
    }

    const histories = await History.find(query).sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: histories }, { status: 200 });
  } catch (error) {
    console.error("GET history error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Server error" },
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

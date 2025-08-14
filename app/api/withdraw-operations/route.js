import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Withdraw } from "@/models/withdraw";
import mongoose from "mongoose";

// POST - Create new withdrawal
export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();
    const newWithdraw = await Withdraw.create(body);
    return NextResponse.json({ success: true, data: newWithdraw }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// GET - Fetch all withdrawals OR single withdrawal by id / withdraw_id
export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id") || searchParams.get("withdraw_id");

    if (id) {
      let withdraw;
      if (mongoose.Types.ObjectId.isValid(id)) {
        withdraw = await Withdraw.findById(id);
      } else {
        withdraw = await Withdraw.findOne({ withdraw_id: id });
      }

      if (!withdraw) {
        return NextResponse.json({ success: false, message: "Withdrawal not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: withdraw }, { status: 200 });
    }

    const withdrawals = await Withdraw.find();
    return NextResponse.json({ success: true, data: withdrawals }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// PUT - Replace a withdrawal
export async function PUT(request) {
  try {
    await connectDB();
    const { id, withdraw_id, ...rest } = await request.json();
    const updateId = id || withdraw_id;

    if (!updateId) {
      return NextResponse.json(
        { success: false, message: "ID or withdraw_id is required" },
        { status: 400 }
      );
    }

    let updatedWithdraw;
    if (mongoose.Types.ObjectId.isValid(updateId)) {
      updatedWithdraw = await Withdraw.findByIdAndUpdate(updateId, rest, { new: true });
    } else {
      updatedWithdraw = await Withdraw.findOneAndUpdate({ withdraw_id: updateId }, rest, { new: true });
    }

    if (!updatedWithdraw) {
      return NextResponse.json({ success: false, message: "Withdrawal not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedWithdraw }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// PATCH - Partial update
export async function PATCH(request) {
  try {
    await connectDB();
    const { id, withdraw_id, ...updates } = await request.json();

    let updatedWithdraw;
    if (mongoose.Types.ObjectId.isValid(id || withdraw_id)) {
      updatedWithdraw = await Withdraw.findByIdAndUpdate(id || withdraw_id, updates, { new: true });
    } else {
      updatedWithdraw = await Withdraw.findOneAndUpdate({ withdraw_id }, updates, { new: true });
    }

    if (!updatedWithdraw) {
      return NextResponse.json({ success: false, message: "Withdrawal not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedWithdraw }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// DELETE - Remove a withdrawal
export async function DELETE(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const withdraw_id = searchParams.get("withdraw_id");

    let deletedWithdraw;
    if (mongoose.Types.ObjectId.isValid(id || withdraw_id)) {
      deletedWithdraw = await Withdraw.findByIdAndDelete(id || withdraw_id);
    } else {
      deletedWithdraw = await Withdraw.findOneAndDelete({ withdraw_id });
    }

    if (!deletedWithdraw) {
      return NextResponse.json({ success: false, message: "Withdrawal not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Withdrawal deleted" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}


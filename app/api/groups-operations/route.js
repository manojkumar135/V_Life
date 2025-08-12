import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Group } from "@/models/group";
import mongoose from "mongoose";

// POST - Create new group
export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();
    const newGroup = await Group.create(body);
    return NextResponse.json({ success: true, data: newGroup }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// GET - Fetch all groups OR single group by id / group_id
export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id") || searchParams.get("group_id");

    if (id) {
      let group;
      if (mongoose.Types.ObjectId.isValid(id)) {
        group = await Group.findById(id);
      } else {
        group = await Group.findOne({ group_id: id });
      }

      if (!group) {
        return NextResponse.json({ success: false, message: "Group not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: group }, { status: 200 });
    }

    const groups = await Group.find();
    return NextResponse.json({ success: true, data: groups }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// PUT - Replace a group
export async function PUT(request) {
  try {
    await connectDB();
    const { id, group_id, ...rest } = await request.json();
    const updateId = id || group_id;

    if (!updateId) {
      return NextResponse.json(
        { success: false, message: "ID or group_id is required" },
        { status: 400 }
      );
    }

    let updatedGroup;
    if (mongoose.Types.ObjectId.isValid(updateId)) {
      updatedGroup = await Group.findByIdAndUpdate(updateId, rest, { new: true });
    } else {
      updatedGroup = await Group.findOneAndUpdate({ group_id: updateId }, rest, { new: true });
    }

    if (!updatedGroup) {
      return NextResponse.json({ success: false, message: "Group not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedGroup }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// PATCH - Partial update
export async function PATCH(request) {
  try {
    await connectDB();
    const { id, group_id, ...updates } = await request.json();

    let updatedGroup;
    if (mongoose.Types.ObjectId.isValid(id || group_id)) {
      updatedGroup = await Group.findByIdAndUpdate(id || group_id, updates, { new: true });
    } else {
      updatedGroup = await Group.findOneAndUpdate({ group_id }, updates, { new: true });
    }

    if (!updatedGroup) {
      return NextResponse.json({ success: false, message: "Group not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedGroup }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// DELETE - Remove a group
export async function DELETE(request) {
  try {
    await connectDB();
    const { id, group_id } = await request.json();

    let deletedGroup;
    if (mongoose.Types.ObjectId.isValid(id || group_id)) {
      deletedGroup = await Group.findByIdAndDelete(id || group_id);
    } else {
      deletedGroup = await Group.findOneAndDelete({ group_id });
    }

    if (!deletedGroup) {
      return NextResponse.json({ success: false, message: "Group not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Group deleted" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

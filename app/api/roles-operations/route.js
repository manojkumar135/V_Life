import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Role } from "@/models/role";
import mongoose from "mongoose";

// POST - Create new role
export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();
    const newRole = await Role.create(body);
    return NextResponse.json({ success: true, data: newRole }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// GET - Fetch all roles OR single role by id / role_id
export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id") || searchParams.get("role_id");

    if (id) {
      let role;
      if (mongoose.Types.ObjectId.isValid(id)) {
        role = await Role.findById(id);
      } else {
        role = await Role.findOne({ role_id: id });
      }

      if (!role) {
        return NextResponse.json({ success: false, message: "Role not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: role }, { status: 200 });
    }

    const roles = await Role.find();
    return NextResponse.json({ success: true, data: roles }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// PUT - Replace a role
export async function PUT(request) {
  try {
    await connectDB();
    const { id, role_id, ...rest } = await request.json();
    const updateId = id || role_id;

    if (!updateId) {
      return NextResponse.json(
        { success: false, message: "ID or role_id is required" },
        { status: 400 }
      );
    }

    let updatedRole;
    if (mongoose.Types.ObjectId.isValid(updateId)) {
      updatedRole = await Role.findByIdAndUpdate(updateId, rest, { new: true });
    } else {
      updatedRole = await Role.findOneAndUpdate({ role_id: updateId }, rest, { new: true });
    }

    if (!updatedRole) {
      return NextResponse.json({ success: false, message: "Role not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedRole }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// PATCH - Partial update
export async function PATCH(request) {
  try {
    await connectDB();
    const { id, role_id, ...updates } = await request.json();

    let updatedRole;
    if (mongoose.Types.ObjectId.isValid(id || role_id)) {
      updatedRole = await Role.findByIdAndUpdate(id || role_id, updates, { new: true });
    } else {
      updatedRole = await Role.findOneAndUpdate({ role_id }, updates, { new: true });
    }

    if (!updatedRole) {
      return NextResponse.json({ success: false, message: "Role not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedRole }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// DELETE - Remove a role
export async function DELETE(request) {
  try {
    await connectDB();
    const { id, role_id } = await request.json();

    let deletedRole;
    if (mongoose.Types.ObjectId.isValid(id || role_id)) {
      deletedRole = await Role.findByIdAndDelete(id || role_id);
    } else {
      deletedRole = await Role.findOneAndDelete({ role_id });
    }

    if (!deletedRole) {
      return NextResponse.json({ success: false, message: "Role not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Role deleted" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

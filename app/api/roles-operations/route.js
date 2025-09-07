import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Role } from "@/models/roles";
import mongoose from "mongoose";
import { generateUniqueCustomId } from "@/utils/server/customIdGenerator";


// POST - Create new role
export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();

    // Generate unique role_id with prefix "RL"
    const role_id = await generateUniqueCustomId("RL", Role, 8, 8);

    // Attach role_id to body before saving
    const newRole = await Role.create({ ...body, role_id });

    return NextResponse.json({ success: true, data: newRole }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

// GET - Fetch all roles OR single role by id / role_id
export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id") || searchParams.get("role_id");
    const search = searchParams.get("search");

    // 🔹 If ID or role_id is provided → fetch single role
    if (id) {
      let role;
      if (mongoose.Types.ObjectId.isValid(id)) {
        role = await Role.findById(id);
      } else {
        role = await Role.findOne({ role_id: id });
      }

      if (!role) {
        return NextResponse.json(
          { success: false, message: "Role not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, data: role }, { status: 200 });
    }

    // ✅ build query
    let query = {};

    if (search) {
      // Split by comma and trim spaces
      const searchTerms = search
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      // Build OR conditions for each search term across all fields
      query.$or = searchTerms.flatMap((term) => {
        const regex = new RegExp(term, "i"); // case-insensitive
        return [
          { role_id: regex },
          { role_name: regex },
          { description: regex },
          { components: regex },
          { role_status: regex },
        ];
      });
    }

    const roles = await Role.find(query).sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: roles }, { status: 200 });
  } catch (error) {
    console.error("GET roles error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Server error" },
      { status: 500 }
    );
  }
}


// PUT - Replace a role
export async function PUT(request) {
  try {
    await connectDB();
    const body = await request.json();
    const { id, role_id, role_status, ...rest } = body;

    const updateId = id || role_id;
    if (!updateId) {
      return NextResponse.json(
        { success: false, message: "id or role_id is required" },
        { status: 400 }
      );
    }

    // include role_status explicitly
    const updateFields = { ...rest };
    if (role_status !== undefined) {
      updateFields.role_status = role_status;
    }

    let updatedRole;
    if (mongoose.Types.ObjectId.isValid(updateId)) {
      updatedRole = await Role.findByIdAndUpdate(updateId, updateFields, { new: true });
    } else {
      updatedRole = await Role.findOneAndUpdate({ role_id: updateId }, updateFields, { new: true });
    }

    if (!updatedRole) {
      return NextResponse.json(
        { success: false, message: "Role not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updatedRole });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
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
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const role_id = searchParams.get("role_id");

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


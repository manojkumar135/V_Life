import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/user";
import mongoose from "mongoose"; // <-- Add this


// POST - Create new user
export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();
    const newUser = await User.create(body);
    return NextResponse.json({ success: true, data: newUser }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// GET - Fetch all users OR single user by id
export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id") || searchParams.get("user_id");
    console.log("Fetching user with ID:", id);

    if (id) {
      // Convert id to ObjectId if it's a valid 24-char hex string
      let user;
      if (mongoose.Types.ObjectId.isValid(id)) {
        user = await User.findById(id);
      } else {
        user = await User.findOne({ user_id: id });
      }
      if (!user) {
        return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: user }, { status: 200 });
    }

    const users = await User.find();
    return NextResponse.json({ success: true, data: users }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}


// PUT - Replace a user
export async function PUT(request) {
  try {
    await connectDB();
    const { id, user_id, ...rest } = await request.json();
    
    // Use either id or user_id consistently
    const updateId = id || user_id;
    
    if (!updateId) {
      return NextResponse.json(
        { success: false, message: "ID is required" },
        { status: 400 }
      );
    }

    const updatedUser = await User.findByIdAndUpdate(
      updateId, 
      rest, 
      { new: true }
    );
    
    if (!updatedUser) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }
    
    console.log("Updated user:", updatedUser);
    return NextResponse.json({ success: true, data: updatedUser }, { status: 200 });
  } catch (error) {
    console.error("Update error:", error);
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
    const { id, ...updates } = await request.json();
    const updatedUser = await User.findByIdAndUpdate(id, updates, { new: true });
    return NextResponse.json({ success: true, data: updatedUser }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// DELETE - Remove a user
export async function DELETE(request) {
  try {
    await connectDB();
    const { id } = await request.json();
    await User.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: "User deleted" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/user";
import {Login} from "@/models/login";

import mongoose from "mongoose";
import { generateUniqueCustomId } from "@/utils/server/customIdGenerator";


// POST - Create new user
export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();

    const { mail, contact, user_name, first_name, last_name, role, role_id, title, address, pincode } = body;

    // Step 1: Check if mail or contact already exists in logins
    const existingLogin = await Login.findOne({
      $or: [{ mail }, { contact }],
    });

    if (existingLogin) {
      return NextResponse.json(
        { success: false, message: "Email or contact already exists" },
        { status: 400 }
      );
    }

    // Step 2: Generate user_id
    const user_id = await generateUniqueCustomId("US", User, 8, 8);

    // Step 3: Create User
    const newUser = await User.create({ ...body, user_id });

    // Step 4: Generate login_id
    const login_id = await generateUniqueCustomId("LG", Login, 8, 8);

    // Step 5: Hash default password (using contact as default password)
    const hashedPassword = await bcrypt.hash(contact, 10);

    // Step 6: Create Login
    const newLogin = await Login.create({
      login_id,
      user_id,
      user_name,
      first_name,
      last_name,
      role,
      role_id,
      title,
      mail,
      contact,
      address,
      pincode,
      password: hashedPassword,
      status: "Active",
    });

    return NextResponse.json(
      { success: true, user: newUser, login: newLogin },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}


// GET - Fetch all users OR single user by id / user_id
export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id") || searchParams.get("user_id");

    if (id) {
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

// PUT - Replace a user (full update)
export async function PUT(request) {
  try {
    await connectDB();
    const { id, user_id, ...rest } = await request.json();
    const updateId = id || user_id;

    if (!updateId) {
      return NextResponse.json({ success: false, message: "ID is required" }, { status: 400 });
    }

    let updatedUser;
    if (mongoose.Types.ObjectId.isValid(updateId)) {
      updatedUser = await User.findByIdAndUpdate(updateId, rest, { new: true });
    } else {
      updatedUser = await User.findOneAndUpdate({ user_id: updateId }, rest, { new: true });
    }

    if (!updatedUser) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedUser }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// PATCH - Partial update
export async function PATCH(request) {
  try {
    await connectDB();
    const { id, user_id, ...updates } = await request.json();
    const updateId = id || user_id;

    if (!updateId) {
      return NextResponse.json({ success: false, message: "ID is required" }, { status: 400 });
    }

    let updatedUser;
    if (mongoose.Types.ObjectId.isValid(updateId)) {
      updatedUser = await User.findByIdAndUpdate(updateId, updates, { new: true });
    } else {
      updatedUser = await User.findOneAndUpdate({ user_id: updateId }, updates, { new: true });
    }

    if (!updatedUser) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedUser }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// DELETE - Remove a user
export async function DELETE(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const user_id = searchParams.get("user_id");

    let deletedUser;
    if (mongoose.Types.ObjectId.isValid(id || user_id)) {
      deletedUser = await User.findByIdAndDelete(id || user_id);
    } else {
      deletedUser = await User.findOneAndDelete({ user_id });
    }

    if (!deletedUser) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "User deleted" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import nodemailer from 'nodemailer';

import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/user";
import { Login } from "@/models/login";
import TreeNode from "@/models/tree";

import { generateUniqueCustomId } from "@/utils/server/customIdGenerator";
import { createUserAndLogin } from "./helpers";



// ------------------ ROUTES ------------------
export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();
    const { newUser, newLogin } = await createUserAndLogin(body);
    return NextResponse.json({ success: true, message: "User created successfully", user: newUser, login: newLogin }, { status: 201 });
  } catch (error) {
    console.error("❌ Error creating user:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
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
    const { id, user_id, dob, ...rest } = await request.json();
    const updateId = id || user_id;

    if (!updateId) {
      return NextResponse.json(
        { success: false, message: "ID is required" },
        { status: 400 }
      );
    }

    // 🔎 Duplicate check for contact/mail
    if (rest.contact || rest.mail) {
      const existingUser = await User.findOne({
        $or: [
          rest.contact ? { contact: rest.contact } : null,
          rest.mail ? { mail: rest.mail } : null,
        ].filter(Boolean),
        ...(mongoose.Types.ObjectId.isValid(updateId)
          ? { _id: { $ne: updateId } }
          : { user_id: { $ne: updateId } }),
      });

      if (existingUser) {
        return NextResponse.json(
          { success: false, message: "Email or Contact already exists" },
          { status: 400 }
        );
      }
    }

    // 🔄 Update User (safe with $set)
    let updatedUser;
    const updateFields = { ...rest };
    if (dob !== undefined) updateFields.dob = dob; // Ensure dob is always included

    if (mongoose.Types.ObjectId.isValid(updateId)) {
      updatedUser = await User.findByIdAndUpdate(
        updateId,
        { $set: updateFields },
        { new: true }
      );
    } else {
      updatedUser = await User.findOneAndUpdate(
        { user_id: updateId },
        { $set: updateFields },
        { new: true }
      );
    }

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // 🔄 Sync Login (update any matching fields dynamically)
    await Login.findOneAndUpdate(
      { user_id: updatedUser.user_id },
      { $set: updateFields },
      { new: true }
    );

    // 🔄 Sync TreeNode (map some fields explicitly, others dynamically)
    const treeNodeData = {
      ...(updateFields.user_id && { name: updateFields.user_id }),
      ...updateFields, // add all other fields dynamically (dob, gender, etc.)
    };

    await TreeNode.findOneAndUpdate(
      { user_id: updatedUser.user_id },
      { $set: treeNodeData },
      { new: true }
    );

    return NextResponse.json(
      { success: true, data: updatedUser },
      { status: 200 }
    );
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
    const { id, user_id, ...updates } = await request.json();
    const updateId = id || user_id;

    if (!updateId) {
      return NextResponse.json(
        { success: false, message: "ID is required" },
        { status: 400 }
      );
    }

    // 🔎 Duplicate check for email/phone
    if (updates.phone || updates.email) {
      const duplicate = await User.findOne({
        $or: [
          updates.phone ? { contact: updates.phone } : null,
          updates.email ? { mail: updates.email } : null,
        ].filter(Boolean),
        user_id: { $ne: updateId },
      });
      if (duplicate) {
        return NextResponse.json(
          {
            success: false,
            message:
              duplicate.contact === updates.phone
                ? "Contact already exists"
                : "Email already exists",
          },
          { status: 400 }
        );
      }
    }

    // 🔄 Update User
    let updatedUser;
    if (mongoose.Types.ObjectId.isValid(updateId)) {
      updatedUser = await User.findByIdAndUpdate(updateId, updates, { new: true });
    } else {
      updatedUser = await User.findOneAndUpdate({ user_id: updateId }, updates, { new: true });
    }

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // 🔄 Sync Login
    const loginUpdates = {};
    if (updates.userName) loginUpdates.user_name = updates.userName;
    if (updates.first_name) loginUpdates.first_name = updates.first_name;
    if (updates.last_name) loginUpdates.last_name = updates.last_name;
    if (updates.phone) loginUpdates.contact = updates.phone;
    if (updates.email) loginUpdates.mail = updates.email;
    if (updates.address) loginUpdates.address = updates.address;
    if (updates.pincode) loginUpdates.pincode = updates.pincode;
    if (updates.locality) loginUpdates.locality = updates.locality;
    if (updates.country) loginUpdates.country = updates.country;
    if (updates.state) loginUpdates.state = updates.state;
    if (updates.city || updates.district) {
      loginUpdates.district = updates.city || updates.district;
    }

    if (Object.keys(loginUpdates).length > 0) {
      await Login.findOneAndUpdate({ user_id: updatedUser.user_id }, loginUpdates, { new: true });
    }

    // 🔄 Sync TreeNode
    const treeUpdates = {};
    if (updates.userName) treeUpdates.name = updates.userName;
    if (updates.phone) treeUpdates.contact = updates.phone;
    if (updates.email) treeUpdates.mail = updates.email;
    if (updates.address) treeUpdates.address = updates.address;
    if (updates.locality) treeUpdates.locality = updates.locality;
    if (updates.pincode) treeUpdates.pincode = updates.pincode;
    if (updates.country) treeUpdates.country = updates.country;
    if (updates.state) treeUpdates.state = updates.state;
    if (updates.city || updates.district) {
      treeUpdates.district = updates.city || updates.district;
    }

    if (Object.keys(treeUpdates).length > 0) {
      await TreeNode.findOneAndUpdate({ user_id: updatedUser.user_id }, treeUpdates, { new: true });
    }

    return NextResponse.json(
      {
        success: true,
        message: "Profile updated successfully",
        data: updatedUser,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
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

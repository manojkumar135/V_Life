import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/user";
import { Login } from "@/models/login";
import TreeNode from "@/models/tree";
import { Wallet } from "@/models/wallet";

export async function PUT(req) {
  try {
    await connectDB();

    const { id, status, status_notes } = await req.json();
    // console.log("Received data:", { id, status, status_notes });
    if (!id || !status) {
      return NextResponse.json(
        { success: false, message: "Missing id or status" },
        { status: 400 }
      );
    }

    const newStatus = status === "active" ? "inactive" : "active";
    const notes =
      status_notes ||
      (newStatus === "active"
        ? "Activated by Admin"
        : "Deactivated by Admin");

    const now = new Date();
    const formattedDate = `${String(now.getDate()).padStart(2, "0")}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}-${now.getFullYear()}`;

    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    let user;

    // 🔹 Step 1: Find user by _id or user_id
    if (isObjectId) {
      user = await User.findById(id);
      if (!user)
        return NextResponse.json(
          { success: false, message: "User not found with _id" },
          { status: 404 }
        );
    } else {
      user = await User.findOne({ user_id: id });
      if (!user)
        return NextResponse.json(
          { success: false, message: "User not found with user_id" },
          { status: 404 }
        );
    }

    const userIdToUpdate = user.user_id;

    // 🔹 Step 2: Update User
    await User.updateOne(
      { user_id: userIdToUpdate },
      {
        user_status: newStatus,
        status_notes: notes,
        activated_date: formattedDate,
        last_modified_at: new Date(),
      }
    );

    // 🔹 Step 3: Update Login
    await Login.updateMany(
      { user_id: userIdToUpdate },
      {
        status: newStatus,
        status_notes: notes,
        activated_date: formattedDate,
        last_modified_at: new Date(),
      }
    );

    // 🔹 Step 4: Update TreeNode
    await TreeNode.updateMany(
      { user_id: userIdToUpdate },
      {
        status: newStatus,
        status_notes: notes,
        activated_date: formattedDate,
        updatedAt: new Date(),
      }
    );

    // 🔹 Step 5: Update Wallet
    await Wallet.updateMany(
      { user_id: userIdToUpdate },
      {
        status: newStatus,
        status_notes: notes,
        last_modified_at: new Date(),
      }
    );

    // ✅ Include user_id and newStatus in response
    return NextResponse.json({
      success: true,
      message: `User ${
        user.user_name || user.name || userIdToUpdate
      } status updated to ${newStatus}`,
      data: {
        user_id: userIdToUpdate,
        new_status: newStatus,
        user_name: user.user_name || user.name,
      },
    });
  } catch (error) {
    console.error("Error in status-operations:", error);
    return NextResponse.json(
      { success: false, message: "Server error", error: error.message },
      { status: 500 }
    );
  }
}

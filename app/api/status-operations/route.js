import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/user";
import { Login } from "@/models/login";
import TreeNode from "@/models/tree";
import { Wallet } from "@/models/wallet";
import { Alert } from "@/models/alert";
import {
  addActivatedUserToInfinity,
  addToPaidDirectsOrdered,
} from "@/services/infinity";
import { addRewardScore } from "@/services/updateRewardScore";
import { Score } from "@/models/score";

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

    await Alert.create({
      user_id: userIdToUpdate,
      user_name: user.user_name || user.name || "",
      user_contact: user.user_contact || "",
      user_email: user.user_email || "",
      user_status: newStatus,
      role: "user",
      priority: "high",
      title:
        newStatus === "active"
          ? "🎉 Account Activated!"
          : "⚠️ Account Deactivated",
      description:
        newStatus === "active"
          ? "Your account has been successfully activated. You can now place orders and access all features."
          : "Your account has been deactivated by the admin. Please contact support for more details.",
      type: "status",
      link: newStatus === "active" ? "/orders" : null, // ✅ Only add link for active users
      read: false,
      date: formattedDate,
    });

    // If activated, ensure added into infinity (flat list + leveled lists) and propagate
    if (newStatus === "active") {
      try {
        // ✅ FIX: add to sponsor's paid_directs in referred_users order
        // Must happen BEFORE addActivatedUserToInfinity so updateInfinityTeam
        // reads the correctly ordered paid_directs for odd/even assignment
        const freshActivated = await User.findOne({ user_id: userIdToUpdate }).lean();
        if (freshActivated?.referBy) {
          await addToPaidDirectsOrdered(freshActivated.referBy, userIdToUpdate);
        }

        await addActivatedUserToInfinity(userIdToUpdate);
      } catch (err) {
        console.error("Error adding activated user to infinity:", err);
      }

      // ✅ Release 15,000 cashback points — only once, only on activation
      try {
        const scoreDoc = await Score.findOne({ user_id: userIdToUpdate });

        const bonusAlreadyGiven = scoreDoc?.cashback?.history?.in?.some(
          (entry) => entry.source === "activation_bonus"
        );

        if (!bonusAlreadyGiven) {
          await addRewardScore({
            user_id: userIdToUpdate,
            points: 15000,
            source: "activation_bonus",
            reference_id: userIdToUpdate,
            remarks: "One-time cashback bonus on admin activation",
            type: "cashback",
          });
        }
      } catch (err) {
        console.error("Error releasing activation cashback bonus:", err);
      }
    }

    // ✅ Include user_id and newStatus in response
    return NextResponse.json({
      success: true,
      message: `User ${user.user_name || user.name || userIdToUpdate
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
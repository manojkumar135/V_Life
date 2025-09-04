import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/user";
import { Login } from "@/models/login";
import TreeNode from "@/models/tree";

export async function PUT(req) {
  try {
    await connectDB();

    const { id, status } = await req.json();
    if (!id || !status) {
      return NextResponse.json(
        { success: false, message: "Missing id or status" },
        { status: 400 }
      );
    }

    // toggle status
    const newStatus = status === "active" ? "inactive" : "active";

    // 1️⃣ Update User
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { user_status: newStatus, last_modified_at: new Date() },
      { new: true }
    );

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // 2️⃣ Update Login (match by user_id)
    await Login.updateMany(
      { user_id: updatedUser.user_id },
      {
        status: newStatus ,
        last_modified_at: new Date(),
      }
    );

    // 3️⃣ Update TreeNode (match by user_id)
    await TreeNode.findOneAndUpdate(
      { user_id: updatedUser.user_id },
      { status: newStatus, updatedAt: new Date() }
    );

    return NextResponse.json({
      success: true,
      message: `Status updated to ${newStatus}`,
      data: updatedUser,
    });
  } catch (error) {
    console.error("Error in status-operations:", error);
    return NextResponse.json(
      { success: false, message: "Server error", error: error.message },
      { status: 500 }
    );
  }
}

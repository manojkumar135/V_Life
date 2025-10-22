import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/user";
import { Login } from "@/models/login";
import TreeNode from "@/models/tree";

const date = new Date();

export async function PUT(req) {
  try {
    await connectDB();

    // 🧾 Parse request body
    const { id, status, status_notes } = await req.json();

    if (!id || !status) {
      return NextResponse.json(
        { success: false, message: "Missing id or status" },
        { status: 400 }
      );
    }

    // ✅ Determine new status (toggle if needed)
    const newStatus = status === "active" ? "inactive" : "active";

    // ✅ Create proper status notes
    const notes =
      status_notes ||
      (newStatus === "active"
        ? "Activated by Admin"
        : "Deactivated by Admin");

    // 1️⃣ Update User document
    const updatedUser = await User.findByIdAndUpdate(
      id,
      {
        user_status: newStatus,
        status_notes: notes, // ✅ store admin note
        activated_date: `${String(date.getDate()).padStart(2, '0')}-${String(
          date.getMonth() + 1
        ).padStart(2, '0')}-${date.getFullYear()}`,

        last_modified_at: new Date(),
      },
      { new: true }
    );

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // 2️⃣ Sync with Login collection (by user_id)
    await Login.updateMany(
      { user_id: updatedUser.user_id },
      {
        status: newStatus,
        status_notes: notes, // ✅ store admin note
        activated_date: `${String(date.getDate()).padStart(2, '0')}-${String(
          date.getMonth() + 1
        ).padStart(2, '0')}-${date.getFullYear()}`,
        last_modified_at: new Date(),
      }
    );

    // 3️⃣ Sync with TreeNode collection (by user_id)
    await TreeNode.findOneAndUpdate(
      { user_id: updatedUser.user_id },
      {
        status: newStatus,
        status_notes: notes, // ✅ store admin note
        activated_date: `${String(date.getDate()).padStart(2, '0')}-${String(
          date.getMonth() + 1
        ).padStart(2, '0')}-${date.getFullYear()}`,
        updatedAt: new Date(),
      }
    );

    // ✅ Success response
    return NextResponse.json({
      success: true,
      message: `User ${updatedUser.user_name} status updated to ${newStatus}`,
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

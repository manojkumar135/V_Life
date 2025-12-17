import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/user";
import { Order } from "@/models/order";

export async function GET(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);

    const user_id = searchParams.get("user_id");

    if (!user_id) {
      return NextResponse.json(
        { success: false, message: "user_id is required" },
        { status: 400 }
      );
    }

    // 1️⃣ Fetch user
    const user = await User.findOne({ user_id });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // 2️⃣ Admin activation check (status_notes)
    const note = user.status_notes?.toLowerCase()?.trim() || "";
    const activatedByAdmin =
      note === "activated by admin" || note === "activated" || note==="activated automatically after advance payment";
    // console.log(note,activatedByAdmin)


    // 3️⃣ User status check
    const isActive = user.user_status === "active";

    // 4️⃣ First order check
    const hasFirstOrder = await Order.exists({ user_id });

    // 5️⃣ FINAL permission logic
    const hasPermission =
       (isActive && !!hasFirstOrder) || activatedByAdmin;

    return NextResponse.json(
      {
        success: true,
        activatedByAdmin,
        isActive,
        hasFirstOrder: !!hasFirstOrder,
        hasPermission,
        data: {
          user_id: user.user_id,
          user_name: user.user_name,
          user_status: user.user_status,
          status_notes: user.status_notes || "",
          reason: activatedByAdmin
            ? "Activated by admin"
            : !isActive
            ? "User not active"
            : !hasFirstOrder
            ? "First order not placed"
            : "Eligible",
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("First order check error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Server error" },
      { status: 500 }
    );
  }
}

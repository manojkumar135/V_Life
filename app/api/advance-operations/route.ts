import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { History } from "@/models/history";
import { User } from "@/models/user";

export async function GET(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);

    const user_id = searchParams.get("user_id");
    const minAmount = Number(searchParams.get("minAmount") || 10000);

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

    // 2️⃣ Admin activation check
    const note = user.status_notes?.toLowerCase()?.trim();
    const hasAccess =
      note === "activated by admin" ||
      note === "activated";

    // 3️⃣ Advance payment check (IMPORTANT FIX)
    const advanceRecord = await History.findOne({
      user_id,
      advance: true,
      status: "Completed",
      amount: { $gte: minAmount },
    });

    const hasAdvance = !!advanceRecord;

    return NextResponse.json(
      {
        success: true,
        hasAccess,
        hasAdvance,
        hasPermission: hasAccess || hasAdvance,
        data: {
          user_id: user.user_id,
          user_name: user.user_name,
          hasAccess,
          hasAdvance,
          reason: hasAccess
            ? "Activated by admin"
            : hasAdvance
            ? "Advance payment completed"
            : "No access",
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("GET advance error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Server error" },
      { status: 500 }
    );
  }
}

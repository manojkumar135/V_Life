import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { History } from "@/models/history";
import { User } from "@/models/user"; // ✅ Make sure this path is correct

export async function GET(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);

    const user_id = searchParams.get("user_id");
    const minAmount = parseFloat(searchParams.get("minAmount") || "10000");

    if (!user_id) {
      return NextResponse.json(
        { success: false, message: "user_id is required" },
        { status: 400 }
      );
    }

    // 🔹 Step 1: Fetch the user
    const user = await User.findOne({ user_id });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // 🔹 Step 2: Determine if user has access based on status_notes
    const note = user.status_notes?.toLowerCase()?.trim();
    const hasAccess = note === "activated by admin" || note === "activated";

    // 🔹 Step 3: Check if user has made an advance payment
    const record = await History.findOne({
      user_id,
      amount: { $gte: minAmount },
    });

    const hasAdvance = !!record;

    return NextResponse.json(
      {
        success: true,
        hasAccess,
        hasAdvance,
        data: {
          user_id: user.user_id,
          user_name: user.user_name,
          hasAccess,  // Include hasAccess info
          hasAdvance, // Include hasAdvance info
          reason: hasAccess ? "Activated by admin" : "No access",
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

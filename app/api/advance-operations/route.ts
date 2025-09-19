import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { History } from "@/models/history";

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

    const exists = await History.findOne({
      user_id,
      amount: { $gte: minAmount },
    });

    return NextResponse.json(
      { success: true, hasAdvance: !!exists, data: exists },
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

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getPV } from "@/services/getPV";

export async function GET(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get("user_id");

    if (!user_id) {
      return NextResponse.json(
        { success: false, message: "user_id is required" },
        { status: 400 },
      );
    }

    const pv = await getPV(user_id);

    return NextResponse.json({ success: true, pv }, { status: 200 });
  } catch (error: any) {
    console.error("GET user-pv error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Server error" },
      { status: 500 },
    );
  }
}
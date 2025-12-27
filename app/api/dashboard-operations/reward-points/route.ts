import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Score } from "@/models/score";

export async function GET(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get("user_id");

    if (!user_id) {
      return NextResponse.json(
        { success: false, message: "User ID is required" },
        { status: 400 }
      );
    }

    const score = (await Score.findOne(
      { user_id },
      {
        user_id: 1,
        "daily.balance": 1,
        "fortnight.balance": 1,
        "cashback.balance": 1,
      }
    ).lean()) as any
console.log(score)


    if (!score) {
      return NextResponse.json(
        { success: false, message: "Score record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          daily: score.daily?.balance || 0,
          fortnight: score.fortnight?.balance || 0,
          cashback: score.cashback?.balance || 0,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error in reward-points route:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Server error" },
      { status: 500 }
    );
  }
}

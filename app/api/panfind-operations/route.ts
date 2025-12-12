import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { Wallet } from "@/models/wallet";  // adjust path if needed

// Connect DB (ensure you have a shared DB connection file)
import { connectDB } from "@/lib/mongodb";

export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const pan = searchParams.get("pan");

    // 1️⃣ Validate input
    if (!pan) {
      return NextResponse.json(
        { success: false, message: "PAN number is required" },
        { status: 400 }
      );
    }

    // 2️⃣ Valid PAN format (ABCDE1234F)
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

    if (!panRegex.test(pan)) {
      return NextResponse.json(
        { success: false, message: "Invalid PAN number format" },
        { status: 400 }
      );
    }

    // 3️⃣ Check existing PAN in Wallet
    const existingPan = await Wallet.findOne({ pan_number: pan });

    if (existingPan) {
      return NextResponse.json(
        {
          success: true,
          exists: true,
          message: "PAN already exists",
        },
        { status: 200 }
      );
    }

    // 4️⃣ PAN does not exist
    return NextResponse.json(
      {
        success: true,
        exists: false,
        message: "PAN available",
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("PAN lookup error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Server error checking PAN",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

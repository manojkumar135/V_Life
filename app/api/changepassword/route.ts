import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import {Login} from "@/models/login";

const secretKey = process.env.JWT_SECRET!;

export async function POST(req: Request) {
  try {
    await connectDB();
    const { oldPassword, newPassword } = await req.json();

    if (!oldPassword || !newPassword) {
      return NextResponse.json(
        { success: false, message: "All fields are required" },
        { status: 400 }
      );
    }

    // ✅ get cookies properly with await
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("accessToken")?.value;

    if (!accessToken) {
      return NextResponse.json(
        { success: false, message: "Unauthorized - No token provided" },
        { status: 401 }
      );
    }

    // verify token
    let decoded: any;
    try {
      decoded = jwt.verify(accessToken, secretKey);
    } catch (err) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // console.log("Decoded token:", decoded);
    // find login user
    const user = await Login.findById(decoded.id);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // check old password
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, message: "Old password is incorrect" },
        { status: 400 }
      );
    }

    // hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    return NextResponse.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// app/api/reset-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from "@/lib/mongodb";
import { Login } from '@/models/login';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const { email, newPassword } = await request.json();
    console.log(email, newPassword)

    if (!email || !newPassword) {
      return NextResponse.json(
        { success: false, message: "Email and new password are required" },
        { status: 400 }
      );
    }

    // Find user by mail
    const user = await Login.findOne({ mail:email });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Hash the new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update the password in the database
    user.password = hashedPassword;
    await user.save();

    return NextResponse.json(
      { success: true, message: "Password reset successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error resetting password:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
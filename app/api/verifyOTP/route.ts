// app/api/verify-otp/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyOtp } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { email, otp } = await request.json();

    if (!email || !otp) {
      return NextResponse.json(
        { success: false, message: "Email and OTP are required" },
        { status: 400 }
      );
    }

    const result = verifyOtp(email, otp);
    
    return NextResponse.json(
      { 
        success: result.success, 
        message: result.message 
      },
      { status: result.status }
    );
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
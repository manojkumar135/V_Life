// app/api/sendOTP/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { transporter, generateOTP, otpStorage } from '@/lib/email';
import { Login } from "@/models/login";
import { connectDB } from "@/lib/mongodb";

// Create simple HTML email body for OTP
const createOTPEmailBody = (otp: string) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset OTP</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #f9f9f9;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #ffffff;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          text-align: center;
          padding: 20px 0;
          border-bottom: 1px solid #eee;
        }
        .otp-container {
          text-align: center;
          padding: 30px 0;
          margin: 20px 0;
          background-color: #f5f5f5;
          border-radius: 8px;
        }
        .otp-code {
          font-size: 32px;
          font-weight: bold;
          letter-spacing: 5px;
          color: #000;
          padding: 15px 25px;
          background-color: #fff;
          border-radius: 6px;
          display: inline-block;
          margin: 15px 0;
          border: 2px dashed #ccc;
        }
        .footer {
          text-align: center;
          padding: 20px 0;
          border-top: 1px solid #eee;
          font-size: 12px;
          color: #777;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>Password Reset Request</h2>
        </div>
        
        <p>Hello,</p>
        <p>You requested to reset your password. Please use the following One-Time Password (OTP) to complete the process:</p>
        
        <div class="otp-container">
          <p>Your verification code is:</p>
          <div class="otp-code">${otp}</div>
          <p>This code will expire in <strong>2 minutes</strong> for security reasons.</p>
        </div>
        
        <p>If you didn't request this password reset, please ignore this email or contact support if you have concerns.</p>
        
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Send OTP email function
const sendOTP = async (email: string, otp: string) => {
  try {
    // Create HTML email body
    const htmlBody = createOTPEmailBody(otp);

    // Configure mail options
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your Password Reset OTP",
      html: htmlBody,
    };

    // Send email
    return await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending OTP email:", error);
    throw new Error("Failed to send OTP email");
  }
};

export async function POST(request: NextRequest) {
  try {
    // Connect to database
    await connectDB();
    
    const { email } = await request.json();
    console.log("Received email:", email);

    if (!email) {
      return NextResponse.json(
        { success: false, message: "Email is required" },
        { status: 400 }
      );
    }

    // Check if the email exists in the database using Login model
    const user = await Login.findOne({ mail: email });
    // console.log(user)

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User does not exist" },
        { status: 404 }
      );
    }

    // Generate OTP
    const otp = generateOTP();
    otpStorage[email] = { otp, expiry: Date.now() + 120000 }; // Store OTP with an expiry of 2 minutes

    // Send OTP email
    await sendOTP(email, otp);
    console.log("OTP sent and stored for email:", email);

    return NextResponse.json(
      { success: true, message: "OTP sent successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error sending OTP:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
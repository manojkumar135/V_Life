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
          background-color: #eef2f7;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 4px 16px rgba(12, 57, 120, 0.12);
        }
        .header {
          background: linear-gradient(135deg, #0C3978 0%, #106187 60%, #16B8E4 100%);
          text-align: center;
          padding: 28px 20px 22px;
        }
        .header img {
          max-height: 52px;
          margin-bottom: 12px;
          display: block;
          margin-left: auto;
          margin-right: auto;
        }
        .header h2 {
          margin: 0;
          color: #ffffff;
          font-size: 20px;
          letter-spacing: 1px;
        }
        .header p {
          margin: 4px 0 0;
          color: #a8d8f0;
          font-size: 11px;
          letter-spacing: 2px;
          text-transform: uppercase;
        }
        .body {
          padding: 28px 30px;
        }
        .body p {
          color: #333;
          font-size: 14px;
          margin: 0 0 12px;
        }
        .otp-container {
          text-align: center;
          padding: 24px 20px;
          margin: 18px 0;
          background-color: #f0f6ff;
          border: 1px solid #c8dff4;
          border-radius: 8px;
        }
        .otp-container p {
          margin: 0 0 10px;
          color: #106187;
          font-size: 14px;
        }
        .otp-code {
          font-size: 36px;
          font-weight: bold;
          letter-spacing: 8px;
          color: #0C3978;
          padding: 14px 28px;
          background-color: #fff;
          border-radius: 6px;
          display: inline-block;
          margin: 10px 0;
          border: 2px dashed #16B8E4;
        }
        .otp-container .expiry {
          margin: 10px 0 0;
          color: #555;
          font-size: 13px;
        }
        .notice {
          background: linear-gradient(135deg, #0C3978, #106187);
          border-radius: 8px;
          padding: 12px 16px;
          margin: 16px 0;
          color: #fff;
          font-size: 13.5px;
        }
        .footer {
          background-color: #0C3978;
          text-align: center;
          padding: 16px 20px;
        }
        .footer p {
          margin: 0;
          font-size: 11px;
          color: #7aaed4;
        }
      </style>
    </head>
    <body>
      <div class="container">

        <div class="header">
          <img src="public/maverick-logo.png" alt="Maverick Logo" />
          <h2>Password Reset Request</h2>
          <p>Where Vision Meets Action</p>
        </div>

        <div class="body">
          <p>Hello,</p>
          <p>You requested to reset your password. Please use the following One-Time Password (OTP) to complete the process:</p>

          <div class="otp-container">
            <p>Your verification code is:</p>
            <div class="otp-code">${otp}</div>
            <p class="expiry">This code will expire in <strong>2 minutes</strong> for security reasons.</p>
          </div>

          <div class="notice">
            If you didn't request this password reset, please ignore this email or contact support if you have concerns.
          </div>
        </div>

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
    console.log(otp)
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
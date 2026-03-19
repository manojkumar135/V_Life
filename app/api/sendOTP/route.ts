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
      <title>Your OTP from Maverick</title>
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
          text-align: center;
          padding: 28px 20px;
        }
        .header img {
          max-height: 56px;
          width: auto;
          display: block;
          margin: 0 auto;
        }
        .body {
          padding: 32px 30px;
          text-align: center;
        }
        .body p {
          color: #333;
          font-size: 14px;
          margin: 0 0 12px;
          text-align: left;
        }
        .otp-container {
          margin: 24px auto;
        }
        .otp-label {
          font-size: 14px;
          color: #106187;
          margin-bottom: 12px;
        }
        .otp-code {
          font-size: 40px;
          font-weight: bold;
          letter-spacing: 10px;
          color: #0C3978;
          padding: 16px 32px;
          background-color: #f0f6ff;
          border-radius: 8px;
          display: inline-block;
          border: 2px dashed #16B8E4;
        }
        .expiry {
          margin-top: 16px;
          font-size: 13px;
          color: #777;
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
          <img
            src="https://res.cloudinary.com/df2vugog5/image/upload/v1773936754/maverick-logo_ao66bd.png"
            alt="Maverick"
          />
        </div>

        <div class="body">
          <p>Hello,</p>
          <p>Your One-Time Password (OTP) from Maverick is:</p>

          <div class="otp-container">
            <div class="otp-code">${otp}</div>
            <p class="expiry">Use this code within <strong>5 minutes</strong>.</p>
          </div>

          <p>Do not share this OTP with anyone.</p>
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
      subject: "Your One Time Password (OTP)",
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
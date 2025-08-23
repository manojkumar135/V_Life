// lib/email.ts
import nodemailer from 'nodemailer';

// Configure nodemailer transporter
export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Generate a random 6-digit OTP
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// In-memory storage for OTPs (consider using Redis in production)
export const otpStorage: Record<string, { otp: string; expiry: number }> = {};

// Verify OTP function
export const verifyOtp = (email: string, otp: string) => {
  const storedOtpData = otpStorage[email];
  console.log(storedOtpData)


  if (!storedOtpData) {
    return { status: 400, success: false, message: "OTP not found for this email." };
  }

  // Check if the OTP has expired
  if (Date.now() > storedOtpData.expiry) {
    delete otpStorage[email]; // Clean up expired OTP
    return { status: 400, success: false, message: "OTP expired." };
  }

  // Verify the OTP
  if (storedOtpData.otp === otp) {
    delete otpStorage[email]; // Clean up verified OTP
    return { status: 200, success: true, message: "OTP verified successfully!" };
  } else {
    return { status: 200, success: false, message: "Invalid OTP." };
  }
};


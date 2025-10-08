import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

// Convert ISO date (YYYY-MM-DD) to DD/MM/YYYY
const formatDOB = (isoDate: string) => {
  const date = new Date(isoDate);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pan_number, pan_name, pan_dob } = body;

    if (!pan_number || !pan_name || !pan_dob) {
      return NextResponse.json(
        { success: false, message: "PAN number, name, and DOB are required" },
        { status: 400 }
      );
    }

    const KEY_ID = process.env.PAN_API_KEY_ID;
    const SECRET_KEY = process.env.PAN_API_SECRET_KEY;

    if (!KEY_ID || !SECRET_KEY) {
      return NextResponse.json(
        { success: false, message: "PAN API keys not configured" },
        { status: 500 }
      );
    }

    // Step 1: Get access token
    const authRes = await axios.post(
      "https://api.sandbox.co.in/authenticate",
      {},
      {
        headers: {
          "X-API-KEY": KEY_ID,
          "X-API-SECRET": SECRET_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    const accessToken = authRes.data?.access_token;
    if (!accessToken) {
      return NextResponse.json(
        { success: false, message: "Failed to get access token" },
        { status: 500 }
      );
    }

    // Step 2: Call PAN verification API
    const formattedDob = formatDOB(pan_dob);

    // console.log(formattedDob)

    const payload = {
      "@entity": "in.co.sandbox.kyc.pan_verification.request",
      pan: pan_number,
      name_as_per_pan: pan_name,
      date_of_birth: formattedDob,
      consent: "Y",
      reason: "for onboarding customer",
    };

    const panRes = await axios.post(
      "https://api.sandbox.co.in/kyc/pan/verify",
      payload,
      {
        headers: {
          Authorization: `${accessToken}`,
          "X-API-KEY": KEY_ID,
          "Content-Type": "application/json",
        },
      }
    );

    const panData = panRes.data;

    return NextResponse.json({
      success: true,
      data: panData,
      message: "PAN verification completed",
    });
  } catch (error: any) {
    console.error("PAN verification error:", error.response?.data || error.message);
    return NextResponse.json(
      {
        success: false,
        message: error.response?.data?.message || "PAN verification failed",
      },
      { status: 500 }
    );
  }
}

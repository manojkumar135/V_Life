import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { getSandboxToken, clearSandboxToken } from "@/lib/sandboxToken";

const formatDOB = (isoDate: string) => {
  const date = new Date(isoDate);
  return `${String(date.getDate()).padStart(2, "0")}/${String(
    date.getMonth() + 1
  ).padStart(2, "0")}/${date.getFullYear()}`;
};

// Dummy fallback values for basic PAN existence check
const DUMMY_NAME = "DUMMY NAME";
const DUMMY_DOB = "01/01/1990";

export async function POST(request: NextRequest) {
  try {
    const { pan_number, pan_name, pan_dob } = await request.json();

    if (!pan_number) {
      return NextResponse.json(
        { success: false, message: "PAN number is required" },
        { status: 400 }
      );
    }

    const KEY_ID = process.env.PAN_API_KEY_ID;
    if (!KEY_ID) {
      return NextResponse.json(
        { success: false, message: "PAN API key missing" },
        { status: 500 }
      );
    }

    // 1️⃣ GET TOKEN (cached or fresh)
    const token = await getSandboxToken();

    // 2️⃣ Use provided name/dob or fallback to dummy values
    const nameToUse = pan_name || DUMMY_NAME;
    const dobToUse = pan_dob ? formatDOB(pan_dob) : DUMMY_DOB;

    const url = "https://api.sandbox.co.in/kyc/pan/verify";
    const payload = {
      "@entity": "in.co.sandbox.kyc.pan_verification.request",
      pan: pan_number,
      name_as_per_pan: nameToUse,
      date_of_birth: dobToUse,
      consent: "Y",
      reason: "for onboarding customer",
    };

    // 3️⃣ CALL PAN API
    const panRes = await axios.post(url, payload, {
      headers: {
        Authorization: token,
        "x-api-key": KEY_ID,
        "Content-Type": "application/json",
      },
    });

    return NextResponse.json({
      success: true,
      data: panRes.data,
      mode: pan_name && pan_dob ? "with_details" : "basic",
    });

  } catch (error: any) {
    console.error("PAN verification error:", error?.response?.data);

    if (error?.response?.status === 401) {
      clearSandboxToken();
      return NextResponse.json(
        { success: false, message: "Auth token expired, please retry" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: error?.response?.data?.message || "PAN verification failed",
      },
      { status: error?.response?.status || 500 }
    );
  }
}
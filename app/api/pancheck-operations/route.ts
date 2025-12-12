import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

const formatDOB = (isoDate: string) => {
  const date = new Date(isoDate);
  return `${String(date.getDate()).padStart(2, "0")}/${String(
    date.getMonth() + 1
  ).padStart(2, "0")}/${date.getFullYear()}`;
};

export async function POST(request: NextRequest) {
  try {
    const { pan_number, pan_name, pan_dob } = await request.json();

    // console.log(pan_number,"pan number")

    if (!pan_number) {
      return NextResponse.json(
        { success: false, message: "PAN number is required" },
        { status: 400 }
      );
    }

    const KEY_ID = process.env.PAN_API_KEY_ID;
    const SECRET_KEY = process.env.PAN_API_SECRET_KEY;

    if (!KEY_ID || !SECRET_KEY) {
      return NextResponse.json(
        { success: false, message: "PAN API keys missing" },
        { status: 500 }
      );
    }

    // 1️⃣ FETCH TOKEN
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

    const token = authRes.data?.access_token;
    if (!token) {
      return NextResponse.json(
        { success: false, message: "Token generation failed" },
        { status: 500 }
      );
    }

    // 2️⃣ SELECT MODE
    let url = "";
    let payload: any = {};

    if (pan_name && pan_dob) {
      url = "https://api.sandbox.co.in/kyc/pan/verify";

      payload = {
        "@entity": "in.co.sandbox.kyc.pan_verification.request",
        pan: pan_number,
        name_as_per_pan: pan_name,
        date_of_birth: formatDOB(pan_dob),
        consent: "Y",
        reason: "for onboarding customer",
      };
    } else {
      url = "https://api.sandbox.co.in/kyc/pan";

      payload = {
        "@entity": "in.co.sandbox.kyc.pan.request",
        pan: pan_number,
        consent: "Y",
        reason: "for onboarding customer",
      };
    }

    // 3️⃣ CALL PAN API
    const panRes = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${token}`, // 🔥 FIXED
        "X-API-KEY": KEY_ID,
        "Content-Type": "application/json",
      },
    });

    return NextResponse.json({
      success: true,
      data: panRes.data,
      mode: pan_name && pan_dob ? "with_details" : "basic",
    });
  } catch (error: any) {
    console.error("PAN verification error FULL:", error?.response?.data);
    return NextResponse.json(
      {
        success: false,
        message: error?.response?.data?.message || "PAN verification failed",
      },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Login } from "@/models/login";
import { User } from "@/models/user";
import { Wallet } from "@/models/wallet"; // ✅ added
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Score } from "@/models/score";

const secretKey = process.env.JWT_SECRET as string;
const secretRefreshKey = process.env.JWT_REFRESH_SECRET as string;

export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();
    const loginId = body.loginId?.trim();
    const password = body.password;

    if (!loginId || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "User ID/Contact and password are required",
        },
        { status: 400 },
      );
    }

    // 🔹 Find Login Record
    const loginRecord = await Login.findOne({
      $or: [{ login_id: loginId }, { user_id: loginId }, { contact: loginId }],
    });

    if (!loginRecord) {
      return NextResponse.json(
        { success: false, message: "Invalid User ID or Contact" },
        { status: 404 },
      );
    }

    // 🔐 Password / Passkey check
    const isPasswordMatch = await bcrypt.compare(
      password,
      loginRecord.password,
    );

    const isPasskeyMatch = loginRecord.passkey
      ? await bcrypt.compare(password, loginRecord.passkey)
      : false;

    if (!isPasswordMatch && !isPasskeyMatch) {
      return NextResponse.json(
        { success: false, message: "Incorrect password" },
        { status: 401 },
      );
    }

    // ✅ Convert login doc
    const loginObj = loginRecord.toObject();

    // 🔒 Remove sensitive fields
    delete loginObj.password;
    delete loginObj.passkey;
    delete loginObj.login_key;

    // ✅ Fetch User FULL
    const userData = await User.findOne(
      { user_id: loginRecord.user_id },
      { _id: 0 },
    ).lean();

    // ✅ Fetch PAN from Wallet (only required fields)
    const walletData = (await Wallet.findOne(
      { user_id: loginRecord.user_id },
      { pan_number: 1, pan_verified: 1, _id: 0 },
    ).lean()) as any;

    // ✅ FINAL MERGE (spread + PAN override)
    const finalUser: any = {
      ...loginObj,
      ...userData,

      // 🔥 PAN logic (Wallet > Login)
      pan: walletData?.pan_number || loginObj.pan || "",

      pan_verified:
        walletData?.pan_verified === true ||
        walletData?.pan_verified === "true" || walletData?.pan_verified === "Yes",
      role: loginObj.role || "user",
    };

    // ⭐ Score logic (UNCHANGED)
    const scoreData = await Score.findOne(
      { user_id: loginRecord.user_id },
      {
        "daily.balance": 1,
        "fortnight.balance": 1,
        "cashback.balance": 1,
        "reward.balance": 1,
        _id: 0,
      },
    ).lean<{
      daily?: { balance: number };
      fortnight?: { balance: number };
      cashback?: { balance: number };
      reward?: { balance: number };
    }>();

    finalUser.dailyReward = scoreData?.daily?.balance ?? 0;
    finalUser.fortnightReward = scoreData?.fortnight?.balance ?? 0;
    finalUser.cashbackReward = scoreData?.cashback?.balance ?? 0;
    finalUser.rewardPoints = scoreData?.reward?.balance ?? 0;

    // 🔹 Generate Tokens
    const payload = {
      id: loginRecord._id,
      userId: loginRecord.user_id,
      role: loginRecord.role,
      loginId: loginRecord.login_id,
    };

    const accessToken = jwt.sign(payload, secretKey, { expiresIn: "15m" });
    const refreshToken = jwt.sign(payload, secretRefreshKey, {
      expiresIn: "7d",
    });

    // 🔹 Response
    const response = NextResponse.json(
      { success: true, message: "Login successful", data: finalUser },
      { status: 200 },
    );

    response.cookies.set("accessToken", accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      maxAge: 60 * 15,
      path: "/",
    });

    response.cookies.set("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

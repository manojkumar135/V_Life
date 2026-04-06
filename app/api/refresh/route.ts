import { NextResponse } from "next/server";
import jwt, { JwtPayload } from "jsonwebtoken";
import { generateAccessToken } from "@/utils/auth/token";
import { connectDB } from "@/lib/mongodb";
import { Login } from "@/models/login";
import { User } from "@/models/user";
import { Wallet } from "@/models/wallet"; // ✅ added
import { Score } from "@/models/score";

export const dynamic = "force-dynamic";

interface DecodedUser extends JwtPayload {
  id?: string;
  user_id?: string;
  role: string;
  user_name?: string;
}

export async function POST(req: Request) {
  try {
    await connectDB();

    const cookieHeader = req.headers.get("cookie");

    const refreshToken = cookieHeader
      ?.split(";")
      .find((c) => c.trim().startsWith("refreshToken="))
      ?.split("=")[1];

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, message: "No refresh token provided" },
        { status: 401 }
      );
    }

    // 🔑 Verify refresh token
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET as string
    ) as DecodedUser;

    if (!decoded?.id && !decoded?.user_id) {
      return NextResponse.json(
        { success: false, message: "Invalid token payload" },
        { status: 403 }
      );
    }

    // 🔍 Find user in Login collection
    const loginUser = await Login.findOne({
      $or: [{ _id: decoded.id }, { user_id: decoded.user_id }],
    }).select("-password -passkey -login_key");

    if (!loginUser) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // ✅ Convert login doc
    const loginObj = loginUser.toObject();

    // ✅ Get FULL user data
    const userData = await User.findOne(
      { user_id: loginUser.user_id },
      { _id: 0 }
    ).lean();

    // ✅ Get PAN from Wallet (only required fields)
    const walletData = (await Wallet.findOne(
      { user_id: loginUser.user_id },
      { pan_number: 1, pan_verified: 1, _id: 0 }
    ).lean() as any);

    // ✅ Merge + PAN override
    const finalUser: any = {
      ...loginObj,
      ...userData,

      // 🔥 PAN logic (Wallet > Login)
      pan: walletData?.pan_number || loginObj.pan || "",

      pan_verified:
        walletData?.pan_verified === true ||
        walletData?.pan_verified === "true" || walletData?.pan_verified === "Yes" ,
              role: loginObj.role || "user",

    };

    // ⭐ Score logic (UNCHANGED)
    const scoreData = await Score.findOne(
      { user_id: loginUser.user_id },
      {
        "daily.balance": 1,
        "fortnight.balance": 1,
        "cashback.balance": 1,
        "reward.balance": 1,
        _id: 0,
      }
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

    // 🎟 Generate new access token
    const accessToken = generateAccessToken({
      _id: loginUser._id.toString(),
      user_id: loginUser.user_id || "",
      fullName: loginUser.user_name || "",
      role: loginUser.role,
    });

    return NextResponse.json(
      {
        success: true,
        accessToken,
        user: finalUser,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Refresh error:", error);
    return NextResponse.json(
      { success: false, message: "Invalid refresh token" },
      { status: 403 }
    );
  }
}
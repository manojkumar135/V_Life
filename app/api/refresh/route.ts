import { NextResponse } from "next/server";
import jwt, { JwtPayload } from "jsonwebtoken";
import { generateAccessToken } from "@/utils/auth/token";
import { connectDB } from "@/lib/mongodb";
import { Login } from "@/models/login";
import { User } from "@/models/user"; // ⭐ get User model
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
    }).select("-password");

    if (!loginUser) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // ⭐ Fetch only important attributes (score, rank, club)
    const userData = await User.findOne(
      { user_id: loginUser.user_id },
      { score: 1, reward: 1,rank: 1, club: 1, _id: 0 }
    ).lean<{ score: number; rank: string; club: string,reward:number }>();

    // Convert login doc to plain object
    const loginObj = loginUser.toObject();

    // ⭐ Overwrite / add values directly from User model
    loginObj.score = userData?.score ?? 0;
    loginObj.reward = userData?.reward ?? 0;

    loginObj.rank = userData?.rank ?? loginObj.rank ?? "none";
    loginObj.club = userData?.club ?? loginObj.club ?? "none";


     const scoreData = await Score.findOne(
      { user_id: loginUser.user_id },
      {
        "daily.balance": 1,
        "fortnight.balance": 1,
        "cashback.balance": 1,
        _id: 0,
      }
    ).lean<{
      daily?: { balance: number };
      fortnight?: { balance: number };
      cashback?: { balance: number };
    }>();

    loginObj.dailyReward = scoreData?.daily?.balance ?? 0;
    loginObj.fortnightReward = scoreData?.fortnight?.balance ?? 0;
    loginObj.cashbackReward = scoreData?.cashback?.balance ?? 0;
    // console.log("Refreshed user data:", loginObj);

    // 🎟 Generate new short-lived access token
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
        user: loginObj,
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

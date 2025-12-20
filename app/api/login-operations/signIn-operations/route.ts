import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Login } from "@/models/login";
import { User } from "@/models/user"; // ⭐ Import User model
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {Score} from "@/models/score"

const secretKey = process.env.JWT_SECRET as string;
const secretRefreshKey = process.env.JWT_REFRESH_SECRET as string;

export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();
    const { loginId, password } = body;

    if (!loginId || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "User ID/Contact and password are required",
        },
        { status: 400 }
      );
    }

    // 🔹 Find Login Record
    const loginRecord = await Login.findOne({
      $or: [{ login_id: loginId }, { user_id: loginId }, { contact: loginId }],
    });

    if (!loginRecord) {
      return NextResponse.json(
        { success: false, message: "Invalid User ID or Contact" },
        { status: 404 }
      );
    }

    // 🔹 Compare password
    const isMatch = await bcrypt.compare(password, loginRecord.password);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, message: "Incorrect password" },
        { status: 401 }
      );
    }

    // Convert login doc to object
    const userObj = loginRecord.toObject();
    delete userObj.password;

    // ⭐ Fetch only score, rank and club from User
    const userData = await User.findOne(
      { user_id: loginRecord.user_id },
      { score: 1,reward: 1, rank: 1, club: 1, _id: 0 }
    ).lean<{ score: number; rank: string; club: string; reward: number }>();

    // ⭐ Overwrite or attach values from User
    userObj.score = userData?.score ?? 0;
    userObj.reward = userData?.reward ?? 0;
    userObj.rank = userData?.rank ?? userObj.rank ?? "none";
    userObj.club = userData?.club ?? userObj.club ?? "none";


    const scoreData = await Score.findOne(
      { user_id: loginRecord.user_id },
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

    userObj.dailyReward = scoreData?.daily?.balance ?? 0;
    userObj.fortnightReward = scoreData?.fortnight?.balance ?? 0;
    userObj.cashbackReward = scoreData?.cashback?.balance ?? 0;



    // console.log("Login user data:", userObj);

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

    // console.log(userObj)
    // 🔹 Create Response
    const response = NextResponse.json(
      { success: true, message: "Login successful", data: userObj },
      { status: 200 }
    );

    // Set Cookies
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
      { status: 500 }
    );
  }
}

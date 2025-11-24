import { NextResponse } from "next/server";
import jwt, { JwtPayload } from "jsonwebtoken";
import { generateAccessToken } from "@/utils/auth/token";
import { connectDB } from "@/lib/mongodb"; 
import { Login } from "@/models/login"; // 👈 switched to Login model

export const dynamic = "force-dynamic";

interface DecodedUser extends JwtPayload {
  id?: string;       // if _id stored in token
  user_id?: string;  // if custom user_id stored in token
  role: string;
  user_name?: string;
}

export async function POST(req: Request) {
  try {
    await connectDB();
    // console.log(req.headers)

    const cookieHeader = req.headers.get("cookie");
    // console.log(cookieHeader, "cookieHeader in refresh");
    const refreshToken = cookieHeader
      ?.split(";")
      .find((c) => c.trim().startsWith("refreshToken="))
      ?.split("=")[1];

      // console.log(refreshToken, "refreshToken in refresh");

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

    // 🔍 Find user from Login collection
    const loginUser = await Login.findOne({
      $or: [
        { _id: decoded.id },
        { user_id: decoded.user_id }
      ]
    }).select("-password"); // 🚫 exclude password

    if (!loginUser) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // 🎟 Generate new short-lived access token
    const accessToken = generateAccessToken({
      _id: loginUser._id.toString(),
      user_id: loginUser.user_id || "",
      fullName: loginUser.user_name || "",
      role: loginUser.role,
    });

    // console.log(accessToken, "new accessToken in refresh");
    // ✅ Return fresh login record + new token
    return NextResponse.json(
      {
        success: true,
        accessToken,
        user: loginUser,
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

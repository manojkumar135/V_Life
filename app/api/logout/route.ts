import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const secretKey = process.env.JWT_SECRET || "your-secret-key";

export async function POST(req: NextRequest) {
  try {
    // 1️⃣ Get token from cookies
    const accessToken = req.cookies.get("accessToken")?.value;

    if (!accessToken) {
      return NextResponse.json(
        { success: false, message: "No token provided" },
        { status: 401 }
      );
    }

    // 2️⃣ Verify token
    jwt.verify(accessToken, secretKey);

    // 3️⃣ Clear cookies (using delete)
    const response = NextResponse.json(
      { success: true, message: "Logged out" },
      { status: 200 }
    );

    response.cookies.delete("accessToken");
    response.cookies.delete("refreshToken");

    return response;
  } catch (err) {
    // Invalid or expired token
    return NextResponse.json(
      { success: false, message: "Invalid or expired token" },
      { status: 403 }
    );
  }
}

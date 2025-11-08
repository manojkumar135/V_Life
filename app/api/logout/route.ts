import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    // 🔹 Create a response for logout
    const response = NextResponse.json(
      { success: true, message: "Logged out successfully" },
      { status: 200 }
    );

    // 🔹 Clear cookies (access + refresh tokens)
    response.cookies.delete("accessToken");
    response.cookies.delete("refreshToken");

    return response;
  } catch (err) {
    return NextResponse.json(
      { success: false, message: "Logout failed" },
      { status: 500 }
    );
  }
}

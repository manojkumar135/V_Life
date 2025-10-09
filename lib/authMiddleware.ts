// lib/authMiddleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

const secretKey = process.env.JWT_SECRET || "your-secret-key";

// Public routes (accessible without login)
const PUBLIC_PATHS = [
  "/",
  "/auth/login",
  "/auth/register",
  "/auth/forgot",
  "/api/refresh",
  "/api/login-operations", 
  "/api/sendOTP",
  "/api/verifyOTP",
  "/api/resetpassword",
  "/api/users-operations"
];

export function authMiddleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const { pathname } = url;

  const accessToken = req.cookies.get("accessToken")?.value;
  const refreshToken = req.cookies.get("refreshToken")?.value;

  const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  // 1️⃣ User has tokens → prevent access to login/register pages
  if ((accessToken || refreshToken) && pathname.startsWith("/auth/login")) {
    url.pathname = "/dashboard"; // 👈 default redirect for logged-in users
    return NextResponse.redirect(url);
  }

  // 2️⃣ Public routes → allow
  if (isPublic) {
    return NextResponse.next();
  }

  // 3️⃣ No tokens → force login
  if (!accessToken && !refreshToken) {
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  // 4️⃣ Access token exists → verify
  if (accessToken) {
    try {
      const decoded = jwt.verify(accessToken, secretKey);

      const requestHeaders = new Headers(req.headers);
      requestHeaders.set("x-user", JSON.stringify(decoded));

      return NextResponse.next({
        request: { headers: requestHeaders },
      });
    } catch (err) {
      // Expired/invalid token
      if (refreshToken) {
        // let it continue, client should refresh
        return NextResponse.next();
      }
      url.pathname = "/auth/login";
      return NextResponse.redirect(url);
    }
  }

  // 5️⃣ Only refresh token exists
  if (refreshToken) {
    return NextResponse.next();
  }

  // Fallback
  url.pathname = "/auth/login";
  return NextResponse.redirect(url);
}

// lib/checkAuth.ts
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const secretKey = process.env.JWT_SECRET || "";

// Public routes (no auth required)
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
  "/api/users-operations",
  "/api/success",
];

export async function checkAuth(pathname: string) {
  const cookieStore = await cookies();
  const url = new URL(pathname, "http://localhost");

  const accessToken = cookieStore.get("accessToken")?.value;
  const refreshToken = cookieStore.get("refreshToken")?.value;

  const isPublic = PUBLIC_PATHS.some((path) =>
    pathname.startsWith(path)
  );

  // Logged-in user trying to access /auth/login → redirect dashboard
  if ((accessToken || refreshToken) && pathname.startsWith("/auth/login")) {
    url.pathname = "/dashboards";
    return NextResponse.redirect(url);
  }

  // Public route → allow as-is
  if (isPublic) return null;

  // No tokens → redirect login
  if (!accessToken && !refreshToken) {
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  // Access token exists → verify
  if (accessToken) {
    try {
      jwt.verify(accessToken, secretKey);
      return null; // allow UI render
    } catch {
      // If invalid but refreshToken exists → allow refresh flow
      if (refreshToken) return null;

      // Force login
      url.pathname = "/auth/login";
      return NextResponse.redirect(url);
    }
  }

  // Only refresh token → allow refresh flow
  if (refreshToken) return null;

  // Fallback: force login
  url.pathname = "/auth/login";
  return NextResponse.redirect(url);
}

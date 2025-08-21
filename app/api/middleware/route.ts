// lib/authMiddleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

const secretKey = process.env.JWT_SECRET || "your-secret-key";

export function authMiddleware(req: NextRequest) {
  const url = req.nextUrl.clone();

  // 1️⃣ Skip public routes like login
if (url.pathname.includes("/auth/login") || url.pathname.includes("/public")) {
  return NextResponse.next();
}

  // 2️⃣ Get access token from cookies
  const accessToken = req.cookies.get("accessToken")?.value;

  if (!accessToken) {
    // No token → redirect to login
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  // 3️⃣ Verify token
  try {
    const decoded = jwt.verify(accessToken, secretKey);
    // Optionally, attach user info to request headers for downstream API routes
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-user", JSON.stringify(decoded));

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  } catch (err) {
    // Invalid or expired token → redirect to login
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }
}

// 4️⃣ Apply middleware to protected routes
// export const config = {
//   matcher: ["/dashboard/:path*", "/profile/:path*", "/settings/:path*"],
// };

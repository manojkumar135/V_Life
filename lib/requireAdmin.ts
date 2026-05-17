// lib/requireAdmin.ts

import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

const ACCESS_SECRET  = process.env.JWT_SECRET         || "";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "";

interface DecodedToken {
  // login payload uses: id, userId, role, loginId
  id?:      string;
  userId?:  string;
  _id?:     string;  // generateAccessToken uses _id
  role:     string;
  iat?:     number;
  exp?:     number;
}

function checkRole(decoded: DecodedToken): boolean {
  return decoded.role === "admin" || decoded.role === "superadmin";
}

export function requireAdmin(
  req: Request,
): { error: NextResponse } | { decoded: DecodedToken } {
  const cookieHeader = req.headers.get("cookie") || "";

  const cookies = Object.fromEntries(
    cookieHeader
      .split(";")
      .map((c) => c.trim())
      .filter(Boolean)
      .map((c) => {
        const idx = c.indexOf("=");
        return [c.slice(0, idx), c.slice(idx + 1)];
      }),
  );

  const accessToken  = cookies["accessToken"];
  const refreshToken = cookies["refreshToken"];

  // Try accessToken first
  if (accessToken) {
    try {
      const decoded = jwt.verify(accessToken, ACCESS_SECRET) as DecodedToken;
      if (!checkRole(decoded)) {
        return {
          error: NextResponse.json(
            { success: false, message: "Forbidden — admin only" },
            { status: 403 },
          ),
        };
      }
      return { decoded };
    } catch {
      // expired — fall through to refreshToken
    }
  }

  // Try refreshToken
  if (refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, REFRESH_SECRET) as DecodedToken;
      if (!checkRole(decoded)) {
        return {
          error: NextResponse.json(
            { success: false, message: "Forbidden — admin only" },
            { status: 403 },
          ),
        };
      }
      return { decoded };
    } catch {
      return {
        error: NextResponse.json(
          { success: false, message: "Unauthorized — invalid or expired token" },
          { status: 401 },
        ),
      };
    }
  }

  return {
    error: NextResponse.json(
      { success: false, message: "Unauthorized — no token" },
      { status: 401 },
    ),
  };
}
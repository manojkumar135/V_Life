import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const secretKey = process.env.JWT_SECRET || "";

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

export async function checkAuth(pathname: string): Promise<string | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;
  const refreshToken = cookieStore.get("refreshToken")?.value;

  const isPublic = PUBLIC_PATHS.some((path) =>
    pathname.startsWith(path)
  );

  if ((accessToken || refreshToken) && pathname.startsWith("/auth/login")) {
    return "/dashboards"; // redirect
  }

  if (isPublic) return null;

  if (!accessToken && !refreshToken) {
    return "/auth/login"; // redirect
  }

  if (accessToken) {
    try {
      jwt.verify(accessToken, secretKey);
      return null; // allow
    } catch {
      if (refreshToken) return null; // allow refresh flow
      return "/auth/login";
    }
  }

  if (refreshToken) return null;

  return "/auth/login";
}

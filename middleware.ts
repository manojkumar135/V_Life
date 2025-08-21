// middleware.ts
import type { NextRequest } from "next/server";
import { authMiddleware } from "./lib/authMiddleware";

export function middleware(req: NextRequest) {
  return authMiddleware(req);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

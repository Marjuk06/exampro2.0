import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE } from "@/lib/constants";
import type { UserRole } from "@/types";

const secret = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? "dev-only-change-in-production-32chars!"
);

async function getSession(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      uid: payload.uid as string,
      role: payload.role as UserRole,
    };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await getSession(request);

  if (pathname.startsWith("/admin")) {
    if (!session || (session.role !== "admin" && session.role !== "superadmin")) {
      if (pathname === "/admin/login") return NextResponse.next();
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    if (pathname === "/admin/login") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  if (
    pathname.startsWith("/student") ||
    pathname.startsWith("/exam") ||
    pathname.startsWith("/profile")
  ) {
    if (!session) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
  }

  if (pathname.startsWith("/auth") && session) {
    const dest =
      session.role === "admin" || session.role === "superadmin"
        ? "/admin"
        : "/student";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/student/:path*",
    "/exam/:path*",
    "/profile/:path*",
    "/auth/:path*",
  ],
};

import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, isValidSession } from "@/lib/auth";

const PUBLIC_EXACT = new Set(["/login", "/api/auth/login"]);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const password = process.env.SITE_PASSWORD;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const ok = await isValidSession(token, password);

  if (pathname === "/login") {
    if (ok) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  if (PUBLIC_EXACT.has(pathname) || pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  if (ok) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, isValidSession } from "@/lib/auth";

const PUBLIC_EXACT = new Set(["/login", "/api/auth/login"]);

function publicUrl(req: NextRequest, pathname: string, search?: Record<string, string>) {
  const host = (req.headers.get("x-forwarded-host") || req.headers.get("host") || req.nextUrl.host)
    .split(",")[0]
    .trim();
  const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const proto =
    forwardedProto ||
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : req.nextUrl.protocol.replace(":", "") || "https");
  const url = new URL(pathname, `${proto}://${host}`);
  if (search) {
    for (const [key, value] of Object.entries(search)) url.searchParams.set(key, value);
  }
  return url;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const password = process.env.SITE_PASSWORD;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const ok = await isValidSession(token, password);

  if (pathname === "/login") {
    if (ok) {
      return NextResponse.redirect(publicUrl(req, "/"));
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

  return NextResponse.redirect(publicUrl(req, "/login", { next: pathname }));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

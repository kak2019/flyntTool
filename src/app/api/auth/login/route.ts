import { NextResponse } from "next/server";
import { SESSION_COOKIE, hashPassword } from "@/lib/auth";

export async function POST(req: Request) {
  const password = process.env.SITE_PASSWORD;
  if (!password) {
    return NextResponse.json(
      { error: "服务器未配置 SITE_PASSWORD" },
      { status: 500 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as { password?: string };
  if (body.password !== password) {
    return NextResponse.json({ error: "密码不对" }, { status: 401 });
  }

  const token = await hashPassword(password);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

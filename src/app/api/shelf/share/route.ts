import { NextRequest, NextResponse } from "next/server";
import { getShelfConfig, signedObjectUrl } from "@/lib/oss";
import { shelfExpiry, shelfKeyOk } from "@/lib/shelf";

export async function POST(req: NextRequest) {
  const config = getShelfConfig();
  if (!config) {
    return NextResponse.json({ error: "未配置 OSS" }, { status: 500 });
  }
  const body = (await req.json().catch(() => ({}))) as { key?: string };
  const key = String(body.key ?? "");
  if (!shelfKeyOk(key)) {
    return NextResponse.json({ error: "文件不存在" }, { status: 400 });
  }
  const expiresAt = shelfExpiry(key);
  const now = Math.floor(Date.now() / 1000);
  if (expiresAt <= now) {
    return NextResponse.json({ error: "文件已过期" }, { status: 410 });
  }
  return NextResponse.json({
    url: signedObjectUrl(config, key, expiresAt),
    expiresAt,
  });
}

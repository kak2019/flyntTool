import { NextRequest, NextResponse } from "next/server";
import { getNews } from "@/lib/news";

const WINDOW_MS = 60_000;
const MAX_HITS = 20;
const hits = new Map<string, { n: number; t: number }>();

function clientIp(req: NextRequest) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "local"
  );
}

function rateLimited(ip: string) {
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || now - rec.t > WINDOW_MS) {
    hits.set(ip, { n: 1, t: now });
    return false;
  }
  rec.n += 1;
  return rec.n > MAX_HITS;
}

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (rateLimited(clientIp(req))) {
    return NextResponse.json({ error: "请求太频繁，稍等再试" }, { status: 429 });
  }
  const force = req.nextUrl.searchParams.get("refresh") === "1";
  const payload = await getNews(force);
  return NextResponse.json(payload);
}

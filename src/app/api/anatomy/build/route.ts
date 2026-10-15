import { NextRequest, NextResponse } from "next/server";
import { runAnatomyBuild } from "@/learn/anatomy/run-build";
import { MAX_SCRIPT } from "@/learn/anatomy/script";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 60_000;
const MAX_BUILDS = 6;
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
  return rec.n > MAX_BUILDS;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { script?: string };
  const script = String(body.script ?? "");
  if (!script.trim()) {
    return NextResponse.json({ error: "没有构建脚本" }, { status: 400 });
  }
  if (script.length > MAX_SCRIPT) {
    return NextResponse.json({ error: `脚本太长，最多 ${MAX_SCRIPT} 字符` }, { status: 413 });
  }
  if (rateLimited(clientIp(req))) {
    return NextResponse.json({ error: "构建太频繁，稍等再试" }, { status: 429 });
  }
  const result = await runAnatomyBuild(script);
  return NextResponse.json(result);
}

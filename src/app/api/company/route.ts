import { NextRequest, NextResponse } from "next/server";
import { loadCompany, lookupCompany } from "@/lib/tyc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 60_000;
const MAX_HITS = 12;
const hits = new Map<string, { n: number; t: number }>();

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

function fail(err: unknown) {
  const message = err instanceof Error ? err.message : "查公司失败";
  const status = /额度用完/.test(message) ? 402 : /未配置|密钥|会员/.test(message) ? 503 : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "查得太勤了，等一分钟再试。" }, { status: 429 });
  }
  let body: { action?: string; name?: string; key?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求不是 JSON" }, { status: 400 });
  }

  try {
    if (body.action === "detail") {
      const key = String(body.key || "").trim();
      const name = String(body.name || key).trim();
      if (!key || key.length > 80) return NextResponse.json({ error: "缺少公司标识" }, { status: 400 });
      const profile = await loadCompany(key, name);
      return NextResponse.json({ profile });
    }
    const name = String(body.name || "").trim();
    if (name.length < 2 || name.length > 80) {
      return NextResponse.json({ error: "公司名请写 2 到 80 个字" }, { status: 400 });
    }
    return NextResponse.json(await lookupCompany(name));
  } catch (err) {
    return fail(err);
  }
}

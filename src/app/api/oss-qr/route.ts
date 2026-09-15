import { NextRequest, NextResponse } from "next/server";
import { getOssConfig, getOssObject, headOssObject, putOssObject } from "@/lib/oss";

const WINDOW_MS = 60_000;
const MAX_HITS = 12;
const MAX_BYTES = 2_000_000;
const hits = new Map<string, { n: number; t: number }>();

const TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

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

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/);
  if (!match) return null;
  const type = match[1].toLowerCase() === "image/jpg" ? "image/jpeg" : match[1].toLowerCase();
  const bytes = Buffer.from(match[2].replace(/\s/g, ""), "base64");
  return { type, bytes };
}

export async function GET() {
  const config = getOssConfig();
  if (!config) {
    return NextResponse.json({ configured: false });
  }
  const meta = await headOssObject(config).catch(() => ({ exists: false as const }));
  const exists = meta.exists || Boolean(await getOssObject(config).catch(() => null));
  return NextResponse.json({
    configured: true,
    url: config.publicUrl,
    exists,
    lastModified: meta.exists ? meta.lastModified : "",
  });
}

export async function POST(req: NextRequest) {
  if (rateLimited(clientIp(req))) {
    return NextResponse.json({ error: "更新太频繁，稍等再试" }, { status: 429 });
  }

  const config = getOssConfig();
  if (!config) {
    return NextResponse.json({ error: "未配置 OSS，请在 .env.local 填写 Bucket 和密钥" }, { status: 500 });
  }

  const body = (await req.json().catch(() => ({}))) as { image?: string };
  const parsed = parseDataUrl(String(body.image ?? "").trim());
  if (!parsed) {
    return NextResponse.json({ error: "请上传 png / jpg / webp 图片" }, { status: 400 });
  }
  if (!TYPES.has(parsed.type)) {
    return NextResponse.json({ error: "只支持 png / jpg / webp / gif" }, { status: 400 });
  }
  if (!parsed.bytes.length || parsed.bytes.length > MAX_BYTES) {
    return NextResponse.json({ error: "图片太大，请压到 2MB 以内" }, { status: 400 });
  }

  try {
    await putOssObject(config, parsed.bytes, parsed.type);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? `OSS 上传失败：${err.message}` : "OSS 上传失败" },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    url: config.publicUrl,
    updatedAt: new Date().toISOString(),
  });
}

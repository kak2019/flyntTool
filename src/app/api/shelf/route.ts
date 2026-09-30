import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import {
  OSS_SHELF_PREFIX,
  getShelfConfig,
  getPrivateObject,
  putPrivateObject,
  deleteOssObject,
  type OssConfig,
} from "@/lib/oss";
import { shelfKeyOk } from "@/lib/shelf";

const MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED_HOURS = new Set([1, 6, 24, 72, 168]);
const WINDOW_MS = 60_000;
const MAX_HITS = 30;
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

function fileNameOf(key: string) {
  return key.split("/").pop() || "file";
}

function safeName(name: string) {
  const cleaned = name
    .replace(/[/\\]/g, "")
    .replace(/[<>:"|?*\u0000-\u001f]/g, "")
    .trim()
    .slice(0, 120);
  return cleaned || "file";
}

const INDEX_KEY = `${OSS_SHELF_PREFIX}_index.json`;

type ShelfFile = {
  key: string;
  name: string;
  size: number;
  expiresAt: number;
  uploadedAt: string;
};

async function readIndex(config: OssConfig) {
  const raw = await getPrivateObject(config, INDEX_KEY);
  if (!raw) return [] as ShelfFile[];
  try {
    const parsed = JSON.parse(raw.toString("utf8")) as { files?: ShelfFile[] };
    return Array.isArray(parsed.files) ? parsed.files.filter((item) => item && shelfKeyOk(item.key)) : [];
  } catch {
    return [] as ShelfFile[];
  }
}

async function writeIndex(config: OssConfig, files: ShelfFile[]) {
  await putPrivateObject(config, INDEX_KEY, Buffer.from(JSON.stringify({ files })), "application/json");
}

async function liveFiles(config: OssConfig) {
  const now = Math.floor(Date.now() / 1000);
  const stored = await readIndex(config);
  const files: ShelfFile[] = [];
  let changed = false;
  for (const item of stored) {
    if (item.expiresAt <= now) {
      try {
        await deleteOssObject(config, item.key);
        changed = true;
      } catch {
        files.push(item);
      }
      continue;
    }
    files.push(item);
  }
  if (changed) await writeIndex(config, files);
  files.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  return files;
}

export async function GET(req: NextRequest) {
  if (rateLimited(clientIp(req))) {
    return NextResponse.json({ error: "请求太频繁，稍等再试" }, { status: 429 });
  }
  const config = getShelfConfig();
  if (!config) {
    return NextResponse.json({ configured: false, prefix: OSS_SHELF_PREFIX, files: [] });
  }
  try {
    const files = await liveFiles(config);
    return NextResponse.json({ configured: true, prefix: OSS_SHELF_PREFIX, files });
  } catch (err) {
    const message = err instanceof Error ? err.message : "读取文件架失败";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  if (rateLimited(clientIp(req))) {
    return NextResponse.json({ error: "请求太频繁，稍等再试" }, { status: 429 });
  }
  const config = getShelfConfig();
  if (!config) {
    return NextResponse.json({ error: "未配置 OSS" }, { status: 500 });
  }
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const hours = Number(form?.get("hours"));
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "没有文件" }, { status: 400 });
  }
  if (!ALLOWED_HOURS.has(hours)) {
    return NextResponse.json({ error: "请选择有效期" }, { status: 400 });
  }
  if (file.size <= 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: "单个文件需在 20MB 以内" }, { status: 400 });
  }
  const expiresAt = Math.floor(Date.now() / 1000) + hours * 3600;
  const key = `${OSS_SHELF_PREFIX}${expiresAt}_${randomBytes(4).toString("hex")}/${safeName(file.name)}`;
  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    await putPrivateObject(config, key, bytes, file.type || "application/octet-stream");
    const item: ShelfFile = {
      key,
      name: fileNameOf(key),
      size: file.size,
      expiresAt,
      uploadedAt: new Date().toISOString(),
    };
    const files = await readIndex(config);
    files.push(item);
    await writeIndex(config, files);
    return NextResponse.json(item);
  } catch (err) {
    const message = err instanceof Error ? err.message : "上传失败";
    const cause = err instanceof Error && err.cause instanceof Error ? err.cause.message : "";
    return NextResponse.json({ error: cause ? `${message}: ${cause}` : message }, { status: 502 });
  }
}

export async function DELETE(req: NextRequest) {
  if (rateLimited(clientIp(req))) {
    return NextResponse.json({ error: "请求太频繁，稍等再试" }, { status: 429 });
  }
  const config = getShelfConfig();
  if (!config) {
    return NextResponse.json({ error: "未配置 OSS" }, { status: 500 });
  }
  const body = (await req.json().catch(() => ({}))) as { key?: string };
  const key = String(body.key ?? "");
  if (!shelfKeyOk(key)) {
    return NextResponse.json({ error: "文件不存在" }, { status: 400 });
  }
  try {
    await deleteOssObject(config, key);
    const files = (await readIndex(config)).filter((item) => item.key !== key);
    await writeIndex(config, files);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "删除失败";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

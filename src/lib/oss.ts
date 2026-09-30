import { createHmac } from "crypto";

export type OssConfig = {
  accessKeyId: string;
  accessKeySecret: string;
  bucket: string;
  region: string;
  objectKey: string;
  publicUrl: string;
};

export function getOssConfig(): OssConfig | null {
  const accessKeyId = process.env.OSS_ACCESS_KEY_ID?.trim();
  const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET?.trim();
  const bucket = process.env.OSS_BUCKET?.trim();
  const region = (process.env.OSS_REGION || "oss-cn-hangzhou").trim();
  const objectKey = (process.env.OSS_OBJECT_KEY || "wechat-group.png").replace(/^\/+/, "");
  if (!accessKeyId || !accessKeySecret || !bucket) return null;
  const publicUrl = (
    process.env.OSS_PUBLIC_URL?.trim() ||
    `https://${bucket}.${region}.aliyuncs.com/${objectKey}`
  ).replace(/\/+$/, "");
  return { accessKeyId, accessKeySecret, bucket, region, objectKey, publicUrl };
}

export function getShelfConfig(): OssConfig | null {
  const accessKeyId = process.env.OSS_ACCESS_KEY_ID?.trim();
  const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET?.trim();
  const bucket = process.env.OSS_SHELF_BUCKET?.trim();
  const region = (process.env.OSS_SHELF_REGION || process.env.OSS_REGION || "oss-cn-hangzhou").trim();
  if (!accessKeyId || !accessKeySecret || !bucket) return null;
  return {
    accessKeyId,
    accessKeySecret,
    bucket,
    region,
    objectKey: "shelf/_index.json",
    publicUrl: `https://${bucket}.${region}.aliyuncs.com/shelf/`,
  };
}

function sign(secret: string, stringToSign: string) {
  return createHmac("sha1", secret).update(stringToSign).digest("base64");
}

function objectUrl(config: OssConfig) {
  return `https://${config.bucket}.${config.region}.aliyuncs.com/${config.objectKey
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

function signedHeaders(
  config: OssConfig,
  method: string,
  opts?: { contentType?: string; ossHeaders?: Record<string, string> },
) {
  const date = new Date().toUTCString();
  const ossHeaders = { ...opts?.ossHeaders };
  const canonicalOss = Object.entries(ossHeaders)
    .map(([key, value]) => [key.toLowerCase(), String(value)] as const)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${value}\n`)
    .join("");
  const contentType = opts?.contentType ?? "";
  const resource = `/${config.bucket}/${config.objectKey}`;
  const stringToSign = `${method}\n\n${contentType}\n${date}\n${canonicalOss}${resource}`;
  return {
    Date: date,
    ...ossHeaders,
    Authorization: `OSS ${config.accessKeyId}:${sign(config.accessKeySecret, stringToSign)}`,
  };
}

export async function putOssObject(config: OssConfig, body: Buffer, contentType: string) {
  const headers = signedHeaders(config, "PUT", {
    contentType,
    ossHeaders: { "x-oss-object-acl": "public-read" },
  });
  const res = await fetch(objectUrl(config), {
    method: "PUT",
    headers: {
      ...headers,
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=60",
    },
    body: new Uint8Array(body),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err.slice(0, 280) || `OSS 上传失败（${res.status}）`);
  }
}

async function requestOss(config: OssConfig, method: "GET" | "HEAD", signed: boolean) {
  return fetch(objectUrl(config), {
    method,
    headers: signed ? signedHeaders(config, method) : undefined,
    signal: AbortSignal.timeout(10_000),
  });
}

export async function headOssObject(config: OssConfig) {
  let res = await requestOss(config, "HEAD", false);
  if (!res.ok) res = await requestOss(config, "HEAD", true);
  if (!res.ok) return { exists: false as const };
  return {
    exists: true as const,
    lastModified: res.headers.get("last-modified") || "",
    contentType: res.headers.get("content-type") || "",
  };
}

export async function getOssObject(config: OssConfig) {
  let res = await requestOss(config, "GET", false);
  if (!res.ok) res = await requestOss(config, "GET", true);
  if (!res.ok) return null;
  return {
    bytes: Buffer.from(await res.arrayBuffer()),
    contentType: res.headers.get("content-type") || "image/jpeg",
  };
}

export const OSS_SHELF_PREFIX = "shelf/";

function endpoint(config: OssConfig) {
  return `https://${config.bucket}.${config.region}.aliyuncs.com`;
}

function encodedKey(objectKey: string) {
  return objectKey
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function authHeaders(
  config: OssConfig,
  method: string,
  resource: string,
  opts?: { contentType?: string; ossHeaders?: Record<string, string> },
) {
  const date = new Date().toUTCString();
  const ossHeaders = { ...opts?.ossHeaders };
  const canonicalOss = Object.entries(ossHeaders)
    .map(([key, value]) => [key.toLowerCase(), String(value)] as const)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${value}\n`)
    .join("");
  const contentType = opts?.contentType ?? "";
  const stringToSign = `${method}\n\n${contentType}\n${date}\n${canonicalOss}${resource}`;
  return {
    Date: date,
    ...ossHeaders,
    Authorization: `OSS ${config.accessKeyId}:${sign(config.accessKeySecret, stringToSign)}`,
  };
}

async function ossError(res: Response, fallback: string) {
  const raw = await res.text();
  const message = raw.match(/<Message>([\s\S]*?)<\/Message>/)?.[1]?.trim();
  throw new Error((message || raw).slice(0, 280) || `${fallback}（${res.status}）`);
}

export async function putPrivateObject(
  config: OssConfig,
  objectKey: string,
  body: Buffer,
  contentType: string,
) {
  const resource = `/${config.bucket}/${objectKey}`;
  const headers = authHeaders(config, "PUT", resource, {
    contentType,
    ossHeaders: { "x-oss-object-acl": "private" },
  });
  const res = await fetch(`${endpoint(config)}/${encodedKey(objectKey)}`, {
    method: "PUT",
    headers: { ...headers, "Content-Type": contentType },
    body: new Uint8Array(body),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) await ossError(res, "OSS 上传失败");
}

export async function getPrivateObject(config: OssConfig, objectKey: string) {
  const resource = `/${config.bucket}/${objectKey}`;
  const headers = authHeaders(config, "GET", resource);
  const res = await fetch(`${endpoint(config)}/${encodedKey(objectKey)}`, {
    method: "GET",
    headers,
    signal: AbortSignal.timeout(15_000),
  });
  if (res.status === 404) return null;
  if (!res.ok) await ossError(res, "OSS 读取失败");
  return Buffer.from(await res.arrayBuffer());
}

export async function deleteOssObject(config: OssConfig, objectKey: string) {
  const resource = `/${config.bucket}/${objectKey}`;
  const headers = authHeaders(config, "DELETE", resource);
  const res = await fetch(`${endpoint(config)}/${encodedKey(objectKey)}`, {
    method: "DELETE",
    headers,
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok && res.status !== 404) await ossError(res, "OSS 删除失败");
}

export type OssListItem = {
  key: string;
  size: number;
  lastModified: string;
};

export async function listOssPrefix(config: OssConfig, prefix: string) {
  const query = `max-keys=200&prefix=${prefix}`;
  const resource = `/${config.bucket}/`;
  const headers = authHeaders(config, "GET", resource);
  const res = await fetch(`${endpoint(config)}/?${query}`, {
    method: "GET",
    headers,
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) await ossError(res, "OSS 列表失败");
  const xml = await res.text();
  const items: OssListItem[] = [];
  for (const block of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
    const key = block[1].match(/<Key>([\s\S]*?)<\/Key>/)?.[1];
    if (!key) continue;
    const size = Number(block[1].match(/<Size>(\d+)<\/Size>/)?.[1] ?? 0);
    const lastModified = block[1].match(/<LastModified>([\s\S]*?)<\/LastModified>/)?.[1] ?? "";
    items.push({
      key: key
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&amp;/g, "&"),
      size,
      lastModified,
    });
  }
  return items;
}

export function signedObjectUrl(config: OssConfig, objectKey: string, expiresAtSec: number) {
  const resource = `/${config.bucket}/${objectKey}`;
  const stringToSign = `GET\n\n\n${expiresAtSec}\n${resource}`;
  const signature = sign(config.accessKeySecret, stringToSign);
  const params = new URLSearchParams({
    OSSAccessKeyId: config.accessKeyId,
    Expires: String(expiresAtSec),
    Signature: signature,
  });
  return `${endpoint(config)}/${encodedKey(objectKey)}?${params.toString()}`;
}

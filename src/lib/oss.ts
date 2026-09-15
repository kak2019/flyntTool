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

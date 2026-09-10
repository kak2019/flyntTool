const IMAGE_ASCII = new TextDecoder("utf-8", { fatal: false });

export function stripBase64(input: string): string {
  let s = input.trim();
  const data = s.match(/^data:[^;,\s]*;base64,([\s\S]+)$/i);
  if (data) s = data[1];
  return s.replace(/\s+/g, "");
}

export function looksLikeBase64(input: string): boolean {
  const trimmed = input.trim();
  if (/^data:[^;,\s]*;base64,/i.test(trimmed)) return true;
  const s = trimmed.replace(/\s+/g, "");
  if (s.length < 8 || s.length % 4 === 1) return false;
  if (!/^[A-Za-z0-9+/_-]+={0,2}$/.test(s)) return false;
  if (/[+/=_-]/.test(s)) return true;
  return s.length >= 16 && s.length % 4 === 0;
}

export function normalizeBase64(input: string): string {
  let s = stripBase64(input).replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4;
  if (pad) s += "=".repeat(4 - pad);
  return s;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(normalizeBase64(b64));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function encodeText(text: string): string {
  return bytesToBase64(new TextEncoder().encode(text));
}

export function encodeDataUrl(bytes: Uint8Array, mime: string): string {
  return `data:${mime || "application/octet-stream"};base64,${bytesToBase64(bytes)}`;
}

export type DecodeOk = {
  ok: true;
  bytes: Uint8Array;
  text: string | null;
  imageMime: string | null;
};

export type DecodeResult = DecodeOk | { ok: false; error: string };

export function decodeBase64(input: string): DecodeResult {
  const stripped = stripBase64(input);
  if (!stripped) return { ok: false, error: "没有内容" };
  try {
    const bytes = base64ToBytes(stripped);
    return {
      ok: true,
      bytes,
      text: bytesToUtf8(bytes),
      imageMime: sniffImageMime(bytes),
    };
  } catch {
    return { ok: false, error: "不是合法 Base64" };
  }
}

export function sniffImageMime(bytes: Uint8Array): string | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return "image/gif";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  const head = IMAGE_ASCII.decode(bytes.subarray(0, 256)).trimStart();
  if (/^(?:<\?xml[^>]*>\s*)?<svg\b/i.test(head)) return "image/svg+xml";
  return null;
}

function bytesToUtf8(bytes: Uint8Array): string | null {
  if (!bytes.length) return "";
  let controls = 0;
  for (const b of bytes) {
    if (b === 0) return null;
    if (b < 32 && b !== 9 && b !== 10 && b !== 13) controls += 1;
  }
  if (controls / bytes.length > 0.05) return null;
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (text.includes("\uFFFD")) return null;
    return text;
  } catch {
    return null;
  }
}

export function formatByteSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

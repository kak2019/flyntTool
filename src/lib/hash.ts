export type HashAlg = "MD5" | "SHA-1" | "SHA-256";

export type HashSet = Record<HashAlg, string>;

const ALGS: HashAlg[] = ["MD5", "SHA-1", "SHA-256"];

export function hashAlgs(): HashAlg[] {
  return ALGS;
}

export async function hashBytes(bytes: Uint8Array): Promise<HashSet> {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  const [sha1, sha256] = await Promise.all([
    crypto.subtle.digest("SHA-1", copy),
    crypto.subtle.digest("SHA-256", copy),
  ]);
  return {
    MD5: bytesToHex(md5(bytes)),
    "SHA-1": bytesToHex(new Uint8Array(sha1)),
    "SHA-256": bytesToHex(new Uint8Array(sha256)),
  };
}

export async function hashText(text: string): Promise<HashSet> {
  return hashBytes(new TextEncoder().encode(text));
}

export function emptyHashes(): HashSet {
  return { MD5: "", "SHA-1": "", "SHA-256": "" };
}

export function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

const MD5_S = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4,
  11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];

const MD5_K = new Uint32Array(64);
for (let i = 0; i < 64; i++) {
  MD5_K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0;
}

function rotl(x: number, n: number): number {
  return (x << n) | (x >>> (32 - n));
}

/** RFC 1321 MD5. Not for security; for checksums and comparing files. */
export function md5(message: Uint8Array): Uint8Array {
  const bitLen = message.length * 8;
  const rem = message.length % 64;
  const extra = rem < 56 ? 56 - rem : 120 - rem;
  const padded = new Uint8Array(message.length + extra + 8);
  padded.set(message);
  padded[message.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, bitLen >>> 0, true);
  view.setUint32(padded.length - 4, Math.floor(bitLen / 0x100000000), true);

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  for (let i = 0; i < padded.length; i += 64) {
    let a = a0;
    let b = b0;
    let c = c0;
    let d = d0;
    for (let j = 0; j < 64; j++) {
      let f: number;
      let g: number;
      if (j < 16) {
        f = (b & c) | (~b & d);
        g = j;
      } else if (j < 32) {
        f = (d & b) | (~d & c);
        g = (5 * j + 1) % 16;
      } else if (j < 48) {
        f = b ^ c ^ d;
        g = (3 * j + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = (7 * j) % 16;
      }
      const m = view.getUint32(i + g * 4, true);
      f = (f + a + MD5_K[j] + m) >>> 0;
      a = d;
      d = c;
      c = b;
      b = (b + rotl(f, MD5_S[j])) >>> 0;
    }
    a0 = (a0 + a) >>> 0;
    b0 = (b0 + b) >>> 0;
    c0 = (c0 + c) >>> 0;
    d0 = (d0 + d) >>> 0;
  }

  const out = new Uint8Array(16);
  const outView = new DataView(out.buffer);
  outView.setUint32(0, a0, true);
  outView.setUint32(4, b0, true);
  outView.setUint32(8, c0, true);
  outView.setUint32(12, d0, true);
  return out;
}

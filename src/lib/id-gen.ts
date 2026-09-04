const NANOID_ALPHABET = "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";

export function randomUuid(): string {
  return crypto.randomUUID();
}

export function randomNanoid(size = 21): string {
  const length = Math.min(64, Math.max(2, Math.floor(size)));
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let id = "";
  for (let i = 0; i < length; i++) {
    id += NANOID_ALPHABET[bytes[i] & 63];
  }
  return id;
}

export function generateIds(kind: "uuid" | "nanoid", count: number, size = 21): string[] {
  const n = Math.min(100, Math.max(1, Math.floor(count)));
  return Array.from({ length: n }, () => (kind === "uuid" ? randomUuid() : randomNanoid(size)));
}

export type InspectedId =
  | { kind: "uuid"; version: number; variant: string; value: string }
  | { kind: "nanoid"; value: string; length: number }
  | { kind: "unknown"; value: string };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function inspectId(input: string): InspectedId | null {
  const value = input.trim();
  if (!value) return null;
  if (UUID_RE.test(value)) {
    const version = Number.parseInt(value[14], 16);
    const variantBits = Number.parseInt(value[19], 16);
    const variant = variantBits >= 8 && variantBits <= 11 ? "RFC 4122" : "其他";
    return { kind: "uuid", version, variant, value };
  }
  const nanoidLike =
    value.length >= 8 &&
    value.length <= 64 &&
    [...value].every((ch) => NANOID_ALPHABET.includes(ch));
  if (nanoidLike) return { kind: "nanoid", value, length: value.length };
  return { kind: "unknown", value };
}

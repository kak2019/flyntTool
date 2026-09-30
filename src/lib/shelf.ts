export const SHELF_KEY_RE = /^shelf\/(\d{10})_[a-f0-9]{8}\/[^/]+$/;

export function shelfKeyOk(key: string) {
  return SHELF_KEY_RE.test(key);
}

export function shelfExpiry(key: string) {
  const match = key.match(SHELF_KEY_RE);
  return match ? Number(match[1]) : 0;
}

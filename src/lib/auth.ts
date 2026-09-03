const encoder = new TextEncoder();

export async function hashPassword(password: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(`flynt-tools:${password}`),
  );
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function isValidSession(
  token: string | undefined,
  password: string | undefined,
): Promise<boolean> {
  if (!token || !password) return false;
  const expected = await hashPassword(password);
  return timingSafeEqual(token, expected);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

export const SESSION_COOKIE = "flynt_tools_session";

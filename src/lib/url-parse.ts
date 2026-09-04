export type QueryRow = { key: string; value: string };

export type ParsedUrl = {
  href: string;
  protocol: string;
  username: string;
  password: string;
  host: string;
  hostname: string;
  port: string;
  pathname: string;
  hash: string;
  query: QueryRow[];
};

export function parseUrlOrQuery(
  input: string,
): { ok: true; kind: "url" | "query"; parsed: ParsedUrl } | { ok: false; error: string } {
  const s = input.trim();
  if (!s) return { ok: false, error: "先贴一段 URL 或 query" };

  try {
    const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(s);
    const looksLikeHost =
      /^(localhost|[\w.-]+\.[\w.-]+)(?::\d+)?(?:[/?#]|$)/i.test(s);
    const kind: "url" | "query" =
      hasScheme || s.startsWith("//") || looksLikeHost ? "url" : "query";
    const href =
      kind === "url"
        ? hasScheme
          ? s
          : s.startsWith("//")
            ? `https:${s}`
            : `https://${s}`
        : s.startsWith("?")
          ? `https://parse.local/${s}`
          : `https://parse.local/?${s}`;
    const u = new URL(href);
    const query: QueryRow[] = [];
    u.searchParams.forEach((value, key) => {
      query.push({ key, value });
    });
    return {
      ok: true,
      kind,
      parsed: {
        href: u.href,
        protocol: u.protocol,
        username: decodeURIComponent(u.username),
        password: decodeURIComponent(u.password),
        host: u.host,
        hostname: u.hostname,
        port: u.port,
        pathname: u.pathname,
        hash: u.hash,
        query,
      },
    };
  } catch {
    return { ok: false, error: "解析失败，检查一下是不是合法 URL / query" };
  }
}

export function buildQuery(query: QueryRow[]): string {
  const params = new URLSearchParams();
  for (const row of query) {
    if (!row.key) continue;
    params.append(row.key, row.value);
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

export function buildUrl(base: string, query: QueryRow[]): string {
  const raw = base.trim() || "https://example.com/";
  const href = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw)
    ? raw
    : raw.startsWith("//")
      ? `https:${raw}`
      : `https://${raw.replace(/^\/+/, "")}`;
  const u = new URL(href);
  u.search = "";
  for (const row of query) {
    if (!row.key) continue;
    u.searchParams.append(row.key, row.value);
  }
  return u.toString();
}

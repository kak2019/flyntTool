import {
  NEWS_SOURCES,
  type NewsItem,
  type NewsPayload,
  type NewsSource,
  type NewsSourceResult,
} from "@/lib/news-sources";

const RSS_TTL_MS = 8 * 60 * 1000;
const JIN10_TTL_MS = 45_000;
const PER_SOURCE = 12;
const PER_JIN10 = 50;
const FETCH_MS = 10_000;
const UA =
  "Mozilla/5.0 (compatible; FlyntTools/1.0; +https://tool.flynt.top)";

type RssCache = { at: number; sources: NewsSourceResult[] };
type Jin10Cache = { at: number; source: NewsSourceResult };
let rssCache: RssCache | null = null;
let jin10Cache: Jin10Cache | null = null;
let inflight: Promise<NewsPayload> | null = null;

function decodeEntities(raw: string): string {
  return raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, num: string) =>
      String.fromCodePoint(Number.parseInt(num, 10)),
    );
}

function stripHtml(raw: string): string {
  return decodeEntities(raw)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function blocks(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "gi");
  return [...xml.matchAll(re)].map((m) => m[1]);
}

function firstTag(xml: string, names: string[]): string {
  for (const name of names) {
    const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i");
    const match = xml.match(re);
    if (match) return stripHtml(match[1]);
  }
  return "";
}

function rssLink(xml: string): string {
  const inner = xml.match(/<link>([\s\S]*?)<\/link>/i)?.[1] ?? "";
  const text = stripHtml(inner);
  if (/^https?:\/\//i.test(text)) return text;
  const guid = stripHtml(xml.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i)?.[1] ?? "");
  if (/^https?:\/\//i.test(guid)) return guid;
  return atomLink(xml);
}

function atomLink(xml: string): string {
  const re = /<link\b([^>]*)\/?>/gi;
  let fallback = "";
  let match: RegExpExecArray | null;
  while ((match = re.exec(xml))) {
    const attrs = match[1];
    const href = attrs.match(/href=["']([^"']+)["']/i)?.[1] ?? "";
    const rel = attrs.match(/rel=["']([^"']+)["']/i)?.[1] ?? "";
    if (!href) continue;
    if (rel === "alternate") return href;
    if (!fallback) fallback = href;
  }
  return fallback;
}

function parseTime(value: string): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

function cleanSummary(text: string): string {
  return text
    .replace(/#欢迎关注[\s\S]*$/u, "")
    .replace(/Article URL:[\s\S]*$/i, "")
    .replace(/Comments URL:[\s\S]*$/i, "")
    .replace(/查看全文\s*$/u, "")
    .trim()
    .slice(0, 140);
}

function parseFeed(xml: string, source: NewsSource): NewsItem[] {
  const entries = blocks(xml, "item").concat(blocks(xml, "entry"));
  const items: NewsItem[] = [];
  for (const entry of entries) {
    const title = firstTag(entry, ["title"]);
    const url = rssLink(entry);
    if (!title || !url) continue;
    const publishedAt = parseTime(
      firstTag(entry, ["pubDate", "published", "updated", "dc:date"]),
    );
    const summary = cleanSummary(
      firstTag(entry, ["description", "summary", "content:encoded", "content"]),
    );
    items.push({
      id: `${source.id}:${url}`,
      sourceId: source.id,
      sourceName: source.name,
      group: source.group,
      title,
      url,
      publishedAt,
      summary,
    });
    if (items.length >= PER_SOURCE) break;
  }
  return items;
}

async function fetchSource(source: NewsSource): Promise<NewsSourceResult> {
  if (source.kind === "jin10") return fetchJin10(source);
  try {
    const res = await fetch(source.url, {
      headers: {
        "user-agent": UA,
        accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
      },
      signal: AbortSignal.timeout(FETCH_MS),
      cache: "no-store",
    });
    if (!res.ok) {
      return {
        id: source.id,
        name: source.name,
        group: source.group,
        ok: false,
        error: `HTTP ${res.status}`,
        items: [],
      };
    }
    const xml = await res.text();
    const items = parseFeed(xml, source);
    if (!items.length) {
      return {
        id: source.id,
        name: source.name,
        group: source.group,
        ok: false,
        error: "没有解析到条目",
        items: [],
      };
    }
    return { id: source.id, name: source.name, group: source.group, ok: true, items };
  } catch (err) {
    return {
      id: source.id,
      name: source.name,
      group: source.group,
      ok: false,
      error: err instanceof Error ? err.message : "拉取失败",
      items: [],
    };
  }
}

function parseJin10Time(value: string): number | null {
  const iso = value.trim().replace(" ", "T") + "+08:00";
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}

type Jin10Flash = {
  id: string;
  time: string;
  important?: number;
  type?: number;
  extras?: { ad?: boolean };
  data?: {
    content?: string;
    pic?: string;
    link?: string;
    source_link?: string;
    vip_title?: string;
    lock?: boolean;
  };
};

function mapJin10Item(raw: Jin10Flash, source: NewsSource): NewsItem | null {
  if (raw.type === 1 || raw.extras?.ad || raw.data?.lock) return null;
  const html = raw.data?.content?.trim() ?? "";
  if (!html) return null;
  const text = stripHtml(html);
  if (!text) return null;
  if (/金十数据中心更新|欢迎点击查看/.test(text)) return null;
  const boxed = text.match(/^【([^】]+)】([\s\S]*)$/);
  const title = boxed?.[1]?.trim() || text;
  const summary = (boxed?.[2] ?? "").trim().slice(0, 180);
  const url =
    raw.data?.link ||
    raw.data?.source_link ||
    `https://www.jin10.com/`;
  return {
    id: `jin10:${raw.id}`,
    sourceId: source.id,
    sourceName: source.name,
    group: source.group,
    title,
    url,
    publishedAt: parseJin10Time(raw.time),
    summary,
    important: Boolean(raw.important),
  };
}

async function fetchJin10(source: NewsSource): Promise<NewsSourceResult> {
  try {
    const res = await fetch(
      "https://flash-api.jin10.com/get_flash_list?channel=-8200&vip=1",
      {
        headers: {
          "user-agent": UA,
          accept: "application/json, text/plain, */*",
          origin: "https://www.jin10.com",
          referer: "https://www.jin10.com/",
          "x-app-id": "bVBF4FyRTn5NJF5n",
          "x-version": "1.0.0",
        },
        signal: AbortSignal.timeout(FETCH_MS),
        cache: "no-store",
      },
    );
    if (!res.ok) {
      return {
        id: source.id,
        name: source.name,
        group: source.group,
        ok: false,
        error: `HTTP ${res.status}`,
        items: [],
      };
    }
    const body = (await res.json()) as { data?: Jin10Flash[] };
    const items = (body.data ?? [])
      .map((item) => mapJin10Item(item, source))
      .filter((item): item is NewsItem => Boolean(item))
      .slice(0, PER_JIN10);
    if (!items.length) {
      return {
        id: source.id,
        name: source.name,
        group: source.group,
        ok: false,
        error: "没有解析到快讯",
        items: [],
      };
    }
    return { id: source.id, name: source.name, group: source.group, ok: true, items };
  } catch (err) {
    return {
      id: source.id,
      name: source.name,
      group: source.group,
      ok: false,
      error: err instanceof Error ? err.message : "拉取失败",
      items: [],
    };
  }
}

async function loadRss(force: boolean): Promise<NewsSourceResult[]> {
  const now = Date.now();
  if (!force && rssCache && now - rssCache.at < RSS_TTL_MS) return rssCache.sources;
  const sources = await Promise.all(
    NEWS_SOURCES.filter((source) => source.kind !== "jin10").map(fetchSource),
  );
  rssCache = { at: Date.now(), sources };
  return sources;
}

async function loadJin10(force: boolean): Promise<NewsSourceResult> {
  const source = NEWS_SOURCES.find((item) => item.kind === "jin10");
  if (!source) {
    return { id: "jin10", name: "金十数据", group: "finance", ok: false, error: "未配置", items: [] };
  }
  const now = Date.now();
  if (!force && jin10Cache && now - jin10Cache.at < JIN10_TTL_MS) return jin10Cache.source;
  const result = await fetchJin10(source);
  jin10Cache = { at: Date.now(), source: result };
  return result;
}

async function loadAll(force: boolean): Promise<NewsPayload> {
  const [jin10, rss] = await Promise.all([loadJin10(force), loadRss(force)]);
  return { fetchedAt: Date.now(), sources: [jin10, ...rss] };
}

export async function getNews(force = false): Promise<NewsPayload> {
  if (inflight) return inflight;
  inflight = loadAll(force).finally(() => {
    inflight = null;
  });
  return inflight;
}

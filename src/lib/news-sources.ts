export type NewsGroup = "finance" | "tech" | "community" | "frontend" | "world";

export type NewsKind = "rss" | "jin10";

export type NewsSource = {
  id: string;
  name: string;
  group: NewsGroup;
  url: string;
  kind?: NewsKind;
};

export const NEWS_GROUPS: { id: NewsGroup | "all"; name: string }[] = [
  { id: "finance", name: "财经" },
  { id: "all", name: "全部" },
  { id: "tech", name: "科技" },
  { id: "community", name: "社区" },
  { id: "frontend", name: "前端" },
  { id: "world", name: "国际" },
];

export const NEWS_SOURCES: NewsSource[] = [
  {
    id: "jin10",
    name: "金十数据",
    group: "finance",
    url: "https://www.jin10.com/",
    kind: "jin10",
  },
  { id: "sspai", name: "少数派", group: "tech", url: "https://sspai.com/feed" },
  { id: "ithome", name: "IT之家", group: "tech", url: "https://www.ithome.com/rss/" },
  { id: "ifanr", name: "爱范儿", group: "tech", url: "https://www.ifanr.com/feed" },
  { id: "solidot", name: "Solidot", group: "tech", url: "https://www.solidot.org/index.rss" },
  { id: "oschina", name: "开源中国", group: "tech", url: "https://www.oschina.net/news/rss" },
  { id: "v2ex", name: "V2EX", group: "community", url: "https://www.v2ex.com/index.xml" },
  { id: "hn", name: "Hacker News", group: "community", url: "https://hnrss.org/frontpage" },
  {
    id: "ruanyifeng",
    name: "阮一峰",
    group: "frontend",
    url: "https://www.ruanyifeng.com/blog/atom.xml",
  },
  { id: "nextjs", name: "Next.js", group: "frontend", url: "https://nextjs.org/feed.xml" },
  { id: "css-tricks", name: "CSS-Tricks", group: "frontend", url: "https://css-tricks.com/feed/" },
  { id: "github", name: "GitHub Blog", group: "frontend", url: "https://github.blog/feed/" },
  {
    id: "bbc",
    name: "BBC 中文",
    group: "world",
    url: "https://feeds.bbci.co.uk/zhongwen/simp/rss.xml",
  },
];

export type NewsItem = {
  id: string;
  sourceId: string;
  sourceName: string;
  group: NewsGroup;
  title: string;
  url: string;
  publishedAt: number | null;
  summary: string;
  important?: boolean;
};

export type NewsSourceResult = {
  id: string;
  name: string;
  group: NewsGroup;
  ok: boolean;
  error?: string;
  items: NewsItem[];
};

export type NewsPayload = {
  fetchedAt: number;
  sources: NewsSourceResult[];
};

export function relativeTime(ms: number | null, now = Date.now()): string {
  if (!ms) return "";
  const delta = Math.max(0, now - ms);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (delta < minute) return "刚刚";
  if (delta < hour) return `${Math.floor(delta / minute)} 分钟前`;
  if (delta < day) return `${Math.floor(delta / hour)} 小时前`;
  if (delta < 7 * day) return `${Math.floor(delta / day)} 天前`;
  const date = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function flashClock(ms: number | null): string {
  if (!ms) return "";
  const date = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  if (Date.now() - ms < 24 * 60 * 60 * 1000) {
    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }
  return relativeTime(ms);
}

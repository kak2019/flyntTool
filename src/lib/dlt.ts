import {
  checkTicket,
  type DltDraw,
  type DltHit,
  type DltPrize,
  type DltTicket,
} from "@/lib/dlt-match";

const TTL_MS = 10 * 60 * 1000;
const FETCH_MS = 12_000;
const DLT_URL =
  "https://webapi.sporttery.cn/gateway/lottery/getHistoryPageListV1.qry?gameNo=85&provinceId=0&pageSize=12&isVerify=1&pageNo=1";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

type Cache = { at: number; draws: DltDraw[] };
let cache: Cache | null = null;
let inflight: Promise<DltDraw[]> | null = null;

type PrizeRow = {
  prizeLevel?: string;
  stakeAmountFormat?: string;
};

type DrawRow = {
  lotteryDrawNum?: string;
  lotteryDrawTime?: string;
  lotteryDrawResult?: string;
  poolBalanceAfterdraw?: string;
  lotteryPaidEndTime?: string;
  prizeLevelList?: PrizeRow[];
};

function parseAmount(raw: string | undefined): number | null {
  if (!raw || raw === "---" || raw === "-1") return null;
  const n = Number(String(raw).replace(/,/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function parseNums(raw: string): number[] {
  return raw
    .trim()
    .split(/\s+/)
    .map((s) => Number(s))
    .filter((n) => Number.isInteger(n) && n > 0);
}

function parsePrizes(list: PrizeRow[] | undefined): Record<number, DltPrize> {
  const out: Record<number, DltPrize> = {};
  for (const row of list ?? []) {
    const name = row.prizeLevel ?? "";
    const match = name.match(/^([一二三四五六七])等奖(（追加）)?/);
    if (!match) continue;
    const level = "一二三四五六七".indexOf(match[1]) + 1;
    if (!out[level]) out[level] = { name: `${match[1]}等奖`, basic: null, append: null };
    const amount = parseAmount(row.stakeAmountFormat);
    if (match[2]) out[level].append = amount;
    else out[level].basic = amount;
  }
  return out;
}

function parseDraw(row: DrawRow): DltDraw | null {
  const nums = parseNums(row.lotteryDrawResult ?? "");
  if (nums.length < 7 || !row.lotteryDrawNum) return null;
  return {
    issue: String(row.lotteryDrawNum),
    date: String(row.lotteryDrawTime ?? "").slice(0, 10),
    front: nums.slice(0, 5),
    back: nums.slice(5, 7),
    pool: String(row.poolBalanceAfterdraw ?? ""),
    paidEnd: row.lotteryPaidEndTime ? String(row.lotteryPaidEndTime).slice(0, 10) : null,
    prizes: parsePrizes(row.prizeLevelList),
  };
}

export async function fetchDltDraws(force = false): Promise<DltDraw[]> {
  const now = Date.now();
  if (!force && cache && now - cache.at < TTL_MS) return cache.draws;
  if (!force && inflight) return inflight;

  const run = (async () => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_MS);
    try {
      const res = await fetch(DLT_URL, {
        signal: ctrl.signal,
        headers: {
          "user-agent": UA,
          referer: "https://www.lottery.gov.cn/",
          accept: "application/json,text/plain,*/*",
        },
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`开奖接口 ${res.status}`);
      const body = (await res.json()) as { success?: boolean; value?: { list?: DrawRow[] } };
      if (!body.success || !Array.isArray(body.value?.list)) throw new Error("开奖数据格式不对");
      const draws = body.value.list.map(parseDraw).filter((d): d is DltDraw => Boolean(d));
      if (!draws.length) throw new Error("没有开奖记录");
      cache = { at: Date.now(), draws };
      return draws;
    } finally {
      clearTimeout(timer);
      inflight = null;
    }
  })();

  inflight = run;
  return run;
}

export function checkDraws(tickets: DltTicket[], draws: DltDraw[]): DltHit[] {
  const hits: DltHit[] = [];
  for (const draw of draws) {
    for (const ticket of tickets) {
      const hit = checkTicket(ticket, draw);
      if (hit) hits.push(hit);
    }
  }
  return hits.sort((a, b) => {
    if (a.issue !== b.issue) return b.issue.localeCompare(a.issue);
    return a.level - b.level;
  });
}

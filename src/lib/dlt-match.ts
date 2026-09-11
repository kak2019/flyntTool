export type DltTicket = {
  id: string;
  name: string;
  front: number[];
  back: number[];
  append: boolean;
  multiple: number;
};

export type DltPrize = {
  name: string;
  basic: number | null;
  append: number | null;
};

export type DltDraw = {
  issue: string;
  date: string;
  front: number[];
  back: number[];
  pool: string;
  paidEnd: string | null;
  prizes: Record<number, DltPrize>;
};

export type DltHit = {
  ticketId: string;
  ticketName: string;
  issue: string;
  date: string;
  paidEnd: string | null;
  frontHits: number;
  backHits: number;
  level: number;
  levelName: string;
  amount: number;
  matchedFront: number[];
  matchedBack: number[];
};

export const LEVEL_NAMES = ["", "一等奖", "二等奖", "三等奖", "四等奖", "五等奖", "六等奖", "七等奖"];

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatYuan(n: number): string {
  return `${Math.round(n).toLocaleString("zh-CN")} 元`;
}

export function parseTicketNums(raw: string, count: number, max: number): number[] {
  const nums = [...raw.matchAll(/\d+/g)]
    .map((m) => Number(m[0]))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= max);
  const uniq: number[] = [];
  for (const n of nums) {
    if (!uniq.includes(n)) uniq.push(n);
  }
  return uniq.slice(0, count).sort((a, b) => a - b);
}

export function validateTicket(front: number[], back: number[]): string | null {
  if (front.length !== 5) return "前区要 5 个号，1–35";
  if (back.length !== 2) return "后区要 2 个号，1–12";
  if (new Set(front).size !== 5 || front.some((n) => n < 1 || n > 35)) return "前区号码不对";
  if (new Set(back).size !== 2 || back.some((n) => n < 1 || n > 12)) return "后区号码不对";
  return null;
}

/** 2026 新规：13 个中奖条件合并为 7 个奖级，只兑最高奖。 */
export function matchLevel(frontHits: number, backHits: number): number {
  if (frontHits === 5 && backHits === 2) return 1;
  if (frontHits === 5 && backHits === 1) return 2;
  if ((frontHits === 5 && backHits === 0) || (frontHits === 4 && backHits === 2)) return 3;
  if (frontHits === 4 && backHits === 1) return 4;
  if ((frontHits === 4 && backHits === 0) || (frontHits === 3 && backHits === 2)) return 5;
  if ((frontHits === 3 && backHits === 1) || (frontHits === 2 && backHits === 2)) return 6;
  if (
    (frontHits === 3 && backHits === 0) ||
    (frontHits === 2 && backHits === 1) ||
    (frontHits === 1 && backHits === 2) ||
    (frontHits === 0 && backHits === 2)
  ) {
    return 7;
  }
  return 0;
}

export function countHits(pick: number[], draw: number[]): number {
  const set = new Set(draw);
  return pick.reduce((n, v) => n + (set.has(v) ? 1 : 0), 0);
}

export function prizeAmount(draw: DltDraw, level: number, append: boolean, multiple: number): number {
  if (level < 1) return 0;
  const prize = draw.prizes[level];
  const basic = prize?.basic ?? 0;
  let amount = basic;
  if (append && (level === 1 || level === 2)) {
    amount += prize?.append ?? Math.round(basic * 0.8);
  }
  return amount * Math.max(1, multiple);
}

export function checkTicket(ticket: DltTicket, draw: DltDraw): DltHit | null {
  const frontHits = countHits(ticket.front, draw.front);
  const backHits = countHits(ticket.back, draw.back);
  const level = matchLevel(frontHits, backHits);
  if (!level) return null;
  const matchedFront = ticket.front.filter((n) => draw.front.includes(n));
  const matchedBack = ticket.back.filter((n) => draw.back.includes(n));
  return {
    ticketId: ticket.id,
    ticketName: ticket.name,
    issue: draw.issue,
    date: draw.date,
    paidEnd: draw.paidEnd,
    frontHits,
    backHits,
    level,
    levelName: LEVEL_NAMES[level] || `${level}等奖`,
    amount: prizeAmount(draw, level, ticket.append, ticket.multiple),
    matchedFront,
    matchedBack,
  };
}

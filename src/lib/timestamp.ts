export type TimeParts = {
  ms: number;
  seconds: number;
  iso: string;
  utc: string;
  local: string;
  shanghai: string;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function formatShanghai(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")} GMT+8`;
}

function formatLocal(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function parseTimeInput(input: string): Date | null {
  const s = input.trim();
  if (!s) return null;
  if (/^-?\d+$/.test(s)) {
    const n = Number(s);
    if (!Number.isFinite(n)) return null;
    const ms = Math.abs(n) < 1e11 ? n * 1000 : n;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(s);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toTimeParts(date: Date): TimeParts {
  const ms = date.getTime();
  return {
    ms,
    seconds: Math.floor(ms / 1000),
    iso: date.toISOString(),
    utc: date.toISOString().replace("T", " ").replace("Z", " UTC"),
    local: formatLocal(date),
    shanghai: formatShanghai(date),
  };
}

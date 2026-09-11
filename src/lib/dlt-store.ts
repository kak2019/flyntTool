import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { DltTicket } from "@/lib/dlt-match";
import { validateTicket } from "@/lib/dlt-match";

type Store = { tickets: DltTicket[]; notified: string[] };

function filePath() {
  return process.env.DLT_PATH || path.join(process.cwd(), "data", "dlt.json");
}

async function readStore(): Promise<Store> {
  try {
    const raw = await readFile(filePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<Store>;
    return {
      tickets: Array.isArray(parsed.tickets) ? parsed.tickets : [],
      notified: Array.isArray(parsed.notified) ? parsed.notified : [],
    };
  } catch {
    return { tickets: [], notified: [] };
  }
}

async function writeStore(store: Store) {
  const file = filePath();
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  const payload = `${JSON.stringify(store, null, 2)}\n`;
  await writeFile(tmp, payload, "utf8");
  try {
    await rename(tmp, file);
  } catch {
    await writeFile(file, payload, "utf8");
  }
}

function cleanTicket(row: Partial<DltTicket>, index: number): DltTicket {
  const front = [...new Set((row.front ?? []).map(Number))].filter((n) => n >= 1 && n <= 35).sort((a, b) => a - b);
  const back = [...new Set((row.back ?? []).map(Number))].filter((n) => n >= 1 && n <= 12).sort((a, b) => a - b);
  const err = validateTicket(front, back);
  if (err) throw new Error(`第 ${index + 1} 注：${err}`);
  const multiple = Math.min(99, Math.max(1, Math.round(Number(row.multiple) || 1)));
  return {
    id: String(row.id || crypto.randomUUID()),
    name: String(row.name || `注 ${index + 1}`).trim().slice(0, 20),
    front,
    back,
    append: Boolean(row.append),
    multiple,
  };
}

export async function listTickets(): Promise<DltTicket[]> {
  const store = await readStore();
  return store.tickets;
}

export async function saveTickets(input: Partial<DltTicket>[]): Promise<DltTicket[]> {
  if (!Array.isArray(input) || input.length === 0) throw new Error("至少留一注");
  if (input.length > 6) throw new Error("最多 6 注");
  const tickets = input.map((row, i) => cleanTicket(row, i));
  const prev = await readStore();
  await writeStore({ tickets, notified: prev.notified });
  return tickets;
}

export async function listNotified(): Promise<string[]> {
  const store = await readStore();
  return store.notified;
}

export function hitKey(issue: string, ticketId: string): string {
  return `${issue}:${ticketId}`;
}

export async function markNotified(keys: string[]): Promise<void> {
  if (!keys.length) return;
  const store = await readStore();
  const next = [...new Set([...store.notified, ...keys])];
  await writeStore({ tickets: store.tickets, notified: next.slice(-200) });
}

import type { FlightDeal } from "@/lib/flight-types";

export type FlightStore = {
  notified: Record<string, number>;
  lastRunAt: string | null;
  lastError: string;
  deals: FlightDeal[];
  scanIndex: number;
};

function filePath() {
  return process.env.FLIGHT_WATCH_PATH || `${process.cwd()}/data/flight-watch.json`;
}

function emptyStore(): FlightStore {
  return { notified: {}, lastRunAt: null, lastError: "", deals: [], scanIndex: 0 };
}

export async function readFlightStore(): Promise<FlightStore> {
  try {
    const { readFile } = await import("node:fs/promises");
    const parsed = JSON.parse(await readFile(filePath(), "utf8")) as Partial<FlightStore>;
    return {
      notified: parsed.notified && typeof parsed.notified === "object" ? parsed.notified : {},
      lastRunAt: parsed.lastRunAt ?? null,
      lastError: String(parsed.lastError || ""),
      deals: Array.isArray(parsed.deals) ? parsed.deals : [],
      scanIndex: Number.isInteger(parsed.scanIndex) && Number(parsed.scanIndex) >= 0 ? Number(parsed.scanIndex) : 0,
    };
  } catch {
    return emptyStore();
  }
}

export async function writeFlightStore(store: FlightStore) {
  const { mkdir, rename, writeFile } = await import("node:fs/promises");
  const file = filePath();
  await mkdir(`${process.cwd()}/data`, { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  const payload = `${JSON.stringify(store, null, 2)}\n`;
  await writeFile(tmp, payload, "utf8");
  try {
    await rename(tmp, file);
  } catch {
    await writeFile(file, payload, "utf8");
  }
}

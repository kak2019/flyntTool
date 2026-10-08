import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { HOTEL_PLACES, shanghaiDate } from "@/lib/hotel-mcp";

export type HotelDeal = {
  key: string;
  placeId: string;
  place: string;
  hotelId: number;
  name: string;
  brand: string;
  price: number;
  checkIn: string;
  url?: string;
};

export type HotelCustomPlace = {
  id: string;
  title: string;
  place: string;
};

type Store = {
  notified: Record<string, number>;
  lastRunAt: string | null;
  lastError: string;
  checkIn: string;
  deals: HotelDeal[];
  places: HotelCustomPlace[];
};

function filePath() {
  return process.env.HOTEL_WATCH_PATH || path.join(process.cwd(), "data", "hotel-watch.json");
}

function emptyStore(): Store {
  return { notified: {}, lastRunAt: null, lastError: "", checkIn: "", deals: [], places: [] };
}

function cleanPlaces(raw: unknown): HotelCustomPlace[] {
  if (!Array.isArray(raw)) return [];
  const places: HotelCustomPlace[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Partial<HotelCustomPlace>;
    const title = String(row.title || "").trim();
    const place = String(row.place || "").trim();
    const id = String(row.id || "").trim();
    if (!id || !title || !place || seen.has(id)) continue;
    seen.add(id);
    places.push({ id, title: title.slice(0, 20), place: place.slice(0, 40) });
    if (places.length >= 12) break;
  }
  return places;
}

export function dealKey(hotelId: number, checkIn: string) {
  return `${hotelId}|${checkIn}`;
}

export async function readHotelStore(): Promise<Store> {
  try {
    const parsed = JSON.parse(await readFile(filePath(), "utf8")) as Partial<Store>;
    return {
      notified: parsed.notified && typeof parsed.notified === "object" ? parsed.notified : {},
      lastRunAt: parsed.lastRunAt ?? null,
      lastError: String(parsed.lastError || ""),
      checkIn: String(parsed.checkIn || ""),
      deals: Array.isArray(parsed.deals) ? parsed.deals : [],
      places: cleanPlaces(parsed.places),
    };
  } catch {
    return emptyStore();
  }
}

export async function writeHotelStore(store: Store) {
  const today = shanghaiDate(0);
  const notified: Record<string, number> = {};
  for (const [key, price] of Object.entries(store.notified)) {
    const checkIn = key.split("|")[1] || "";
    if (checkIn >= today && Number.isFinite(price)) notified[key] = price;
  }
  const file = filePath();
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  const payload = `${JSON.stringify({ ...store, notified }, null, 2)}\n`;
  await writeFile(tmp, payload, "utf8");
  try {
    await rename(tmp, file);
  } catch {
    await writeFile(file, payload, "utf8");
  }
}

function takenPlace(title: string, place: string, custom: HotelCustomPlace[]) {
  const names = new Set<string>();
  for (const item of HOTEL_PLACES) {
    names.add(item.title);
    names.add(item.place);
    names.add(item.title.replace(/^云南 · /, ""));
  }
  for (const item of custom) {
    names.add(item.title);
    names.add(item.place);
  }
  return names.has(title) || names.has(place);
}

export function customPlaceFrom(input: string): HotelCustomPlace {
  const raw = input.trim().replace(/\s+/g, " ");
  if (!raw) throw new Error("先写一个城市");
  if (raw.length > 20) throw new Error("城市名太长");
  if (!/^[\u4e00-\u9fa5a-zA-Z0-9· ]+$/.test(raw)) throw new Error("只写城市名");
  const parts = raw.split(" ");
  const title = parts[0];
  const place = parts.length >= 2 ? raw : `${title} 中国`;
  return { id: `c${Date.now().toString(36)}`, title, place };
}

export async function addCustomPlace(input: string) {
  const store = await readHotelStore();
  if (store.places.length >= 12) throw new Error("最多再加 12 个地区");
  const next = customPlaceFrom(input);
  if (takenPlace(next.title, next.place, store.places)) throw new Error("这个地区已经在盯了");
  const places = [...store.places, next];
  await writeHotelStore({ ...store, places });
  return places;
}

export async function removeCustomPlace(id: string) {
  const store = await readHotelStore();
  const places = store.places.filter((item) => item.id !== id);
  if (places.length === store.places.length) throw new Error("没有这个地区");
  const deals = store.deals.filter((deal) => deal.placeId !== id);
  await writeHotelStore({ ...store, places, deals });
  return places;
}

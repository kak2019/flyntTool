import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { WatchItem } from "@/lib/watch-types";

export type { WatchItem };

type Store = { items: WatchItem[] };

function filePath() {
  return (
    process.env.WATCHLIST_PATH ||
    path.join(process.cwd(), "data", "watchlist.json")
  );
}

async function readStore(): Promise<Store> {
  try {
    const raw = await readFile(filePath(), "utf8");
    const parsed = JSON.parse(raw) as Store;
    if (!Array.isArray(parsed.items)) return { items: [] };
    return parsed;
  } catch {
    return { items: [] };
  }
}

async function writeStore(store: Store) {
  const file = filePath();
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  await writeFile(tmp, `${JSON.stringify(store, null, 2)}\n`, "utf8");
  try {
    await rename(tmp, file);
  } catch {
    await writeFile(file, `${JSON.stringify(store, null, 2)}\n`, "utf8");
  }
}

export async function listWatch(): Promise<WatchItem[]> {
  const store = await readStore();
  return store.items.slice().sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function addWatch(title: string, note = ""): Promise<WatchItem> {
  const trimmed = title.trim();
  if (!trimmed) throw new Error("剧名不能空");
  const now = Date.now();
  const item: WatchItem = {
    id: crypto.randomUUID(),
    title: trimmed.slice(0, 120),
    note: note.trim().slice(0, 240),
    createdAt: now,
    updatedAt: now,
  };
  const store = await readStore();
  store.items.unshift(item);
  await writeStore(store);
  return item;
}

export async function updateWatch(
  id: string,
  patch: { title?: string; note?: string },
): Promise<WatchItem> {
  const store = await readStore();
  const item = store.items.find((row) => row.id === id);
  if (!item) throw new Error("找不到这一条");
  if (patch.title !== undefined) {
    const title = patch.title.trim();
    if (!title) throw new Error("剧名不能空");
    item.title = title.slice(0, 120);
  }
  if (patch.note !== undefined) item.note = patch.note.trim().slice(0, 240);
  item.updatedAt = Date.now();
  await writeStore(store);
  return item;
}

export async function removeWatch(id: string): Promise<void> {
  const store = await readStore();
  const next = store.items.filter((row) => row.id !== id);
  if (next.length === store.items.length) throw new Error("找不到这一条");
  await writeStore({ items: next });
}

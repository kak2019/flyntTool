"use client";

import { FormEvent, useEffect, useState } from "react";
import { btnClass, fieldClass, primaryBtnClass } from "@/lib/styles";
import type { WatchItem } from "@/lib/watch-types";

export function WatchlistPanel() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<WatchItem[]>([]);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftNote, setDraftNote] = useState("");

  async function load() {
    const res = await fetch("/api/watchlist");
    const body = (await res.json()) as { items?: WatchItem[]; error?: string };
    if (!res.ok) throw new Error(body.error || "读取失败");
    setItems(body.items ?? []);
  }

  useEffect(() => {
    if (!open) return;
    void load().catch((err) => setError(err instanceof Error ? err.message : "读取失败"));
  }, [open]);

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || pending) return;
    setPending(true);
    setError("");
    try {
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, note }),
      });
      const body = (await res.json()) as { item?: WatchItem; error?: string };
      if (!res.ok) throw new Error(body.error || "添加失败");
      if (body.item) setItems((prev) => [body.item!, ...prev]);
      setTitle("");
      setNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "添加失败");
    } finally {
      setPending(false);
    }
  }

  async function save(id: string) {
    setPending(true);
    setError("");
    try {
      const res = await fetch("/api/watchlist", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, title: draftTitle, note: draftNote }),
      });
      const body = (await res.json()) as { item?: WatchItem; error?: string };
      if (!res.ok) throw new Error(body.error || "保存失败");
      if (body.item) {
        setItems((prev) => prev.map((row) => (row.id === id ? body.item! : row)));
      }
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setPending(false);
    }
  }

  async function remove(id: string) {
    setPending(true);
    setError("");
    try {
      const res = await fetch(`/api/watchlist?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error || "删除失败");
      setItems((prev) => prev.filter((row) => row.id !== id));
      if (editing === id) setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setPending(false);
    }
  }

  function startEdit(item: WatchItem) {
    setEditing(item.id);
    setDraftTitle(item.title);
    setDraftNote(item.note);
  }

  return (
    <div className="mt-10">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="px-1 text-sm tracking-[0.4em] text-zinc-300 hover:text-zinc-500"
        aria-expanded={open}
        aria-label={open ? "收起" : "展开"}
      >
        ···
      </button>

      {open ? (
        <div className="mt-4 rounded-2xl border border-dashed border-zinc-200 bg-white p-5">
          <h2 className="text-lg font-semibold">想看</h2>
          <p className="mt-1 text-sm text-zinc-500">
            记下剧名，随时改。存在这台服务器上，重新部署不会清。以后再接搜索和 115。
          </p>

          <form onSubmit={(e) => void add(e)} className="mt-4 flex flex-wrap gap-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="剧名"
              className={`${fieldClass} min-w-48 flex-1`}
            />
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="备注，可空"
              className={`${fieldClass} min-w-40 flex-1`}
            />
            <button type="submit" disabled={pending || !title.trim()} className={primaryBtnClass}>
              记下
            </button>
          </form>

          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

          <ul className="mt-4 space-y-2">
            {items.length ? (
              items.map((item) => (
                <li
                  key={item.id}
                  className="rounded-xl border border-zinc-200 px-3 py-2.5"
                >
                  {editing === item.id ? (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <input
                        value={draftTitle}
                        onChange={(e) => setDraftTitle(e.target.value)}
                        className={`${fieldClass} flex-1`}
                      />
                      <input
                        value={draftNote}
                        onChange={(e) => setDraftNote(e.target.value)}
                        placeholder="备注"
                        className={`${fieldClass} flex-1`}
                      />
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => void save(item.id)}
                        className={primaryBtnClass}
                      >
                        保存
                      </button>
                      <button type="button" onClick={() => setEditing(null)} className={btnClass}>
                        取消
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="font-medium">{item.title}</p>
                        {item.note ? (
                          <p className="mt-0.5 text-sm text-zinc-500">{item.note}</p>
                        ) : (
                          <p className="mt-0.5 text-sm text-zinc-400">点这里改</p>
                        )}
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => void remove(item.id)}
                        className="shrink-0 text-sm text-zinc-400 hover:text-red-600"
                      >
                        删
                      </button>
                    </div>
                  )}
                </li>
              ))
            ) : (
              <li className="text-sm text-zinc-400">还没有记下的剧</li>
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

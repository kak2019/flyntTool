"use client";

import { FormEvent, useEffect, useState } from "react";
import type { HotelDeal } from "@/lib/hotel-store";
import { fieldClass, primaryBtnClass } from "@/lib/styles";

type PlaceChip = { id: string; title: string; custom: boolean };

type Status = {
  running: boolean;
  priceLimit: number;
  places: PlaceChip[];
  lastRunAt: string | null;
  lastError: string;
  checkIn: string;
  deals: HotelDeal[];
  notified: Record<string, number>;
};

function pushed(deal: HotelDeal, notified: Record<string, number>) {
  const prev = notified[deal.key];
  return prev !== undefined && deal.price >= prev;
}

export default function HotelPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let stop = false;
    async function load() {
      try {
        const res = await fetch("/api/hotel-watch", { cache: "no-store" });
        const data = (await res.json()) as Status & { error?: string };
        if (!res.ok) throw new Error(data.error || "读取失败");
        if (!stop) {
          setStatus(data);
          setError("");
        }
      } catch (err) {
        if (!stop) setError(err instanceof Error ? err.message : "读取失败");
      }
    }
    void load();
    const timer = window.setInterval(() => void load(), 3000);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, []);

  async function changePlaces(body: { action: "add"; name: string } | { action: "remove"; id: string }) {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/hotel-watch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string; places?: PlaceChip[] };
      if (!res.ok) throw new Error(data.error || "保存失败");
      setStatus((prev) => (prev && data.places ? { ...prev, places: data.places, running: body.action === "add" } : prev));
      if (body.action === "add") setName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  function onAdd(e: FormEvent) {
    e.preventDefault();
    void changePlaces({ action: "add", name });
  }

  const deals = status?.deals ?? [];
  const notified = status?.notified ?? {};
  const places = status?.places ?? [];

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">酒店盯价</h1>
      <p className="mt-1 text-sm text-zinc-500">
        每小时看一次，天津在前。盯明天入住、住一晚的亚朵、万豪、喜来登。低于 {status?.priceLimit ?? 300}{" "}
        元用 Server酱 通知。同一家、同一天，价格没有更低就不发第二遍。
      </p>

      <form onSubmit={onAdd} className="mt-5 flex flex-wrap items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="再加一个城市，例如青岛"
          className={`${fieldClass} max-w-xs`}
          maxLength={20}
        />
        <button type="submit" className={primaryBtnClass} disabled={saving || !name.trim()}>
          加入
        </button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        {places.map((place) => (
          <span key={place.id} className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-3 py-1 text-sm">
            {place.title}
            {place.custom ? (
              <button
                type="button"
                className="text-zinc-400 hover:text-zinc-700"
                disabled={saving}
                onClick={() => void changePlaces({ action: "remove", id: place.id })}
              >
                移除
              </button>
            ) : null}
          </span>
        ))}
      </div>

      <div className="mt-5 text-sm text-zinc-600">
        {status?.running ? "正在查询…" : status?.lastRunAt ? `上次查询 ${new Date(status.lastRunAt).toLocaleString("zh-CN", { hour12: false })}` : "还没查过"}
        {status?.checkIn ? ` · 入住 ${status.checkIn}` : ""}
      </div>
      {status?.lastError ? <p className="mt-2 text-sm text-red-600">{status.lastError}</p> : null}
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}

      <ul className="mt-5 divide-y divide-zinc-100 rounded-2xl border border-zinc-200 bg-white">
        {deals.length ? (
          deals.map((deal) => (
            <li key={deal.key} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3 text-sm">
              <span className="text-zinc-500">{deal.place}</span>
              <span className="font-medium">{deal.name}</span>
              <span className="text-zinc-500">{deal.brand}</span>
              <span className="ml-auto font-medium text-teal-800">{deal.price} 元</span>
              <span className="text-zinc-400">{pushed(deal, notified) ? "已通知" : "待通知"}</span>
            </li>
          ))
        ) : (
          <li className="px-4 py-8 text-sm text-zinc-500">{status?.running ? "正在查询…" : "这次没有低于 300 元的酒店。"}</li>
        )}
      </ul>
    </div>
  );
}

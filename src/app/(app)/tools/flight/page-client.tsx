"use client";

import { useEffect, useState } from "react";
import type { FlightDeal } from "@/lib/flight-types";
import { primaryBtnClass } from "@/lib/styles";

type Status = {
  running: boolean;
  priceLimit: number;
  windowEnd: string;
  adults: number;
  origins: { id: string; title: string }[];
  destination: { id: string; title: string };
  preferredCombos: string[][];
  lastRunAt: string | null;
  lastError: string;
  deals: FlightDeal[];
  notified: Record<string, number>;
};

function dateLabel(value: string) {
  return value ? value.slice(5).replace("-", "月") + "日" : "";
}

function dealMeta(deal: FlightDeal) {
  const stops = deal.stops === 0 ? "直飞" : `${deal.stops}次中转`;
  return `${deal.origin || "北京/天津"} → 三亚 · ${deal.airlines.join("/") || "航班"} · ${stops}`;
}

export default function FlightPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);

  async function load() {
    try {
      const res = await fetch("/api/flight-watch", { cache: "no-store" });
      const data = (await res.json()) as Status & { error?: string };
      if (!res.ok) throw new Error(data.error || "读取失败");
      setStatus(data);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "读取失败");
    }
  }

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(timer);
  }, []);

  async function scanNow() {
    setScanning(true);
    setError("");
    try {
      const res = await fetch("/api/flight-watch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "scan" }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "启动查询失败");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "启动查询失败");
    } finally {
      setScanning(false);
    }
  }

  const deals = status?.deals ?? [];
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">机票盯价</h1>
          <p className="mt-1 text-sm text-zinc-500">
            两位成人，北京首都/大兴或天津出发，三亚凤凰到达。每 12 小时扫描，低于两人往返 {status?.priceLimit ?? 3500} 元或出现新低时用 Server酱通知。
          </p>
        </div>
        <button type="button" className={primaryBtnClass} onClick={() => void scanNow()} disabled={scanning || status?.running}>
          {scanning || status?.running ? "查询中…" : "现在查一次"}
        </button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm">
          <div className="font-medium">追踪范围</div>
          <div className="mt-2 text-zinc-500">{status?.origins.map((item) => item.title).join("、") || "北京/天津"} → {status?.destination.title || "三亚凤凰"}</div>
          <div className="mt-1 text-zinc-500">两位成人 · 往返 · 经济舱 · 扫描至 {status?.windowEnd || "12 月"}</div>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm">
          <div className="font-medium">重点日期</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {(status?.preferredCombos || []).map(([outbound, returnDate]) => (
              <span key={`${outbound}-${returnDate}`} className="rounded-full bg-teal-50 px-3 py-1 text-teal-800">
                {dateLabel(outbound)}出发 · {dateLabel(returnDate)}返
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 text-sm text-zinc-600">
        {status?.running ? "正在查询…" : status?.lastRunAt ? `上次查询 ${new Date(status.lastRunAt).toLocaleString("zh-CN", { hour12: false })}` : "还没查过"}
      </div>
      {status?.lastError ? <p className="mt-2 text-sm text-red-600">{status.lastError}</p> : null}
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}

      <ul className="mt-5 divide-y divide-zinc-100 rounded-2xl border border-zinc-200 bg-white">
        {deals.length ? deals.map((deal) => (
          <li key={deal.key} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm">
            <span className="w-full font-medium md:w-auto">{deal.kind === "explore" ? "灵活日期" : `${dateLabel(deal.outboundDate)}出发 · ${dateLabel(deal.returnDate)}返`}</span>
            <span className="text-zinc-500">{dealMeta(deal)}</span>
            <span className="ml-auto font-semibold text-teal-800">{deal.price} 元</span>
            <span className="text-zinc-400">两人总价</span>
            {deal.link ? <a className="text-teal-700 hover:underline" href={deal.link} target="_blank" rel="noreferrer">查看</a> : null}
          </li>
        )) : (
          <li className="px-4 py-8 text-sm text-zinc-500">{status?.running ? "正在查询…" : "还没有低价记录。"}</li>
        )}
      </ul>
      <p className="mt-3 text-xs text-zinc-400">价格是查询时快照；点击购票前请重新确认。{status?.notified ? " 已通知过的同价不会重复推送。" : ""}</p>
    </div>
  );
}

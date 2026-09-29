"use client";

import { useEffect, useMemo, useState } from "react";
import { DateCalendar, TimeWheels, dateFromParts, partsFromDate, type ClockParts } from "./picker";
import { btnClass, primaryBtnClass } from "@/lib/styles";

const STORAGE_KEY = "flynt-countdown-v1";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function formatParts(parts: ClockParts) {
  return `${parts.year}年${parts.month + 1}月${parts.day}日 ${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)}`;
}

function splitRemaining(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
    done: ms <= 0,
  };
}

export default function CountdownPage() {
  const [target, setTarget] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [ready, setReady] = useState(false);
  const [parts, setParts] = useState<ClockParts>(() => partsFromDate(new Date(Date.now() + 60 * 60 * 1000)));
  const [view, setView] = useState(() => {
    const start = partsFromDate(new Date());
    return { year: start.year, month: start.month };
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const saved = raw ? Number(JSON.parse(raw).target) : NaN;
      if (Number.isFinite(saved)) {
        setTarget(saved);
        const next = partsFromDate(new Date(saved));
        setParts(next);
        setView({ year: next.year, month: next.month });
      }
    } catch {
      // ignore broken storage
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (target == null) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify({ target }));
  }, [ready, target]);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = window.setInterval(tick, 250);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);
    window.addEventListener("pageshow", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("focus", tick);
      window.removeEventListener("pageshow", tick);
    };
  }, []);

  const left = useMemo(() => (target == null ? null : splitRemaining(target - now)), [target, now]);

  function apply() {
    setTarget(dateFromParts(parts).getTime());
    setNow(Date.now());
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">倒计时</h1>
      <p className="mt-1 text-sm leading-6 text-zinc-500">
        左边选日期，右边滚动选时间。剩余时间按系统时钟计算，切到别的窗口也会继续走。
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,20rem)_auto] md:items-start">
        <DateCalendar
          parts={parts}
          view={view}
          onView={setView}
          onPick={(date) => {
            setParts((cur) => ({
              ...cur,
              year: date.getFullYear(),
              month: date.getMonth(),
              day: date.getDate(),
            }));
            setView({ year: date.getFullYear(), month: date.getMonth() });
          }}
        />
        <TimeWheels parts={parts} onChange={(patch) => setParts((cur) => ({ ...cur, ...patch }))} />
      </div>

      <p className="mt-4 text-sm text-zinc-600">目标：{formatParts(parts)}</p>
      <div className="mt-3 flex gap-2">
        <button type="button" className={primaryBtnClass} onClick={apply}>
          开始倒计时
        </button>
        <button type="button" className={btnClass} disabled={target == null} onClick={() => setTarget(null)}>
          清空
        </button>
      </div>

      {left ? (
        <div className="mt-8">
          <p className="text-sm text-zinc-500">{left.done ? "已经到点" : "还剩"}</p>
          <div className="mt-3 grid grid-cols-4 gap-3">
            {[
              ["天", String(left.days)],
              ["时", pad(left.hours)],
              ["分", pad(left.minutes)],
              ["秒", pad(left.seconds)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-zinc-200 bg-white px-3 py-5 text-center">
                <div className="font-mono text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">{value}</div>
                <div className="mt-1 text-xs text-zinc-400">{label}</div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-zinc-500">目标：{target == null ? "" : new Date(target).toLocaleString("zh-CN")}</p>
        </div>
      ) : (
        <p className="mt-8 text-sm text-zinc-400">还没选目标时间。</p>
      )}
    </div>
  );
}

"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

const ITEM = 44;
const COPIES = 16;

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

export type ClockParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

export function partsFromDate(date: Date): ClockParts {
  return {
    year: date.getFullYear(),
    month: date.getMonth(),
    day: date.getDate(),
    hour: date.getHours(),
    minute: date.getMinutes(),
    second: date.getSeconds(),
  };
}

export function dateFromParts(parts: ClockParts) {
  return new Date(parts.year, parts.month, parts.day, parts.hour, parts.minute, parts.second);
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function monthCells(year: number, month: number) {
  const firstWeekday = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();
  const cells: { label: number; date: Date; outside: boolean }[] = [];
  for (let i = 0; i < firstWeekday; i++) {
    const day = prevDays - firstWeekday + 1 + i;
    cells.push({ label: day, date: new Date(year, month - 1, day), outside: true });
  }
  for (let day = 1; day <= days; day++) {
    cells.push({ label: day, date: new Date(year, month, day), outside: false });
  }
  let next = 1;
  while (cells.length % 7 !== 0) {
    cells.push({ label: next, date: new Date(year, month + 1, next), outside: true });
    next += 1;
  }
  return cells;
}

export function DateCalendar({
  parts,
  view,
  onView,
  onPick,
}: {
  parts: ClockParts;
  view: { year: number; month: number };
  onView: (next: { year: number; month: number }) => void;
  onPick: (date: Date) => void;
}) {
  const selected = new Date(parts.year, parts.month, parts.day);
  const today = new Date();
  const cells = monthCells(view.year, view.month);

  function shift(delta: number) {
    const next = new Date(view.year, view.month + delta, 1);
    onView({ year: next.getFullYear(), month: next.getMonth() });
  }

  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" className="rounded-full px-3 py-1 text-lg text-zinc-500 hover:bg-zinc-100" onClick={() => shift(-1)} aria-label="上个月">
          ‹
        </button>
        <div className="text-sm font-semibold tracking-tight">
          {view.year}年{view.month + 1}月
        </div>
        <button type="button" className="rounded-full px-3 py-1 text-lg text-zinc-500 hover:bg-zinc-100" onClick={() => shift(1)} aria-label="下个月">
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-xs text-zinc-400">
        {WEEKDAYS.map((day) => (
          <div key={day} className="py-1">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 text-center">
        {cells.map((cell) => {
          const picked = sameDay(cell.date, selected);
          const isToday = sameDay(cell.date, today);
          return (
            <button
              key={cell.date.toISOString()}
              type="button"
              onClick={() => onPick(cell.date)}
              className={`mx-auto my-0.5 flex h-9 w-9 items-center justify-center rounded-full text-sm ${
                picked
                  ? "bg-teal-700 font-semibold text-white"
                  : isToday
                    ? "font-semibold text-teal-700 ring-1 ring-teal-600"
                    : cell.outside
                      ? "text-zinc-300 hover:bg-zinc-50"
                      : "text-zinc-800 hover:bg-zinc-100"
              }`}
            >
              {cell.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Wheel({
  count,
  value,
  onChange,
}: {
  count: number;
  value: number;
  onChange: (next: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const fromWheel = useRef(false);
  const valueRef = useRef(value);
  valueRef.current = value;
  const items = Array.from({ length: count * COPIES }, (_, i) => i % count);
  const middle = Math.floor(COPIES / 2) * count;
  const [center, setCenter] = useState(middle + value);
  const centerRef = useRef(middle + value);

  function jumpTo(next: number) {
    const el = ref.current;
    if (!el) return;
    el.scrollTop = (middle + next) * ITEM;
  }

  useLayoutEffect(() => {
    jumpTo(valueRef.current);
  }, [count]);

  useEffect(() => {
    if (fromWheel.current) {
      fromWheel.current = false;
      return;
    }
    jumpTo(value);
  }, [value]);

  function onScroll() {
    const el = ref.current;
    if (!el) return;
    const index = Math.round(el.scrollTop / ITEM);
    const selected = ((index % count) + count) % count;
    if (index !== centerRef.current) {
      centerRef.current = index;
      setCenter(index);
    }
    const cycle = count * ITEM;
    if (el.scrollTop < cycle * 2) el.scrollTop += cycle * 6;
    else if (el.scrollTop > cycle * (COPIES - 2)) el.scrollTop -= cycle * 6;
    if (selected !== valueRef.current) {
      fromWheel.current = true;
      onChange(selected);
    }
  }

  return (
    <div className="relative h-[220px] w-[4.5rem]">
      <div
        ref={ref}
        onScroll={onScroll}
        className="relative z-20 h-full overflow-y-auto overscroll-contain [scrollbar-width:none] snap-y snap-mandatory [&::-webkit-scrollbar]:hidden"
        style={{
          maskImage: "linear-gradient(to bottom, transparent, black 28%, black 72%, transparent)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent, black 28%, black 72%, transparent)",
        }}
      >
        <div style={{ height: ITEM * 2 }} />
        {items.map((item, index) => (
          <div
            key={`${item}-${index}`}
            className={`flex snap-center items-center justify-center font-mono text-[1.35rem] tabular-nums ${
              index === center ? "font-semibold text-zinc-900" : "text-zinc-400"
            }`}
            style={{ height: ITEM }}
          >
            {String(item).padStart(2, "0")}
          </div>
        ))}
        <div style={{ height: ITEM * 2 }} />
      </div>
    </div>
  );
}

export function TimeWheels({
  parts,
  onChange,
}: {
  parts: ClockParts;
  onChange: (patch: Partial<ClockParts>) => void;
}) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white px-4 py-4 shadow-sm">
      <div className="mb-2 text-center text-sm font-semibold tracking-tight">时间</div>
      <div className="relative flex items-start justify-center gap-2">
        <div className="pointer-events-none absolute inset-x-1 top-[88px] z-10 h-11 rounded-xl bg-zinc-100" />
        {(
          [
            ["时", parts.hour, 24, "hour"],
            ["分", parts.minute, 60, "minute"],
            ["秒", parts.second, 60, "second"],
          ] as const
        ).map(([label, value, count, key]) => (
          <div key={key} className="flex flex-col items-center">
            <Wheel count={count} value={value} onChange={(next) => onChange({ [key]: next })} />
            <div className="mt-1 text-xs text-zinc-400">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

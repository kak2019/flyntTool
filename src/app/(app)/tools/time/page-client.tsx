"use client";

import { useEffect, useMemo, useState } from "react";
import { parseTimeInput, toTimeParts } from "@/lib/timestamp";
import { btnClass, fieldClass, primaryBtnClass } from "@/lib/styles";

function toDatetimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export default function TimePage() {
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState("");

  useEffect(() => {
    setInput(String(Math.floor(Date.now() / 1000)));
  }, []);

  const date = useMemo(() => parseTimeInput(input), [input]);
  const parts = date ? toTimeParts(date) : null;

  function useNow() {
    const now = new Date();
    setInput(String(Math.floor(now.getTime() / 1000)));
  }

  async function copy(label: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(""), 1200);
  }

  const rows = parts
    ? [
        ["秒级时间戳", String(parts.seconds)],
        ["毫秒时间戳", String(parts.ms)],
        ["本地时间", parts.local],
        ["北京时间", parts.shanghai],
        ["UTC", parts.utc],
        ["ISO 8601", parts.iso],
      ]
    : [];

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">时间戳</h1>
      <p className="mt-1 text-sm text-zinc-500">
        10 位当秒，13 位当毫秒。也认 ISO、常见日期文本。
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="1710000000 或 2024-03-10 12:00:00"
          className={`${fieldClass} max-w-xl font-mono`}
        />
        <button type="button" onClick={useNow} className={primaryBtnClass}>
          现在
        </button>
        <button
          type="button"
          onClick={() => setInput("")}
          className={btnClass}
        >
          清空
        </button>
      </div>

      <label className="mt-4 block max-w-xl text-sm">
        <span className="mb-1.5 block font-medium">本地日期时间</span>
        <input
          type="datetime-local"
          step="1"
          value={date ? toDatetimeLocal(date) : ""}
          onChange={(e) => {
            if (!e.target.value) return;
            const next = new Date(e.target.value);
            if (!Number.isNaN(next.getTime())) setInput(String(Math.floor(next.getTime() / 1000)));
          }}
          className={fieldClass}
        />
      </label>

      {input.trim() && !parts ? (
        <p className="mt-4 text-sm text-red-600">解析不了，换时间戳或标准日期试试。</p>
      ) : null}

      {rows.length ? (
        <div className="mt-5 space-y-2">
          {rows.map(([label, value]) => (
            <button
              key={label}
              type="button"
              onClick={() => void copy(label, value)}
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left hover:bg-zinc-50"
            >
              <span>
                <span className="block text-xs text-zinc-400">{label}</span>
                <span className="mt-0.5 block font-mono text-sm">{value}</span>
              </span>
              <span className="shrink-0 text-sm text-teal-700">
                {copied === label ? "已复制" : "复制"}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

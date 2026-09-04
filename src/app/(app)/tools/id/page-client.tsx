"use client";

import { useEffect, useMemo, useState } from "react";
import { generateIds, inspectId } from "@/lib/id-gen";
import { btnClass, fieldClass, primaryBtnClass, selectClass } from "@/lib/styles";

export default function IdPage() {
  const [kind, setKind] = useState<"uuid" | "nanoid">("uuid");
  const [count, setCount] = useState(5);
  const [size, setSize] = useState(21);
  const [ids, setIds] = useState<string[]>([]);
  const [copied, setCopied] = useState("");
  const [inspect, setInspect] = useState("");

  function refresh(nextKind = kind, nextCount = count, nextSize = size) {
    setIds(generateIds(nextKind, nextCount, nextSize));
  }

  useEffect(() => {
    setIds(generateIds("uuid", 5, 21));
  }, []);

  const inspected = useMemo(() => inspectId(inspect), [inspect]);

  async function copy(label: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(""), 1200);
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">UUID / NanoID</h1>
      <p className="mt-1 text-sm text-zinc-500">
        UUID 用浏览器 <code>crypto.randomUUID</code>，NanoID 用同一套 URL 字母表。
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <select
          value={kind}
          onChange={(e) => {
            const next = e.target.value as "uuid" | "nanoid";
            setKind(next);
            refresh(next, count, size);
          }}
          className={selectClass}
        >
          <option value="uuid">UUID v4</option>
          <option value="nanoid">NanoID</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-zinc-600">
          数量
          <input
            type="number"
            min={1}
            max={100}
            value={count}
            onChange={(e) => {
              const next = Number(e.target.value) || 1;
              setCount(next);
              refresh(kind, next, size);
            }}
            className={`${fieldClass} w-20`}
          />
        </label>
        {kind === "nanoid" ? (
          <label className="flex items-center gap-2 text-sm text-zinc-600">
            长度
            <input
              type="number"
              min={2}
              max={64}
              value={size}
              onChange={(e) => {
                const next = Number(e.target.value) || 21;
                setSize(next);
                refresh(kind, count, next);
              }}
              className={`${fieldClass} w-20`}
            />
          </label>
        ) : null}
        <button type="button" onClick={() => refresh()} className={primaryBtnClass}>
          再生成
        </button>
        <button
          type="button"
          onClick={() => void copy("全部", ids.join("\n"))}
          disabled={!ids.length}
          className={btnClass}
        >
          {copied === "全部" ? "已复制" : "复制全部"}
        </button>
      </div>

      <ul className="mt-5 space-y-2">
        {ids.map((id, index) => (
          <li key={`${id}-${index}`}>
            <button
              type="button"
              onClick={() => void copy(id, id)}
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left hover:bg-zinc-50"
            >
              <span className="truncate font-mono text-sm">{id}</span>
              <span className="shrink-0 text-sm text-teal-700">
                {copied === id ? "已复制" : "复制"}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-8 border-t border-zinc-200 pt-6">
        <h2 className="text-sm font-medium">识别</h2>
        <input
          value={inspect}
          onChange={(e) => setInspect(e.target.value)}
          placeholder="贴一个 UUID 或 NanoID"
          spellCheck={false}
          className={`${fieldClass} mt-3 font-mono`}
        />
        {inspected ? (
          <p className="mt-3 text-sm text-zinc-600">
            {inspected.kind === "uuid"
              ? `UUID v${inspected.version}，变体 ${inspected.variant}`
              : inspected.kind === "nanoid"
                ? `看起来像 NanoID，${inspected.length} 位`
                : "认不出来，不是标准 UUID，也不像 NanoID 字母表"}
          </p>
        ) : null}
      </div>
    </div>
  );
}

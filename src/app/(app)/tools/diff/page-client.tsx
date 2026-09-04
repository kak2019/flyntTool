"use client";

import { diffLines, diffWords } from "diff";
import { useMemo, useState } from "react";
import { btnClass, fieldClass } from "@/lib/styles";

type Mode = "lines" | "words";

export default function DiffPage() {
  const [left, setLeft] = useState("");
  const [right, setRight] = useState("");
  const [mode, setMode] = useState<Mode>("lines");

  const parts = useMemo(() => {
    if (!left && !right) return [];
    return mode === "lines" ? diffLines(left, right) : diffWords(left, right);
  }, [left, right, mode]);

  const stats = useMemo(() => {
    let added = 0;
    let removed = 0;
    for (const part of parts) {
      const n = part.count ?? part.value.split("\n").filter(Boolean).length;
      if (part.added) added += n;
      if (part.removed) removed += n;
    }
    return { added, removed };
  }, [parts]);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">文本 Diff</h1>
      <p className="mt-1 text-sm text-zinc-500">左边原文，右边改过的。绿色是新增，红色是删除。</p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setMode("lines")}
          className={mode === "lines" ? `${btnClass} border-teal-700 bg-teal-50` : btnClass}
        >
          按行
        </button>
        <button
          type="button"
          onClick={() => setMode("words")}
          className={mode === "words" ? `${btnClass} border-teal-700 bg-teal-50` : btnClass}
        >
          按词
        </button>
        <button
          type="button"
          onClick={() => {
            setLeft("");
            setRight("");
          }}
          className={btnClass}
        >
          清空
        </button>
        {parts.length ? (
          <span className="text-sm text-zinc-500">
            +{stats.added} / −{stats.removed}
          </span>
        ) : null}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">原文</span>
          <textarea
            value={left}
            onChange={(e) => setLeft(e.target.value)}
            rows={14}
            spellCheck={false}
            className={`${fieldClass} min-h-56 resize-y p-4 font-mono text-[13px] leading-6`}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">新稿</span>
          <textarea
            value={right}
            onChange={(e) => setRight(e.target.value)}
            rows={14}
            spellCheck={false}
            className={`${fieldClass} min-h-56 resize-y p-4 font-mono text-[13px] leading-6`}
          />
        </label>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 text-sm font-medium">对比结果</div>
        <pre className="min-h-40 overflow-x-auto whitespace-pre-wrap rounded-xl border border-zinc-200 bg-white p-4 font-mono text-[13px] leading-6">
          {parts.length ? (
            mode === "lines" ? (
              parts.flatMap((part, index) => {
                const lines = part.value.split("\n");
                if (lines.length && lines[lines.length - 1] === "") lines.pop();
                return lines.map((line, lineIndex) => (
                  <div
                    key={`${index}-${lineIndex}`}
                    className={
                      part.added
                        ? "bg-emerald-100 text-emerald-900"
                        : part.removed
                          ? "bg-rose-100 text-rose-900"
                          : ""
                    }
                  >
                    <span className="inline-block w-4 select-none text-zinc-400">
                      {part.added ? "+" : part.removed ? "−" : " "}
                    </span>
                    {line || " "}
                  </div>
                ));
              })
            ) : (
              parts.map((part, index) => (
                <span
                  key={index}
                  className={
                    part.added
                      ? "bg-emerald-100 text-emerald-900"
                      : part.removed
                        ? "bg-rose-100 text-rose-900"
                        : ""
                  }
                >
                  {part.value}
                </span>
              ))
            )
          ) : (
            <span className="text-zinc-400">两边贴上文字就会出结果</span>
          )}
        </pre>
      </div>
    </div>
  );
}

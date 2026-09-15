"use client";

import { KeyboardEvent, useMemo, useState } from "react";
import {
  COMMIT_TYPES,
  cleanCommitMessage,
  writeCommitMessage,
  type CommitType,
} from "@/lib/client-commit-msg";
import { MAX_COMMIT_CHARS } from "@/lib/limits";
import { btnClass, fieldClass, primaryBtnClass, selectClass } from "@/lib/styles";

const EXAMPLES = [
  "修了 Safari 打开网站会跳到 localhost:3001",
  "加一个工具，中文说明转成约定式提交英文",
  "微信里打开是白屏，把 oklch 颜色改成 RGB",
];

export default function CommitPage() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [type, setType] = useState<CommitType>("auto");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const count = useMemo(() => input.trim().length, [input]);
  const overLimit = count > MAX_COMMIT_CHARS;
  const canRun = count > 0 && !pending && !overLimit;

  async function run() {
    if (!canRun) return;
    setPending(true);
    setError("");
    setOutput("");
    try {
      const text = await writeCommitMessage({
        text: input,
        type,
        onDelta: (full) => setOutput(cleanCommitMessage(full)),
      });
      setOutput(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成失败");
    } finally {
      setPending(false);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void run();
    }
  }

  async function copyOutput() {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">约定式提交</h1>
      <p className="mt-1 text-sm text-zinc-500">
        用中文写改了什么，生成 <code className="rounded bg-zinc-100 px-1">feat:</code> /{" "}
        <code className="rounded bg-zinc-100 px-1">fix:</code> 那种英文提交。回车生成，Shift + Enter
        换行。
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as CommitType)}
          className={selectClass}
        >
          {COMMIT_TYPES.map((item) => (
            <option key={item} value={item}>
              {item === "auto" ? "自动选类型" : item}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => {
            setInput("");
            setOutput("");
            setError("");
          }}
          className={btnClass}
        >
          清空
        </button>
        <button type="button" disabled={!canRun} onClick={() => void run()} className={primaryBtnClass}>
          {pending ? "生成中…" : "生成"}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => setInput(example)}
            className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-600 hover:border-teal-600 hover:text-teal-800"
          >
            {example}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 flex items-center justify-between text-sm font-medium">
            中文说明
            <span className={`font-normal ${overLimit ? "text-red-600" : "text-zinc-400"}`}>
              {count} / {MAX_COMMIT_CHARS}
            </span>
          </span>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={14}
            placeholder="例如：修了微信里打开是白屏"
            className={`${fieldClass} min-h-56 resize-y p-4 leading-6`}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 flex items-center justify-between text-sm font-medium">
            提交信息
            <button
              type="button"
              onClick={() => void copyOutput()}
              disabled={!output}
              className="font-normal text-teal-700 disabled:text-zinc-300"
            >
              {copied ? "已复制" : "复制"}
            </button>
          </span>
          <textarea
            value={output}
            onChange={(e) => setOutput(e.target.value)}
            rows={14}
            readOnly={pending}
            className={`${fieldClass} min-h-56 resize-y p-4 font-mono text-sm leading-6`}
          />
        </label>
      </div>

      {overLimit ? (
        <p className="mt-3 text-sm text-red-600">超出字数上限，请缩短后再生成。</p>
      ) : null}
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}

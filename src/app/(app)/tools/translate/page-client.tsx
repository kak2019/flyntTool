"use client";

import { KeyboardEvent, useMemo, useState } from "react";
import { LANGUAGES, SOURCE_LANGUAGES } from "@/lib/languages";
import { translateText } from "@/lib/client-translate";
import { MAX_TRANSLATE_CHARS } from "@/lib/limits";
import { btnClass, fieldClass, primaryBtnClass, selectClass } from "@/lib/styles";

export default function TranslatePage() {
  const [sourceLang, setSourceLang] = useState("auto");
  const [targetLang, setTargetLang] = useState("English");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const count = useMemo(() => input.trim().length, [input]);
  const overLimit = count > MAX_TRANSLATE_CHARS;
  const canTranslate = count > 0 && !pending && !overLimit;

  async function run() {
    if (!canTranslate) return;
    setPending(true);
    setError("");
    setOutput("");
    try {
      const text = await translateText({
        text: input,
        sourceLang,
        targetLang,
        onDelta: setOutput,
      });
      setOutput(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "翻译失败");
    } finally {
      setPending(false);
    }
  }

  function swap() {
    const nextSource = targetLang;
    const nextTarget =
      sourceLang === "auto"
        ? targetLang === "Chinese"
          ? "English"
          : "Chinese"
        : sourceLang;
    setSourceLang(nextSource);
    setTargetLang(nextTarget);
    setInput(output);
    setOutput(input);
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
      <h1 className="text-2xl font-semibold tracking-tight">快速翻译</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Qwen MT Flash。回车翻译，Shift + Enter 换行。单次最多 {MAX_TRANSLATE_CHARS} 字。
      </p>

      <div className="mt-5 flex items-center gap-2 whitespace-nowrap">
        <select
          value={sourceLang}
          onChange={(e) => setSourceLang(e.target.value)}
          className={selectClass}
        >
          {SOURCE_LANGUAGES.map((lang) => (
            <option key={lang.id} value={lang.id}>
              {lang.label}
            </option>
          ))}
        </select>
        <button type="button" onClick={swap} className={btnClass}>
          对调
        </button>
        <select
          value={targetLang}
          onChange={(e) => setTargetLang(e.target.value)}
          className={selectClass}
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.id} value={lang.id}>
              {lang.label}
            </option>
          ))}
        </select>
        <div className="ml-auto flex shrink-0 items-center gap-2">
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
          <button
            type="button"
            disabled={!canTranslate}
            onClick={() => void run()}
            className={primaryBtnClass}
          >
            {pending ? "翻译中…" : "翻译"}
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 flex items-center justify-between text-sm font-medium">
            原文
            <span className={`font-normal ${overLimit ? "text-red-600" : "text-zinc-400"}`}>
              {count} / {MAX_TRANSLATE_CHARS}
            </span>
          </span>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={16}
            placeholder="贴进来即可"
            className={`${fieldClass} min-h-64 resize-y p-4 leading-6`}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 flex items-center justify-between text-sm font-medium">
            译文
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
            rows={16}
            readOnly={pending}
            className={`${fieldClass} min-h-64 resize-y p-4 leading-6`}
          />
        </label>
      </div>

      {overLimit ? (
        <p className="mt-3 text-sm text-red-600">超出字数上限，请缩短后再译。</p>
      ) : null}
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}

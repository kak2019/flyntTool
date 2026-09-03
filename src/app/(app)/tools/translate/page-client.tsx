"use client";

import { useMemo, useState } from "react";
import { LANGUAGES, SOURCE_LANGUAGES } from "@/lib/languages";
import { translateText } from "@/lib/client-translate";

export default function TranslatePage() {
  const [sourceLang, setSourceLang] = useState("auto");
  const [targetLang, setTargetLang] = useState("Chinese");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const canTranslate = input.trim().length > 0 && !pending;

  async function run() {
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

  const count = useMemo(() => input.trim().length, [input]);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">快速翻译</h1>
      <p className="mt-1 text-sm text-zinc-500">
        走 Qwen MT Flash。源语言可自动检测，目标默认中文。
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <select
          value={sourceLang}
          onChange={(e) => setSourceLang(e.target.value)}
          className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-700"
        >
          {SOURCE_LANGUAGES.map((lang) => (
            <option key={lang.id} value={lang.id}>
              {lang.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={swap}
          className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm hover:bg-zinc-50"
        >
          对调
        </button>
        <select
          value={targetLang}
          onChange={(e) => setTargetLang(e.target.value)}
          className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-700"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.id} value={lang.id}>
              {lang.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={!canTranslate}
          onClick={run}
          className="ml-auto rounded-xl bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50"
        >
          {pending ? "翻译中…" : "翻译"}
        </button>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 flex items-center justify-between text-sm font-medium">
            原文
            <span className="font-normal text-zinc-400">{count} 字</span>
          </span>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={16}
            placeholder="贴进来即可"
            className="w-full resize-y rounded-2xl border border-zinc-200 bg-white p-4 text-sm leading-6 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">译文</span>
          <textarea
            value={output}
            onChange={(e) => setOutput(e.target.value)}
            rows={16}
            readOnly={pending}
            className="w-full resize-y rounded-2xl border border-zinc-200 bg-white p-4 text-sm leading-6 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20"
          />
        </label>
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}

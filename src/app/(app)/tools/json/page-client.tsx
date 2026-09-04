"use client";

import { useMemo, useState } from "react";
import { minifyJson, prettyJson } from "@/lib/json-format";
import { btnClass, fieldClass, primaryBtnClass } from "@/lib/styles";

export default function JsonPage() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const empty = !input.trim();

  function apply(
    fn: (s: string) => { ok: true; text: string } | { ok: false; error: string },
    okText: string,
  ) {
    const result = fn(input);
    if (!result.ok) {
      setStatus({ ok: false, text: result.error });
      return;
    }
    setOutput(result.text);
    setStatus({ ok: true, text: okText });
  }

  function validate() {
    const result = prettyJson(input);
    if (!result.ok) {
      setStatus({ ok: false, text: result.error });
      return;
    }
    setStatus({ ok: true, text: "合法 JSON" });
  }

  async function copyOutput() {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  const lines = useMemo(() => (output ? output.split("\n").length : 0), [output]);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">JSON 格式化</h1>
      <p className="mt-1 text-sm text-zinc-500">校验、美化、压缩。左边贴进去，右边拿结果。</p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={empty}
          onClick={() => apply(prettyJson, "已格式化")}
          className={primaryBtnClass}
        >
          格式化
        </button>
        <button
          type="button"
          disabled={empty}
          onClick={() => apply(minifyJson, "已压缩")}
          className={btnClass}
        >
          压缩
        </button>
        <button type="button" disabled={empty} onClick={validate} className={btnClass}>
          校验
        </button>
        <button
          type="button"
          onClick={() => {
            setInput("");
            setOutput("");
            setStatus(null);
          }}
          className={btnClass}
        >
          清空
        </button>
        {status ? (
          <span className={`text-sm ${status.ok ? "text-teal-700" : "text-red-600"}`}>
            {status.text}
          </span>
        ) : null}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">输入</span>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={18}
            spellCheck={false}
            placeholder='{"ok": true}'
            className={`${fieldClass} min-h-72 resize-y p-4 font-mono text-[13px] leading-6`}
          />
        </label>
        <div>
          <div className="mb-1.5 flex items-center justify-between text-sm font-medium">
            输出
            <span className="flex items-center gap-3 font-normal">
              {output ? <span className="text-zinc-400">{lines} 行</span> : null}
              <button
                type="button"
                onClick={() => void copyOutput()}
                disabled={!output}
                className="text-teal-700 disabled:text-zinc-300"
              >
                {copied ? "已复制" : "复制"}
              </button>
            </span>
          </div>
          <textarea
            value={output}
            onChange={(e) => setOutput(e.target.value)}
            rows={18}
            spellCheck={false}
            className={`${fieldClass} min-h-72 resize-y p-4 font-mono text-[13px] leading-6`}
          />
        </div>
      </div>
    </div>
  );
}

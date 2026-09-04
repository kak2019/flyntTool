"use client";

import { useMemo, useState } from "react";
import { buildQuery, buildUrl, parseUrlOrQuery, type QueryRow } from "@/lib/url-parse";
import { btnClass, fieldClass, primaryBtnClass } from "@/lib/styles";

export default function UrlPage() {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState<QueryRow[]>([]);
  const [copied, setCopied] = useState("");
  const [codec, setCodec] = useState("");
  const [codecOut, setCodecOut] = useState("");

  const parsed = useMemo(() => (input.trim() ? parseUrlOrQuery(input) : null), [input]);

  const kind = parsed?.ok ? parsed.kind : null;
  const parts = parsed?.ok ? parsed.parsed : null;

  const rebuilt = useMemo(() => {
    if (!kind) return "";
    try {
      return kind === "query" ? buildQuery(query) : buildUrl(input, query);
    } catch {
      return "";
    }
  }, [kind, input, query]);

  function applyInput(value: string) {
    setInput(value);
    const result = parseUrlOrQuery(value);
    setQuery(result.ok ? result.parsed.query : []);
  }

  function updateRow(index: number, patch: Partial<QueryRow>) {
    setQuery((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  async function copy(label: string, value: string) {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(""), 1200);
  }

  function encode() {
    try {
      setCodecOut(encodeURIComponent(codec));
    } catch {
      setCodecOut("编码失败");
    }
  }

  function decode() {
    try {
      setCodecOut(decodeURIComponent(codec));
    } catch {
      setCodecOut("解码失败，可能不是合法百分号编码");
    }
  }

  const fields = parts
    ? [
        ["协议", parts.protocol],
        ["主机", parts.host],
        ["路径", parts.pathname],
        ["Hash", parts.hash],
        ["用户名", parts.username],
        ["密码", parts.password],
      ].filter(([, value]) => value)
    : [];

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">URL / Query</h1>
      <p className="mt-1 text-sm text-zinc-500">
        贴完整链接或只贴查询串。改参数后会重新拼回去。
      </p>

      <label className="mt-5 block">
        <span className="mb-1.5 block text-sm font-medium">输入</span>
        <textarea
          value={input}
          onChange={(e) => applyInput(e.target.value)}
          rows={4}
          spellCheck={false}
          placeholder="https://example.com/path?foo=1&bar=hello%20world#hash"
          className={`${fieldClass} resize-y p-4 font-mono text-[13px] leading-6`}
        />
      </label>

      {parsed && !parsed.ok ? (
        <p className="mt-3 text-sm text-red-600">{parsed.error}</p>
      ) : null}

      {kind === "url" && fields.length ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {fields.map(([label, value]) => (
            <button
              key={label}
              type="button"
              onClick={() => void copy(label, value)}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-left hover:bg-zinc-50"
            >
              <div className="text-xs text-zinc-400">{label}</div>
              <div className="mt-0.5 truncate font-mono text-sm">{value}</div>
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-5">
        <div className="mb-1.5 flex items-center justify-between text-sm font-medium">
          查询参数
          <button
            type="button"
            onClick={() => setQuery((rows) => [...rows, { key: "", value: "" }])}
            className="font-normal text-teal-700"
          >
            加一行
          </button>
        </div>
        <div className="space-y-2">
          {query.length ? (
            query.map((row, index) => (
              <div key={index} className="flex gap-2">
                <input
                  value={row.key}
                  onChange={(e) => updateRow(index, { key: e.target.value })}
                  placeholder="key"
                  className={`${fieldClass} font-mono`}
                />
                <input
                  value={row.value}
                  onChange={(e) => updateRow(index, { value: e.target.value })}
                  placeholder="value"
                  className={`${fieldClass} font-mono`}
                />
                <button
                  type="button"
                  onClick={() => setQuery((rows) => rows.filter((_, i) => i !== index))}
                  className={btnClass}
                >
                  删
                </button>
              </div>
            ))
          ) : (
            <p className="rounded-xl border border-dashed border-zinc-200 px-3 py-4 text-sm text-zinc-400">
              没有查询参数
            </p>
          )}
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-1.5 flex items-center justify-between text-sm font-medium">
          重组结果
          <button
            type="button"
            onClick={() => void copy("结果", rebuilt)}
            disabled={!rebuilt}
            className="font-normal text-teal-700 disabled:text-zinc-300"
          >
            {copied === "结果" ? "已复制" : "复制"}
          </button>
        </div>
        <textarea
          readOnly
          value={rebuilt}
          rows={3}
          className={`${fieldClass} resize-y p-4 font-mono text-[13px] leading-6`}
        />
      </div>

      <div className="mt-8 border-t border-zinc-200 pt-6">
        <h2 className="text-sm font-medium">百分号编解码</h2>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <textarea
            value={codec}
            onChange={(e) => setCodec(e.target.value)}
            rows={4}
            placeholder="hello world / hello%20world"
            className={`${fieldClass} resize-y p-4 font-mono text-[13px] leading-6`}
          />
          <textarea
            readOnly
            value={codecOut}
            rows={4}
            className={`${fieldClass} resize-y p-4 font-mono text-[13px] leading-6`}
          />
        </div>
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={encode} className={primaryBtnClass}>
            编码
          </button>
          <button type="button" onClick={decode} className={btnClass}>
            解码
          </button>
        </div>
      </div>
    </div>
  );
}

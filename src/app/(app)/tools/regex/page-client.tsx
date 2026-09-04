"use client";

import { useMemo, useState } from "react";
import {
  highlightSegs,
  parseSlashRegex,
  replaceRegex,
  runRegex,
} from "@/lib/regex-test";
import { btnClass, fieldClass } from "@/lib/styles";

const FLAGS: { id: string; hint: string }[] = [
  { id: "g", hint: "全部" },
  { id: "i", hint: "忽略大小写" },
  { id: "m", hint: "多行 ^ $" },
  { id: "s", hint: "点匹配换行" },
  { id: "u", hint: "Unicode" },
  { id: "y", hint: "粘滞" },
];

const MARK = [
  "bg-teal-100 text-teal-950",
  "bg-amber-100 text-amber-950",
  "bg-sky-100 text-sky-950",
  "bg-violet-100 text-violet-950",
];

export default function RegexPage() {
  const [pattern, setPattern] = useState("");
  const [flags, setFlags] = useState("g");
  const [sample, setSample] = useState("");
  const [replacement, setReplacement] = useState("");
  const [copied, setCopied] = useState(false);

  function onPattern(value: string) {
    const parsed = parseSlashRegex(value);
    if (parsed) {
      setPattern(parsed.pattern);
      setFlags(parsed.flags || "g");
      return;
    }
    setPattern(value);
  }

  function toggleFlag(id: string) {
    setFlags((prev) => (prev.includes(id) ? prev.replaceAll(id, "") : `${prev}${id}`));
  }

  const result = useMemo(() => runRegex(pattern, flags, sample), [pattern, flags, sample]);
  const replaced = useMemo(
    () => replaceRegex(pattern, flags, sample, replacement),
    [pattern, flags, sample, replacement],
  );
  const replacing = Boolean(replacement);
  const segs = useMemo(
    () => (result.ok ? highlightSegs(sample, result.matches) : []),
    [result, sample],
  );

  async function copyReplaced() {
    if (!replacing || !replaced.ok) return;
    await navigator.clipboard.writeText(replaced.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">正则测试</h1>
      <p className="mt-1 text-sm text-zinc-500">
        表达式和样例即时匹配。也支持直接贴 <code>/foo/gi</code>。
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="font-mono text-zinc-400">/</span>
        <input
          value={pattern}
          onChange={(e) => onPattern(e.target.value)}
          placeholder="https?:\/\/\S+"
          spellCheck={false}
          className={`${fieldClass} min-w-0 flex-1 font-mono`}
        />
        <span className="font-mono text-zinc-400">/</span>
        <div className="flex flex-wrap gap-1">
          {FLAGS.map((flag) => {
            const on = flags.includes(flag.id);
            return (
              <button
                key={flag.id}
                type="button"
                title={flag.hint}
                onClick={() => toggleFlag(flag.id)}
                className={`${btnClass} px-2.5 font-mono ${on ? "border-teal-700 bg-teal-50 text-teal-800" : ""}`}
              >
                {flag.id}
              </button>
            );
          })}
        </div>
      </div>

      {!result.ok ? <p className="mt-3 text-sm text-red-600">{result.error}</p> : null}
      {result.ok && pattern ? (
        <p className="mt-3 text-sm text-zinc-500">
          {result.matches.length ? `${result.matches.length} 处匹配` : "没有匹配"}
        </p>
      ) : null}

      <label className="mt-4 block">
        <span className="mb-1.5 block text-sm font-medium">样例</span>
        <textarea
          value={sample}
          onChange={(e) => setSample(e.target.value)}
          rows={8}
          spellCheck={false}
          placeholder={"Visit https://flynt.top and http://localhost:3001"}
          className={`${fieldClass} min-h-40 resize-y p-4 font-mono text-[13px] leading-6`}
        />
      </label>

      <div className="mt-4">
        <div className="mb-1.5 text-sm font-medium">高亮</div>
        <pre className="min-h-24 overflow-x-auto whitespace-pre-wrap rounded-xl border border-zinc-200 bg-white p-4 font-mono text-[13px] leading-6">
          {sample ? (
            segs.length ? (
              segs.map((seg, index) =>
                seg.hit ? (
                  <mark
                    key={index}
                    className={`rounded-sm px-0.5 ${MARK[(seg.nth ?? 0) % MARK.length]} ${
                      !seg.text ? "inline-block w-0.5 px-0" : ""
                    }`}
                  >
                    {seg.text || "\u200b"}
                  </mark>
                ) : (
                  <span key={index}>{seg.text}</span>
                ),
              )
            ) : (
              sample
            )
          ) : (
            <span className="text-zinc-400">匹配结果会标在这里</span>
          )}
        </pre>
      </div>

      {result.ok && result.matches.length ? (
        <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs text-zinc-400">
              <tr>
                <th className="px-3 py-2 font-medium">#</th>
                <th className="px-3 py-2 font-medium">匹配</th>
                <th className="px-3 py-2 font-medium">位置</th>
                <th className="px-3 py-2 font-medium">分组</th>
              </tr>
            </thead>
            <tbody>
              {result.matches.map((match, index) => (
                <tr key={`${match.index}-${index}`} className="border-t border-zinc-100">
                  <td className="px-3 py-2 text-zinc-400">{index + 1}</td>
                  <td className="px-3 py-2 font-mono text-[13px]">{match.text || "∅"}</td>
                  <td className="px-3 py-2 font-mono text-[13px] text-zinc-500">
                    {match.index}–{match.end}
                  </td>
                  <td className="px-3 py-2 font-mono text-[13px] text-zinc-500">
                    {match.groups.length
                      ? match.groups.map((g, i) => `$${i + 1}=${g ?? ""}`).join("  ")
                      : "—"}
                    {Object.keys(match.named).length
                      ? `  ${Object.entries(match.named)
                          .map(([k, v]) => `${k}=${v}`)
                          .join("  ")}`
                      : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="mt-8 border-t border-zinc-200 pt-6">
        <div className="mb-1.5 flex items-center justify-between text-sm font-medium">
          替换
          <button
            type="button"
            onClick={() => void copyReplaced()}
            disabled={!replacing || !replaced.ok}
            className="font-normal text-teal-700 disabled:text-zinc-300"
          >
            {copied ? "已复制" : "复制结果"}
          </button>
        </div>
        <input
          value={replacement}
          onChange={(e) => setReplacement(e.target.value)}
          placeholder="$1 或完整替换文本"
          spellCheck={false}
          className={`${fieldClass} font-mono`}
        />
        <pre className="mt-3 min-h-20 overflow-x-auto whitespace-pre-wrap rounded-xl border border-zinc-200 bg-white p-4 font-mono text-[13px] leading-6">
          {replaced.ok ? (
            replacing && sample ? (
              replaced.text
            ) : (
              <span className="text-zinc-400">填替换文本后这里出结果</span>
            )
          ) : (
            <span className="text-red-600">{replaced.error}</span>
          )}
        </pre>
      </div>
    </div>
  );
}

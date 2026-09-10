"use client";

import { useEffect, useRef, useState } from "react";
import { formatByteSize } from "@/lib/base64";
import { emptyHashes, hashAlgs, hashBytes, hashText, type HashSet } from "@/lib/hash";
import { btnClass, fieldClass, primaryBtnClass } from "@/lib/styles";

export default function HashPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [hashes, setHashes] = useState<HashSet>(emptyHashes);
  const [copied, setCopied] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setError("");
      if (file) {
        setPending(true);
        try {
          const buf = await file.arrayBuffer();
          if (cancelled) return;
          const next = await hashBytes(new Uint8Array(buf));
          if (!cancelled) setHashes(next);
        } catch (err) {
          if (!cancelled) {
            setHashes(emptyHashes());
            setError(err instanceof Error ? err.message : "计算失败");
          }
        } finally {
          if (!cancelled) setPending(false);
        }
        return;
      }
      setPending(false);
      if (!text) {
        setHashes(emptyHashes());
        return;
      }
      const next = await hashText(text);
      if (!cancelled) setHashes(next);
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [text, file]);

  async function copy(label: string, value: string) {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(""), 1200);
  }

  function onFile(next?: File | null) {
    if (!next) return;
    setFile(next);
    setText("");
  }

  function reset() {
    setText("");
    setFile(null);
    setHashes(emptyHashes());
    setError("");
    if (fileRef.current) fileRef.current.value = "";
  }

  const ready = hashAlgs().some((alg) => hashes[alg]);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Hash</h1>
      <p className="mt-1 text-sm text-zinc-500">
        MD5 / SHA-1 / SHA-256。贴文本即时计算，文件丢进来也可以。
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => fileRef.current?.click()} className={primaryBtnClass}>
          选择文件
        </button>
        <button type="button" onClick={reset} className={btnClass}>
          清空
        </button>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            onFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        {file ? (
          <span className="text-sm text-zinc-500">
            {file.name} · {formatByteSize(file.size)}
            {pending ? " · 计算中…" : ""}
          </span>
        ) : pending ? (
          <span className="text-sm text-zinc-500">计算中…</span>
        ) : null}
        {error ? <span className="text-sm text-red-600">{error}</span> : null}
      </div>

      <label className="mt-4 block">
        <span className="mb-1.5 block text-sm font-medium">文本</span>
        <textarea
          value={text}
          onChange={(e) => {
            setFile(null);
            setText(e.target.value);
          }}
          rows={8}
          spellCheck={false}
          placeholder="贴文本，或把文件拖到下面"
          className={`${fieldClass} min-h-36 resize-y p-4 font-mono text-[13px] leading-6`}
        />
      </label>

      <label
        className={`mt-4 block cursor-pointer rounded-2xl border border-dashed px-6 py-8 text-center text-sm ${
          dragging ? "border-teal-600 bg-teal-50 text-teal-800" : "border-zinc-300 bg-white text-zinc-500"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          onFile(e.dataTransfer.files?.[0]);
        }}
      >
        把文件拖到这里
      </label>

      <ul className="mt-5 space-y-3">
        {hashAlgs().map((alg) => (
          <li key={alg} className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">{alg}</span>
              <button
                type="button"
                disabled={!hashes[alg]}
                onClick={() => void copy(alg, hashes[alg])}
                className="text-sm text-teal-700 disabled:text-zinc-300"
              >
                {copied === alg ? "已复制" : "复制"}
              </button>
            </div>
            <p className="mt-1 break-all font-mono text-[13px] leading-6 text-zinc-700">
              {hashes[alg] || (ready || text || file ? "" : "—")}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

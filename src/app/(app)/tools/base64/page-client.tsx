"use client";

import { useEffect, useRef, useState } from "react";
import {
  decodeBase64,
  encodeDataUrl,
  encodeText,
  formatByteSize,
  looksLikeBase64,
  type DecodeOk,
} from "@/lib/base64";
import { btnClass, fieldClass, primaryBtnClass } from "@/lib/styles";

export default function Base64Page() {
  const fileRef = useRef<HTMLInputElement>(null);
  const previewUrl = useRef<string | null>(null);

  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [dataUrl, setDataUrl] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [preview, setPreview] = useState("");
  const [copied, setCopied] = useState(false);

  function revokePreview() {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = null;
    setPreview("");
  }

  useEffect(() => () => revokePreview(), []);

  function showDecode(result: DecodeOk) {
    revokePreview();
    if (result.imageMime) {
      const blob = new Blob([new Uint8Array(result.bytes)], { type: result.imageMime });
      const url = URL.createObjectURL(blob);
      previewUrl.current = url;
      setPreview(url);
      setOutput(result.text ?? `图片 ${result.imageMime}，${formatByteSize(result.bytes.length)}`);
      setStatus({ ok: true, text: `已解码 · ${result.imageMime} · ${formatByteSize(result.bytes.length)}` });
      return;
    }
    if (result.text !== null) {
      setOutput(result.text);
      setStatus({ ok: true, text: `已解码 · ${formatByteSize(result.bytes.length)}` });
      return;
    }
    setOutput(`二进制 ${formatByteSize(result.bytes.length)}，不是文本也不是常见图片。`);
    setStatus({ ok: true, text: `已解码 · ${formatByteSize(result.bytes.length)}` });
  }

  function encode() {
    if (!input) {
      setStatus({ ok: false, text: "没有内容" });
      return;
    }
    const encoded = encodeText(input);
    revokePreview();
    setOutput(dataUrl ? `data:text/plain;base64,${encoded}` : encoded);
    setStatus({ ok: true, text: "已编码" });
  }

  function decode() {
    const result = decodeBase64(input);
    if (!result.ok) {
      revokePreview();
      setStatus({ ok: false, text: result.error });
      return;
    }
    showDecode(result);
  }

  function auto() {
    if (!input.trim()) {
      setStatus({ ok: false, text: "没有内容" });
      return;
    }
    if (looksLikeBase64(input)) decode();
    else encode();
  }

  async function onFile(file?: File | null) {
    if (!file) return;
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    const raw = encodeDataUrl(bytes, file.type || "application/octet-stream");
    revokePreview();
    setInput(file.name);
    setOutput(dataUrl ? raw : raw.slice(raw.indexOf(",") + 1));
    setStatus({ ok: true, text: `已编码 ${file.name} · ${formatByteSize(file.size)}` });
  }

  async function copyOutput() {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  function reset() {
    revokePreview();
    setInput("");
    setOutput("");
    setStatus(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Base64</h1>
      <p className="mt-1 text-sm text-zinc-500">
        文本编码、解码。贴一段像 Base64 的内容点「自动」就会解码；图片会预览。
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button type="button" disabled={!input.trim()} onClick={auto} className={primaryBtnClass}>
          自动
        </button>
        <button type="button" disabled={!input} onClick={encode} className={btnClass}>
          编码
        </button>
        <button type="button" disabled={!input.trim()} onClick={decode} className={btnClass}>
          解码
        </button>
        <button type="button" onClick={() => fileRef.current?.click()} className={btnClass}>
          编码文件
        </button>
        <button type="button" onClick={reset} className={btnClass}>
          清空
        </button>
        <label className="flex items-center gap-1.5 text-sm text-zinc-600">
          <input
            type="checkbox"
            checked={dataUrl}
            onChange={(e) => setDataUrl(e.target.checked)}
          />
          带 data URL 前缀
        </label>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            void onFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        {status ? (
          <span className={`text-sm ${status.ok ? "text-teal-700" : "text-red-600"}`}>{status.text}</span>
        ) : null}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">输入</span>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={16}
            spellCheck={false}
            placeholder="Hello 或 iVBORw0KGgo…"
            className={`${fieldClass} min-h-64 resize-y p-4 font-mono text-[13px] leading-6`}
          />
        </label>
        <div>
          <div className="mb-1.5 flex items-center justify-between text-sm font-medium">
            输出
            <button
              type="button"
              onClick={() => void copyOutput()}
              disabled={!output}
              className="font-normal text-teal-700 disabled:text-zinc-300"
            >
              {copied ? "已复制" : "复制"}
            </button>
          </div>
          <textarea
            value={output}
            onChange={(e) => setOutput(e.target.value)}
            rows={16}
            spellCheck={false}
            className={`${fieldClass} min-h-64 resize-y p-4 font-mono text-[13px] leading-6`}
          />
        </div>
      </div>

      {preview ? (
        <figure className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
          <figcaption className="border-b border-zinc-100 px-4 py-2 text-xs text-zinc-400">图片预览</figcaption>
          <div className="flex justify-center bg-[linear-gradient(45deg,#e4e4e7_25%,transparent_25%),linear-gradient(-45deg,#e4e4e7_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e4e4e7_75%),linear-gradient(-45deg,transparent_75%,#e4e4e7_75%)] bg-[length:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0] p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="解码图片" className="max-h-80 max-w-full object-contain" />
          </div>
        </figure>
      ) : null}
    </div>
  );
}

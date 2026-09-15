"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { rasterToSvg, svgFileName, SVG_PRESETS, type SvgPresetId } from "@/lib/image-to-svg";
import { btnClass, primaryBtnClass, selectClass } from "@/lib/styles";

export default function SvgPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const originalUrl = useRef<string | null>(null);
  const svgUrl = useRef<string | null>(null);

  const [preset, setPreset] = useState<SvgPresetId>("flat");
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [originalSrc, setOriginalSrc] = useState("");
  const [svg, setSvg] = useState("");
  const [svgSrc, setSvgSrc] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [dragging, setDragging] = useState(false);

  function revokeUrls() {
    if (originalUrl.current) URL.revokeObjectURL(originalUrl.current);
    if (svgUrl.current) URL.revokeObjectURL(svgUrl.current);
    originalUrl.current = null;
    svgUrl.current = null;
  }

  useEffect(() => () => revokeUrls(), []);

  const run = useCallback(async (nextFile: File, nextPreset: SvgPresetId) => {
    revokeUrls();
    const src = URL.createObjectURL(nextFile);
    originalUrl.current = src;
    setOriginalSrc(src);
    setFile(nextFile);
    setFileName(nextFile.name);
    setSvg("");
    setSvgSrc("");
    setError("");
    setBusy(true);
    try {
      const traced = await rasterToSvg(nextFile, nextPreset);
      if (svgUrl.current) URL.revokeObjectURL(svgUrl.current);
      const out = URL.createObjectURL(new Blob([traced], { type: "image/svg+xml" }));
      svgUrl.current = out;
      setSvg(traced);
      setSvgSrc(out);
    } catch (err) {
      setError(err instanceof Error ? err.message : "转换失败");
    } finally {
      setBusy(false);
    }
  }, []);

  function onFile(next?: File | null) {
    if (!next) return;
    void run(next, preset);
  }

  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const item = [...(e.clipboardData?.items ?? [])].find((it) => it.type.startsWith("image/"));
      const pasted = item?.getAsFile();
      if (pasted) {
        e.preventDefault();
        void run(pasted, preset);
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [preset, run]);

  function download() {
    if (!svg) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
    a.download = svgFileName(fileName);
    a.click();
  }

  async function copySvg() {
    if (!svg) return;
    await navigator.clipboard.writeText(svg);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  function reset() {
    revokeUrls();
    setFile(null);
    setFileName("");
    setOriginalSrc("");
    setSvg("");
    setSvgSrc("");
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">图片转 SVG</h1>
      <p className="mt-1 text-sm text-zinc-500">
        把 png / jpg 描成矢量 SVG，都在浏览器里做。图标、扁平插画效果最好；照片会简化成色块。Illustrator 的
        .ai 请先导出成图片。
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => inputRef.current?.click()} disabled={busy} className={primaryBtnClass}>
          选择图片
        </button>
        <select
          value={preset}
          disabled={busy}
          onChange={(e) => {
            const next = e.target.value as SvgPresetId;
            setPreset(next);
            if (file) void run(file, next);
          }}
          className={selectClass}
        >
          {SVG_PRESETS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}（{item.colors} 色）
            </option>
          ))}
        </select>
        <button type="button" onClick={download} disabled={!svg} className={btnClass}>
          下载 SVG
        </button>
        <button type="button" onClick={() => void copySvg()} disabled={!svg} className={btnClass}>
          {copied ? "已复制" : "复制代码"}
        </button>
        <button type="button" onClick={reset} disabled={busy} className={btnClass}>
          清空
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,.ai"
          className="hidden"
          onChange={(e) => {
            onFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        {busy ? <span className="text-sm text-zinc-500">正在描图…</span> : null}
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      {!originalSrc ? (
        <label
          className={`mt-6 block cursor-pointer rounded-2xl border border-dashed px-6 py-16 text-center ${
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
          把图片拖到这里，或点击选择。也可以在页面上粘贴。
        </label>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <figure className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
            <figcaption className="border-b border-zinc-100 px-4 py-2 text-xs text-zinc-400">原图</figcaption>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={originalSrc} alt="原图" className="max-h-80 w-full object-contain p-3" />
          </figure>
          <figure className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
            <figcaption className="border-b border-zinc-100 px-4 py-2 text-xs text-zinc-400">SVG</figcaption>
            {svgSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={svgSrc} alt="SVG 预览" className="max-h-80 w-full object-contain p-3" />
            ) : (
              <p className="px-4 py-16 text-center text-sm text-zinc-400">{busy ? "描图中…" : "还没有结果"}</p>
            )}
          </figure>
        </div>
      )}
    </div>
  );
}

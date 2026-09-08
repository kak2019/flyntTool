"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { btnClass, primaryBtnClass } from "@/lib/styles";

type Stage = "idle" | "loading" | "working" | "done" | "error";

export default function CutoutPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const originalUrl = useRef<string | null>(null);
  const resultUrl = useRef<string | null>(null);

  const [fileName, setFileName] = useState("");
  const [originalSrc, setOriginalSrc] = useState("");
  const [resultSrc, setResultSrc] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  function revokeUrls() {
    if (originalUrl.current) URL.revokeObjectURL(originalUrl.current);
    if (resultUrl.current) URL.revokeObjectURL(resultUrl.current);
    originalUrl.current = null;
    resultUrl.current = null;
  }

  useEffect(() => () => revokeUrls(), []);

  const runCutout = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("请选图片，jpg / png / webp 都可以。");
      setStage("error");
      return;
    }

    revokeUrls();
    const src = URL.createObjectURL(file);
    originalUrl.current = src;
    setOriginalSrc(src);
    setResultSrc("");
    setFileName(file.name.replace(/\.[^.]+$/, "") || "cutout");
    setError("");
    setStage("loading");
    setProgress("正在准备模型…");

    try {
      const { removeBackground } = await import("@imgly/background-removal");
      setStage("working");
      const blob = await removeBackground(file, {
        progress: (key, current, total) => {
          const pct = total > 0 ? Math.round((current / total) * 100) : 0;
          if (key.includes("fetch") || key.includes("download")) {
            setProgress(`正在下载模型 ${pct}%`);
          } else {
            setProgress(`正在抠图 ${pct}%`);
          }
        },
      });
      const out = URL.createObjectURL(blob);
      resultUrl.current = out;
      setResultSrc(out);
      setStage("done");
      setProgress("完成");
    } catch (err) {
      setStage("error");
      setError(err instanceof Error ? err.message : "抠图失败，换一张或刷新后再试。");
    }
  }, []);

  function onFile(file?: File | null) {
    if (!file) return;
    void runCutout(file);
  }

  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const item = [...(e.clipboardData?.items ?? [])].find((it) =>
        it.type.startsWith("image/"),
      );
      const file = item?.getAsFile();
      if (file) {
        e.preventDefault();
        void runCutout(file);
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [runCutout]);

  function download() {
    if (!resultSrc) return;
    const a = document.createElement("a");
    a.href = resultSrc;
    a.download = `${fileName}-cutout.png`;
    a.click();
  }

  function reset() {
    revokeUrls();
    setOriginalSrc("");
    setResultSrc("");
    setFileName("");
    setStage("idle");
    setProgress("");
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  const busy = stage === "loading" || stage === "working";

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">抠图去背景</h1>
      <p className="mt-1 text-sm text-zinc-500">
        上传或直接 Ctrl+V 粘贴。第一次会下载模型，之后都在浏览器里处理，图不会上传服务器。
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={primaryBtnClass}
          disabled={busy}
        >
          选择图片
        </button>
        <button type="button" onClick={download} disabled={!resultSrc} className={btnClass}>
          下载 PNG
        </button>
        <button type="button" onClick={reset} disabled={busy} className={btnClass}>
          清空
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            onFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        {progress ? <span className="text-sm text-zinc-500">{progress}</span> : null}
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
            <img src={originalSrc} alt="原图" className="max-h-[480px] w-full object-contain p-3" />
          </figure>
          <figure className="overflow-hidden rounded-2xl border border-zinc-200">
            <figcaption className="border-b border-zinc-100 bg-white px-4 py-2 text-xs text-zinc-400">
              透明底
            </figcaption>
            <div className="cutout-board flex min-h-40 items-center justify-center p-3">
              {resultSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={resultSrc} alt="抠图结果" className="max-h-[480px] w-full object-contain" />
              ) : (
                <p className="py-16 text-sm text-zinc-400">{busy ? progress || "处理中…" : "还没有结果"}</p>
              )}
            </div>
          </figure>
        </div>
      )}

      <style jsx>{`
        .cutout-board {
          background-color: #f4f4f5;
          background-image: linear-gradient(45deg, #e4e4e7 25%, transparent 25%),
            linear-gradient(-45deg, #e4e4e7 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #e4e4e7 75%),
            linear-gradient(-45deg, transparent 75%, #e4e4e7 75%);
          background-size: 20px 20px;
          background-position: 0 0, 0 10px, 10px -10px, -10px 0;
        }
      `}</style>
    </div>
  );
}

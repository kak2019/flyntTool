"use client";

import { useEffect, useRef, useState } from "react";
import { btnClass, primaryBtnClass } from "@/lib/styles";
import { flattenPatentFigures } from "@/lib/patent-figures";

type Stage = "idle" | "working" | "done" | "error";

export default function PatentFigPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const resultUrl = useRef<string | null>(null);
  const previewUrls = useRef<string[]>([]);

  const [fileName, setFileName] = useState("");
  const [downloadName, setDownloadName] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [previews, setPreviews] = useState<{ label: string; url: string }[]>([]);
  const [stats, setStats] = useState({ flattened: 0, skipped: 0 });

  function revoke() {
    if (resultUrl.current) URL.revokeObjectURL(resultUrl.current);
    for (const url of previewUrls.current) URL.revokeObjectURL(url);
    resultUrl.current = null;
    previewUrls.current = [];
  }

  useEffect(() => () => revoke(), []);

  async function onFile(file?: File | null) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".docx")) {
      setError("请上传 .docx 文件。");
      setStage("error");
      return;
    }

    revoke();
    setFileName(file.name);
    setDownloadName("");
    setPreviews([]);
    setError("");
    setStage("working");
    setProgress("开始处理…");

    try {
      const result = await flattenPatentFigures(file, setProgress);
      const url = URL.createObjectURL(result.blob);
      resultUrl.current = url;
      previewUrls.current = result.previews.map((p) => p.url);
      setPreviews(result.previews);
      setDownloadName(result.fileName);
      setStats({ flattened: result.flattened, skipped: result.skipped });
      setStage("done");
      setProgress(
        result.flattened
          ? `完成：合成 ${result.flattened} 张图，跳过 ${result.skipped} 张（本来就是嵌入、没有标号）`
          : "没有找到需要合成的浮动标号。",
      );
    } catch (err) {
      setStage("error");
      setError(err instanceof Error ? err.message : "处理失败");
    }
  }

  function download() {
    if (!resultUrl.current || !downloadName) return;
    const a = document.createElement("a");
    a.href = resultUrl.current;
    a.download = downloadName;
    a.click();
  }

  function reset() {
    revoke();
    setFileName("");
    setDownloadName("");
    setPreviews([]);
    setStage("idle");
    setProgress("");
    setError("");
    setStats({ flattened: 0, skipped: 0 });
    if (inputRef.current) inputRef.current.value = "";
  }

  const busy = stage === "working";

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">专利附图嵌入</h1>
      <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">
        把附图上的标号文本框、引线合成进图片，并改成嵌入型。正文里的「图 1」「图 2」标题不会进图。全程在浏览器里处理，文件不上传服务器。
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button type="button" className={primaryBtnClass} disabled={busy} onClick={() => inputRef.current?.click()}>
          选择 Word
        </button>
        <button type="button" className={btnClass} disabled={!resultUrl.current} onClick={download}>
          下载处理后的 docx
        </button>
        <button type="button" className={btnClass} disabled={busy} onClick={reset}>
          清空
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={(e) => {
            void onFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        {progress ? <span className="text-sm text-zinc-500">{progress}</span> : null}
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      {stage === "idle" || (!fileName && stage !== "working") ? (
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
            void onFile(e.dataTransfer.files?.[0]);
          }}
        >
          把申请文件 .docx 拖到这里，或点击上面选择。
        </label>
      ) : null}

      {fileName ? (
        <p className="mt-4 text-sm text-zinc-600">
          当前文件：{fileName}
          {stage === "done" ? ` · 合成 ${stats.flattened} 张，跳过 ${stats.skipped} 张` : null}
        </p>
      ) : null}

      {previews.length > 0 ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {previews.map((item) => (
            <figure key={item.url} className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
              <figcaption className="border-b border-zinc-100 px-4 py-2 text-xs text-zinc-400">{item.label}</figcaption>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.url} alt={item.label} className="max-h-[420px] w-full object-contain bg-zinc-50 p-3" />
            </figure>
          ))}
        </div>
      ) : null}
    </div>
  );
}

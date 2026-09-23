"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  MAX_PDF_MERGE_BYTES,
  MAX_PDF_MERGE_FILES,
  countPdfPages,
  mergePdfBuffers,
  mergedPdfName,
} from "@/lib/pdf-merge";
import { btnClass, primaryBtnClass } from "@/lib/styles";

type Item = {
  id: string;
  name: string;
  bytes: number;
  pages: number;
  data: ArrayBuffer;
};

function nextId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function PdfMergePage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const resultUrl = useRef<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [dragging, setDragging] = useState(false);
  const [reading, setReading] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [downloadName, setDownloadName] = useState("");
  const [mergedPages, setMergedPages] = useState(0);

  const totalBytes = useMemo(() => items.reduce((sum, item) => sum + item.bytes, 0), [items]);
  const totalPages = useMemo(() => items.reduce((sum, item) => sum + item.pages, 0), [items]);

  function revoke() {
    if (resultUrl.current) URL.revokeObjectURL(resultUrl.current);
    resultUrl.current = null;
  }

  useEffect(() => () => revoke(), []);

  function clearResult() {
    revoke();
    setDownloadName("");
    setMergedPages(0);
  }

  async function addFiles(list: FileList | File[] | null | undefined) {
    const files = list ? Array.from(list) : [];
    if (!files.length || working) return;
    setError("");
    clearResult();
    setReading(true);
    try {
      const added: Item[] = [];
      let used = items.length;
      let bytes = totalBytes;
      for (const file of files) {
        if (used >= MAX_PDF_MERGE_FILES) {
          setError(`最多 ${MAX_PDF_MERGE_FILES} 份 PDF`);
          break;
        }
        const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
        if (!isPdf) {
          setError(`${file.name} 不是 PDF`);
          continue;
        }
        if (bytes + file.size > MAX_PDF_MERGE_BYTES) {
          setError("文件合计超过 80MB");
          break;
        }
        try {
          const data = await file.arrayBuffer();
          const pages = await countPdfPages(file.name, data);
          added.push({
            id: nextId(),
            name: file.name || "未命名.pdf",
            bytes: file.size,
            pages,
            data,
          });
          used += 1;
          bytes += file.size;
        } catch (err) {
          setError(err instanceof Error ? err.message : "读取失败");
        }
      }
      if (added.length) setItems((cur) => [...cur, ...added].slice(0, MAX_PDF_MERGE_FILES));
    } finally {
      setReading(false);
    }
  }

  function move(id: string, dir: -1 | 1) {
    clearResult();
    setItems((cur) => {
      const index = cur.findIndex((item) => item.id === id);
      const next = index + dir;
      if (index < 0 || next < 0 || next >= cur.length) return cur;
      const copy = [...cur];
      const [item] = copy.splice(index, 1);
      copy.splice(next, 0, item);
      return copy;
    });
  }

  function remove(id: string) {
    clearResult();
    setItems((cur) => cur.filter((item) => item.id !== id));
  }

  function reset() {
    clearResult();
    setItems([]);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function merge() {
    if (items.length < 2 || working || reading) return;
    setError("");
    clearResult();
    setWorking(true);
    try {
      const result = await mergePdfBuffers(items.map(({ name, data }) => ({ name, data })));
      const blob = new Blob([result.bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      resultUrl.current = url;
      setDownloadName(mergedPdfName(items[0].name));
      setMergedPages(result.pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "合并失败");
    } finally {
      setWorking(false);
    }
  }

  function download() {
    if (!resultUrl.current || !downloadName) return;
    const a = document.createElement("a");
    a.href = resultUrl.current;
    a.download = downloadName;
    a.click();
  }

  const busy = reading || working;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">PDF 合并</h1>
      <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">
        按列表顺序把多份 PDF 的页面原样接在一起。版式不重排，文件只在浏览器里处理。
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button type="button" className={primaryBtnClass} disabled={busy} onClick={() => inputRef.current?.click()}>
          选择 PDF
        </button>
        <button type="button" className={btnClass} disabled={busy || items.length < 2} onClick={() => void merge()}>
          {working ? "合并中…" : "合并"}
        </button>
        <button type="button" className={btnClass} disabled={!resultUrl.current} onClick={download}>
          下载
        </button>
        <button type="button" className={btnClass} disabled={busy || items.length === 0} onClick={reset}>
          清空
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          className="hidden"
          onChange={(e) => {
            void addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        {reading ? <span className="text-sm text-zinc-500">正在读取…</span> : null}
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {downloadName ? (
        <p className="mt-3 text-sm text-zinc-600">
          已合并为 {downloadName}，共 {mergedPages} 页。
        </p>
      ) : null}

      {items.length === 0 ? (
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
            void addFiles(e.dataTransfer.files);
          }}
        >
          把 PDF 拖到这里，或点击上面选择。至少两份。
        </label>
      ) : (
        <div
          className={`mt-6 overflow-hidden rounded-2xl border bg-white ${
            dragging ? "border-teal-600" : "border-zinc-200"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void addFiles(e.dataTransfer.files);
          }}
        >
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-2 text-xs text-zinc-400">
            <span>
              {items.length} 份 · {totalPages} 页 · {formatSize(totalBytes)}
            </span>
            <span>上面的文件在前</span>
          </div>
          <ul>
            {items.map((item, index) => (
              <li key={item.id} className="flex items-center gap-2 border-b border-zinc-100 px-4 py-3 last:border-b-0">
                <span className="w-6 text-sm text-zinc-400">{index + 1}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-zinc-800" title={item.name}>
                  {item.name}
                </span>
                <span className="shrink-0 text-xs text-zinc-400">
                  {item.pages} 页 · {formatSize(item.bytes)}
                </span>
                <button type="button" className={btnClass} disabled={busy || index === 0} onClick={() => move(item.id, -1)}>
                  上移
                </button>
                <button
                  type="button"
                  className={btnClass}
                  disabled={busy || index === items.length - 1}
                  onClick={() => move(item.id, 1)}
                >
                  下移
                </button>
                <button type="button" className={btnClass} disabled={busy} onClick={() => remove(item.id)}>
                  移除
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

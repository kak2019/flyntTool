"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { translateText } from "@/lib/client-translate";
import { LANGUAGES, SOURCE_LANGUAGES } from "@/lib/languages";

type PageCache = {
  text: string;
  translation?: string;
};

export default function PdfPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfRef = useRef<PDFDocumentProxy | null>(null);
  const cacheRef = useRef<Map<number, PageCache>>(new Map());
  const translateSeq = useRef(0);

  const [fileName, setFileName] = useState("");
  const [pageCount, setPageCount] = useState(0);
  const [page, setPage] = useState(1);
  const [sourceText, setSourceText] = useState("");
  const [translation, setTranslation] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [sourceLang, setSourceLang] = useState("auto");
  const [targetLang, setTargetLang] = useState("Chinese");
  const pageRef = useRef(page);
  pageRef.current = page;

  useEffect(() => {
    if (!pdfRef.current || pageCount === 0) return;
    let cancelled = false;

    (async () => {
      setError("");
      const pdf = pdfRef.current!;
      const pdfPage = await pdf.getPage(page);
      if (cancelled) return;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const context = canvas.getContext("2d");
      if (!context) return;

      const outputScale = window.devicePixelRatio || 1;
      const viewport = pdfPage.getViewport({ scale: 1.3 });
      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      context.setTransform(outputScale, 0, 0, outputScale, 0, 0);
      await pdfPage.render({ canvasContext: context, viewport }).promise;
      if (cancelled) return;

      const cached = cacheRef.current.get(page);
      if (cached) {
        setSourceText(cached.text);
        setTranslation(cached.translation ?? "");
        if (!cached.translation && cached.text) {
          void runTranslate(page, cached.text);
        }
        return;
      }

      const content = await pdfPage.getTextContent();
      const text = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      cacheRef.current.set(page, { text });
      setSourceText(text);
      setTranslation("");
      if (text) void runTranslate(page, text);
    })().catch((err) => {
      if (!cancelled) setError(err instanceof Error ? err.message : "这一页渲染失败");
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageCount]);

  async function runTranslate(pageNumber: number, text: string) {
    const seq = ++translateSeq.current;
    setPending(true);
    setError("");
    try {
      const result = await translateText({
        text,
        sourceLang,
        targetLang,
        onDelta: (full) => {
          if (translateSeq.current === seq && pageRef.current === pageNumber) {
            setTranslation(full);
          }
        },
      });
      if (translateSeq.current !== seq) return;
      const entry = cacheRef.current.get(pageNumber);
      if (entry) entry.translation = result;
      if (pageRef.current === pageNumber) setTranslation(result);
    } catch (err) {
      if (translateSeq.current === seq && pageRef.current === pageNumber) {
        setError(err instanceof Error ? err.message : "翻译失败");
      }
    } finally {
      if (translateSeq.current === seq && pageRef.current === pageNumber) {
        setPending(false);
      }
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError("");
    setFileName(file.name);
    cacheRef.current = new Map();
    setTranslation("");
    setSourceText("");
    setPage(1);

    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    const data = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data }).promise;
    pdfRef.current = pdf;
    setPageCount(pdf.numPages);
  }

  function retry() {
    if (sourceText) {
      const entry = cacheRef.current.get(page);
      if (entry) entry.translation = undefined;
      void runTranslate(page, sourceText);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">PDF 对照翻译</h1>
          <p className="mt-1 text-sm text-zinc-500">
            PDF 只留在浏览器里。翻到哪页译哪页；扫描件抽不出文字。
          </p>
        </div>
        <label className="cursor-pointer rounded-xl bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800">
          选择 PDF
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <select
          value={sourceLang}
          onChange={(e) => setSourceLang(e.target.value)}
          className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
        >
          {SOURCE_LANGUAGES.map((lang) => (
            <option key={lang.id} value={lang.id}>
              {lang.label}
            </option>
          ))}
        </select>
        <span className="text-sm text-zinc-400">→</span>
        <select
          value={targetLang}
          onChange={(e) => setTargetLang(e.target.value)}
          className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.id} value={lang.id}>
              {lang.label}
            </option>
          ))}
        </select>
        {fileName ? (
          <span className="ml-auto truncate text-sm text-zinc-500">{fileName}</span>
        ) : null}
      </div>

      {!pageCount ? (
        <div
          className="mt-6 rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center text-zinc-500"
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
          }}
          onDrop={(e) => {
            e.preventDefault();
            void onFile(e.dataTransfer.files?.[0]);
          }}
        >
          把 PDF 拖到这里，或点右上角选择文件。
          <input
            type="file"
            accept="application/pdf"
            className="mx-auto mt-4 block"
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
        </div>
      ) : (
        <>
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-sm disabled:opacity-40"
            >
              上一页
            </button>
            <span className="text-sm text-zinc-600">
              {page} / {pageCount}
            </span>
            <button
              type="button"
              disabled={page >= pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-sm disabled:opacity-40"
            >
              下一页
            </button>
            <button
              type="button"
              onClick={retry}
              disabled={!sourceText || pending}
              className="ml-auto rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-40"
            >
              {pending ? "翻译中…" : "重新翻译"}
            </button>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="overflow-auto rounded-2xl border border-zinc-200 bg-zinc-100 p-3">
              <canvas ref={canvasRef} className="mx-auto block max-w-full bg-white shadow-sm" />
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-4">
              {!sourceText ? (
                <p className="text-sm text-amber-700">
                  这一页没有可提取的文字，可能是扫描件。第一期不做 OCR。
                </p>
              ) : (
                <>
                  <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                    本页译文
                  </p>
                  <div className="mt-2 min-h-48 whitespace-pre-wrap text-sm leading-7 text-zinc-800">
                    {translation || (pending ? "正在翻译…" : "")}
                  </div>
                </>
              )}
            </div>
          </div>
          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        </>
      )}
    </div>
  );
}

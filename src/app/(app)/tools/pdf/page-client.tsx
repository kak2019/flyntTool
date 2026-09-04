"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { translateText } from "@/lib/client-translate";
import { canvasToJpeg, ocrImage } from "@/lib/client-ocr";
import { MIN_TEXT_LAYER_CHARS, mergeLeaderFragments, textContentToText } from "@/lib/pdf-text";
import { LANGUAGES, SOURCE_LANGUAGES } from "@/lib/languages";
import { DocOutput } from "@/components/DocOutput";
import { htmlToPlainText, looksLikeHtml } from "@/lib/doc-html";
import { btnClass, primaryBtnClass, selectClass } from "@/lib/styles";

type PageCache = {
  text: string;
  translation?: string;
  via?: "text" | "ocr";
  ocrTried?: boolean;
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
  const [targetLang, setTargetLang] = useState("English");
  const [zoom, setZoom] = useState(1.3);
  const [showSource, setShowSource] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [ocrPending, setOcrPending] = useState(false);
  const [extractVia, setExtractVia] = useState<"text" | "ocr" | "">("");
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
      const viewport = pdfPage.getViewport({ scale: zoom });
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
        setExtractVia(cached.via ?? (cached.text ? "text" : ""));
        if (!cached.text && !cached.ocrTried) {
          await runOcr(page);
          return;
        }
        if (!cached.translation && cached.text) {
          void runTranslate(page, cached.text);
        }
        return;
      }

      const content = await pdfPage.getTextContent();
      const text = textContentToText(content.items);
      if (text.length >= MIN_TEXT_LAYER_CHARS) {
        cacheRef.current.set(page, { text, via: "text", ocrTried: false });
        setExtractVia("text");
        setSourceText(text);
        setTranslation("");
        void runTranslate(page, text);
        return;
      }

      cacheRef.current.set(page, { text, via: text ? "text" : undefined, ocrTried: false });
      setSourceText(text);
      setTranslation("");
      await runOcr(page, text);
    })().catch((err) => {
      if (!cancelled) setError(err instanceof Error ? err.message : "这一页渲染失败");
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageCount, zoom]);

  useEffect(() => {
    if (!pageCount) return;
    cacheRef.current.forEach((entry) => {
      entry.translation = undefined;
    });
    setTranslation("");
    if (sourceText) void runTranslate(page, sourceText);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceLang, targetLang]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (!pageCount) return;
      if (e.key === "ArrowLeft") setPage((p) => Math.max(1, p - 1));
      if (e.key === "ArrowRight") setPage((p) => Math.min(pageCount, p + 1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pageCount]);

  async function runTranslate(pageNumber: number, text: string) {
    const seq = ++translateSeq.current;
    setPending(true);
    setError("");
    try {
      const result = mergeLeaderFragments(
        await translateText({
          text,
          sourceLang,
          targetLang,
          preserveLayout: true,
          onDelta: (full) => {
            if (translateSeq.current === seq && pageRef.current === pageNumber) {
              setTranslation(mergeLeaderFragments(full));
            }
          },
        }),
      );
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
    if (file.type && file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("请选择 PDF 文件");
      return;
    }
    setError("");
    setFileName(file.name);
    cacheRef.current = new Map();
    setTranslation("");
    setSourceText("");
    setExtractVia("");
    setPage(1);

    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    const data = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data }).promise;
    pdfRef.current = pdf;
    setPageCount(pdf.numPages);
  }

  async function runOcr(pageNumber: number, existing = "") {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setOcrPending(true);
    setError("");
    try {
      const image = await canvasToJpeg(canvas);
      const text = await ocrImage(image);
      const used = text || existing;
      const entry = cacheRef.current.get(pageNumber) ?? { text: "" };
      entry.text = used;
      entry.via = text ? "ocr" : entry.via;
      entry.ocrTried = true;
      entry.translation = undefined;
      cacheRef.current.set(pageNumber, entry);
      if (pageRef.current === pageNumber) {
        setSourceText(used);
        setExtractVia(text ? "ocr" : entry.via ?? "");
        setTranslation("");
      }
      if (used) void runTranslate(pageNumber, used);
      else if (pageRef.current === pageNumber) {
        setError("这一页没有识别出文字。手写太潦草时可能失败。");
      }
    } catch (err) {
      const entry = cacheRef.current.get(pageNumber);
      if (entry) entry.ocrTried = true;
      if (pageRef.current === pageNumber) {
        setError(err instanceof Error ? err.message : "OCR 失败");
      }
    } finally {
      if (pageRef.current === pageNumber) setOcrPending(false);
    }
  }

  function retry() {
    if (sourceText) {
      const entry = cacheRef.current.get(page);
      if (entry) entry.translation = undefined;
      void runTranslate(page, sourceText);
    }
  }

  async function copyTranslation() {
    if (!translation) return;
    const text = looksLikeHtml(translation)
      ? htmlToPlainText(translation)
      : translation;
    await navigator.clipboard.writeText(text);
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">PDF 对照翻译</h1>
          <p className="mt-1 text-sm text-zinc-500">
            文件只留在浏览器。尽量保留换行；扫描件和手写会自动 OCR。
          </p>
        </div>
        <label className={primaryBtnClass + " cursor-pointer"}>
          {fileName ? "换一个 PDF" : "选择 PDF"}
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              void onFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      <div className="mt-4 flex items-center gap-2 whitespace-nowrap">
        <select
          value={sourceLang}
          onChange={(e) => setSourceLang(e.target.value)}
          className={selectClass}
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
          className={selectClass}
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
          把 PDF 拖到这里，或点击选择文件
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              void onFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className={btnClass}
            >
              上一页
            </button>
            <span className="flex items-center gap-1 text-sm text-zinc-600">
              <input
                type="number"
                min={1}
                max={pageCount}
                value={page}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (!Number.isFinite(n)) return;
                  setPage(Math.min(pageCount, Math.max(1, Math.round(n))));
                }}
                className="w-16 rounded-lg border border-zinc-200 px-2 py-1 text-center"
              />
              / {pageCount}
            </span>
            <button
              type="button"
              disabled={page >= pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              className={btnClass}
            >
              下一页
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.8, Number((z - 0.2).toFixed(1))))}
              className={btnClass}
            >
              缩小
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(2.4, Number((z + 0.2).toFixed(1))))}
              className={btnClass}
            >
              放大
            </button>
            <button type="button" onClick={() => setShowSource((v) => !v)} className={btnClass}>
              {showSource ? "只看译文" : "对照抽出的原文"}
            </button>
            <button
              type="button"
              onClick={() => void runOcr(page, sourceText)}
              disabled={ocrPending || pending}
              className={btnClass}
            >
              {ocrPending ? "识别中…" : "OCR 本页"}
            </button>
            <button
              type="button"
              onClick={retry}
              disabled={!sourceText || pending || ocrPending}
              className={`ml-auto ${btnClass}`}
            >
              {pending ? "翻译中…" : "重新翻译"}
            </button>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="max-h-[75vh] overflow-auto rounded-2xl border border-zinc-200 bg-zinc-100 p-3">
              <canvas ref={canvasRef} className="mx-auto block max-w-full bg-white shadow-sm" />
            </div>
            <div className="max-h-[75vh] overflow-auto rounded-2xl border border-zinc-200 bg-white p-4">
              {!sourceText ? (
                <p className="text-sm text-amber-700">
                  {ocrPending
                    ? "正在用 OCR 识别这一页…"
                    : "这一页没有识别出文字。可以点「OCR 本页」再试。"}
                </p>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                      本页译文
                      {extractVia === "ocr"
                        ? " · OCR"
                        : extractVia === "text"
                          ? " · 文字层"
                          : ""}
                    </p>
                    <button
                      type="button"
                      onClick={() => void copyTranslation()}
                      disabled={!translation}
                      className="text-sm text-teal-700 disabled:text-zinc-300"
                    >
                      复制
                    </button>
                  </div>
                  <div className="mt-2 min-h-48">
                    {translation ? (
                      <DocOutput text={translation} />
                    ) : pending ? (
                      <p className="text-sm text-zinc-500">正在翻译…</p>
                    ) : null}
                  </div>
                  {showSource ? (
                    <div className="mt-4 border-t border-zinc-100 pt-4">
                      <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                        抽出的原文
                      </p>
                      <div className="mt-2">
                        <DocOutput text={sourceText} className="text-zinc-500" />
                      </div>
                    </div>
                  ) : null}
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

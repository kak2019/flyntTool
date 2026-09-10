"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { generateQrDataUrl, imageToImageData, loadImageFile, scanQrFromImageData, type QrLevel } from "@/lib/qr";
import { btnClass, fieldClass, primaryBtnClass, selectClass } from "@/lib/styles";

const LEVELS: { id: QrLevel; label: string }[] = [
  { id: "L", label: "L 7%" },
  { id: "M", label: "M 15%" },
  { id: "Q", label: "Q 25%" },
  { id: "H", label: "H 30%" },
];

export default function QrPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const scanUrl = useRef<string | null>(null);

  const [text, setText] = useState("");
  const [level, setLevel] = useState<QrLevel>("M");
  const [qrSrc, setQrSrc] = useState("");
  const [qrError, setQrError] = useState("");
  const [scanSrc, setScanSrc] = useState("");
  const [scanText, setScanText] = useState("");
  const [scanError, setScanError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const value = text.trim();
    if (!value) {
      setQrSrc("");
      setQrError("");
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void generateQrDataUrl(value, { size: 360, level })
        .then((url) => {
          if (!cancelled) {
            setQrSrc(url);
            setQrError("");
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setQrSrc("");
            setQrError(err instanceof Error ? err.message : "生成失败");
          }
        });
    }, 120);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [text, level]);

  useEffect(() => () => {
    if (scanUrl.current) URL.revokeObjectURL(scanUrl.current);
  }, []);

  const onScanFile = useCallback(async (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setScanError("请选图片。");
      return;
    }
    if (scanUrl.current) URL.revokeObjectURL(scanUrl.current);
    const src = URL.createObjectURL(file);
    scanUrl.current = src;
    setScanSrc(src);
    setScanText("");
    setScanError("");
    setScanning(true);
    try {
      const img = await loadImageFile(file);
      const data = imageToImageData(img);
      const found = scanQrFromImageData(data);
      if (found == null) setScanError("没认出二维码，换一张更清楚的试试。");
      else setScanText(found);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "识别失败");
    } finally {
      setScanning(false);
    }
  }, []);

  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const item = [...(e.clipboardData?.items ?? [])].find((it) => it.type.startsWith("image/"));
      const file = item?.getAsFile();
      if (file) {
        e.preventDefault();
        void onScanFile(file);
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [onScanFile]);

  function download() {
    if (!qrSrc) return;
    const a = document.createElement("a");
    a.href = qrSrc;
    a.download = "qr.png";
    a.click();
  }

  async function copyScan() {
    if (!scanText) return;
    await navigator.clipboard.writeText(scanText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">二维码</h1>
      <p className="mt-1 text-sm text-zinc-500">左边写内容生成，右边上传或粘贴图片识别。</p>

      <div className="mt-5 grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="text-sm font-medium">生成</h2>
          <label className="mt-3 block">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              spellCheck={false}
              placeholder="链接、文本、Wi-Fi 都行"
              className={`${fieldClass} min-h-32 resize-y p-4 text-sm leading-6`}
            />
          </label>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value as QrLevel)}
              className={selectClass}
            >
              {LEVELS.map((row) => (
                <option key={row.id} value={row.id}>
                  容错 {row.label}
                </option>
              ))}
            </select>
            <button type="button" onClick={download} disabled={!qrSrc} className={primaryBtnClass}>
              下载 PNG
            </button>
            <button type="button" onClick={() => setText("")} className={btnClass}>
              清空
            </button>
          </div>
          {qrError ? <p className="mt-3 text-sm text-red-600">{qrError}</p> : null}
          {qrSrc ? (
            <figure className="mt-4 inline-block overflow-hidden rounded-2xl border border-zinc-200 bg-white p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrSrc} alt="二维码" className="h-64 w-64" />
            </figure>
          ) : (
            <div className="mt-4 flex h-64 w-64 items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white text-sm text-zinc-400">
              二维码会出现在这里
            </div>
          )}
        </section>

        <section>
          <h2 className="text-sm font-medium">识别</h2>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => fileRef.current?.click()} className={primaryBtnClass}>
              选择图片
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                void onScanFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            {scanning ? <span className="text-sm text-zinc-500">识别中…</span> : null}
          </div>
          <label
            className={`mt-3 block cursor-pointer rounded-2xl border border-dashed px-6 py-10 text-center text-sm ${
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
              void onScanFile(e.dataTransfer.files?.[0]);
            }}
          >
            {scanSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={scanSrc} alt="待识别" className="mx-auto max-h-48 object-contain" />
            ) : (
              "把图片拖到这里，或在页面上 Ctrl+V"
            )}
          </label>
          {scanError ? <p className="mt-3 text-sm text-red-600">{scanError}</p> : null}
          {scanText ? (
            <div className="mt-3">
              <div className="mb-1.5 flex items-center justify-between text-sm font-medium">
                内容
                <button type="button" onClick={() => void copyScan()} className="font-normal text-teal-700">
                  {copied ? "已复制" : "复制"}
                </button>
              </div>
              <textarea
                value={scanText}
                readOnly
                rows={5}
                className={`${fieldClass} resize-y p-4 font-mono text-[13px] leading-6`}
              />
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

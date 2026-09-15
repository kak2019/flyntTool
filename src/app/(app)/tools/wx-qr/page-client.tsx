"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { imageToImageData, loadImageFile, scanQrFromImageData } from "@/lib/qr";
import { btnClass, primaryBtnClass } from "@/lib/styles";

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("读文件失败"));
    reader.readAsDataURL(file);
  });
}

const DIRECT_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

function isProbablyImage(file: File) {
  if (file.type.startsWith("image/")) return true;
  return /\.(png|jpe?g|webp|gif|heic|heif)$/i.test(file.name);
}

async function toUploadDataUrl(file: File) {
  if (DIRECT_TYPES.has(file.type)) return fileToDataUrl(file);
  const img = await loadImageFile(file);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("无法转换图片");
  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.92);
}

function looksLikeWechat(text: string) {
  return /weixin\.qq\.com|weixin:\/\//i.test(text);
}

export default function WxQrPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrl = useRef<string | null>(null);

  const [configured, setConfigured] = useState<boolean | null>(null);
  const [liveUrl, setLiveUrl] = useState("");
  const [liveSrc, setLiveSrc] = useState("");
  const [lastModified, setLastModified] = useState("");
  const [preview, setPreview] = useState("");
  const [payload, setPayload] = useState("");
  const [scanNote, setScanNote] = useState("");
  const [dataUrl, setDataUrl] = useState("");
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState("");

  function revokePreview() {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = null;
  }

  useEffect(() => () => revokePreview(), []);

  const loadLive = useCallback(async () => {
    const res = await fetch("/api/oss-qr");
    const data = (await res.json()) as {
      configured?: boolean;
      url?: string;
      exists?: boolean;
      lastModified?: string;
    };
    setConfigured(Boolean(data.configured));
    const url = data.url || "";
    setLiveUrl(url);
    setLastModified(data.lastModified || "");
    setLiveSrc(data.configured && data.exists ? `/api/oss-qr/image?t=${Date.now()}` : "");
  }, []);

  useEffect(() => {
    void loadLive().catch(() => setConfigured(false));
  }, [loadLive]);

  const onFile = useCallback(async (file?: File | null) => {
    if (!file || !isProbablyImage(file)) {
      setError("请选图片，相册或文件都可以。");
      return;
    }
    setError("");
    setStatus("");
    setPayload("");
    setScanNote("");
    revokePreview();
    const src = URL.createObjectURL(file);
    previewUrl.current = src;
    setPreview(src);
    try {
      setDataUrl(await toUploadDataUrl(file));
      const img = await loadImageFile(file);
      const found = scanQrFromImageData(imageToImageData(img));
      if (!found) {
        setScanNote("没认出二维码，仍可上传；建议换一张更清楚的群码截图。");
        return;
      }
      setPayload(found);
      setScanNote(
        looksLikeWechat(found) ? "识别到微信链接，可以覆盖 OSS。" : "认出二维码了，但不像微信群码，请确认后再传。",
      );
    } catch {
      setScanNote("图片打不开或无法识别。");
    }
  }, []);

  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const item = [...(e.clipboardData?.items ?? [])].find((it) => it.type.startsWith("image/"));
      const file = item?.getAsFile();
      if (file) {
        e.preventDefault();
        void onFile(file);
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [onFile]);

  async function publish() {
    if (!dataUrl || busy) return;
    setBusy(true);
    setError("");
    setStatus("");
    try {
      const res = await fetch("/api/oss-qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; url?: string };
      if (!res.ok) throw new Error(data.error || `上传失败（${res.status}）`);
      setStatus("已覆盖 OSS 上的固定图片。");
      if (data.url) setLiveUrl(data.url);
      setLiveSrc(`/api/oss-qr/image?t=${Date.now()}`);
      setLastModified(new Date().toISOString());
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传失败");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    revokePreview();
    setPreview("");
    setDataUrl("");
    setPayload("");
    setScanNote("");
    setError("");
    setStatus("");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function copyUrl() {
    if (!liveUrl) return;
    await navigator.clipboard.writeText(liveUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">微信群码</h1>
      <p className="mt-1 text-sm text-zinc-500">
        从微信保存最新群二维码，上传后覆盖 OSS 上的同一张图。手机点「选择图片」可从相册或文件里选。
      </p>

      {configured === false ? (
        <p className="mt-4 text-sm text-red-600">
          还没配 OSS。在 <code className="rounded bg-zinc-100 px-1">.env.local</code> 填
          OSS_ACCESS_KEY_ID、OSS_ACCESS_KEY_SECRET、OSS_BUCKET、OSS_REGION、OSS_OBJECT_KEY。
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <label className={`${primaryBtnClass} inline-flex cursor-pointer items-center ${busy ? "pointer-events-none opacity-50" : ""}`}>
          选择图片
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={busy}
            onChange={(e) => {
              void onFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
        <button type="button" onClick={() => void publish()} disabled={!dataUrl || busy || configured === false} className={btnClass}>
          {busy ? "上传中…" : "覆盖到 OSS"}
        </button>
        <button type="button" onClick={reset} disabled={busy} className={btnClass}>
          清空
        </button>
        {status ? <span className="text-sm text-teal-700">{status}</span> : null}
      </div>

      {liveUrl ? (
        <p className="mt-3 text-sm text-zinc-600">
          固定地址
          <button type="button" onClick={() => void copyUrl()} className="ml-2 text-teal-700">
            {copied ? "已复制" : "复制"}
          </button>
          <span className="ml-2 break-all text-zinc-500">{liveUrl}</span>
          {lastModified ? (
            <span className="ml-2 text-xs text-zinc-400">上次 {lastModified}</span>
          ) : null}
        </p>
      ) : null}

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {scanNote ? <p className="mt-3 text-sm text-zinc-500">{scanNote}</p> : null}
      {payload ? (
        <p className="mt-1 break-all font-mono text-xs text-zinc-400">{payload}</p>
      ) : null}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {!preview ? (
          <label
            className={`block cursor-pointer rounded-2xl border border-dashed px-6 py-16 text-center ${
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
            onClick={() => inputRef.current?.click()}
          >
            点这里从相册或文件选择群码，也可以把图片拖进来。
          </label>
        ) : (
          <figure className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
            <figcaption className="border-b border-zinc-100 px-4 py-2 text-xs text-zinc-400">待上传</figcaption>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="待上传群码" className="max-h-80 w-full object-contain p-3" />
          </figure>
        )}
        <figure className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
          <figcaption className="border-b border-zinc-100 px-4 py-2 text-xs text-zinc-400">OSS 当前图</figcaption>
          {liveSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={liveSrc} alt="OSS 当前群码" className="max-h-80 w-full object-contain p-3" />
          ) : (
            <p className="px-4 py-16 text-center text-sm text-zinc-400">还没有文件，或无法读取。</p>
          )}
        </figure>
      </div>
    </div>
  );
}

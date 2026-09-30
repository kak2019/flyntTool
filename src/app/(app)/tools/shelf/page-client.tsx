"use client";

import { DragEvent, useCallback, useEffect, useRef, useState } from "react";
import { btnClass, primaryBtnClass, selectClass } from "@/lib/styles";

type ShelfFile = {
  key: string;
  name: string;
  size: number;
  expiresAt: number;
  uploadedAt: string;
};

const HOURS = [
  { value: 1, label: "1 小时" },
  { value: 6, label: "6 小时" },
  { value: 24, label: "1 天" },
  { value: 72, label: "3 天" },
  { value: 168, label: "7 天" },
];

function formatSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function formatWhen(sec: number) {
  return new Date(sec * 1000).toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Shanghai",
  });
}

export default function ShelfPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [files, setFiles] = useState<ShelfFile[]>([]);
  const [hours, setHours] = useState(24);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/shelf");
    const data = (await res.json()) as { configured?: boolean; files?: ShelfFile[]; error?: string };
    if (!res.ok) throw new Error(data.error || "读取失败");
    setConfigured(Boolean(data.configured));
    setFiles(data.files ?? []);
  }, []);

  useEffect(() => {
    void load().catch((err: unknown) => setError(err instanceof Error ? err.message : "读取失败"));
  }, [load]);

  async function upload(list: FileList | File[]) {
    const batch = [...list];
    if (!batch.length) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      for (const file of batch) {
        const body = new FormData();
        body.set("file", file);
        body.set("hours", String(hours));
        const res = await fetch("/api/shelf", { method: "POST", body });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error || `${file.name} 上传失败`);
      }
      setNotice(batch.length === 1 ? "已放上文件架" : `已放上 ${batch.length} 个文件`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传失败");
    } finally {
      setBusy(false);
    }
  }

  async function shareUrl(key: string) {
    const res = await fetch("/api/shelf/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    const data = (await res.json()) as { url?: string; error?: string };
    if (!res.ok || !data.url) throw new Error(data.error || "生成链接失败");
    return data.url;
  }

  async function copyShare(key: string) {
    setError("");
    setNotice("");
    try {
      const url = await shareUrl(key);
      await navigator.clipboard.writeText(url);
      setNotice("分享链接已复制。对方不用登录，到期后打不开。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "复制失败");
    }
  }

  async function download(key: string) {
    setError("");
    try {
      const url = await shareUrl(key);
      window.open(url, "_blank", "noopener");
    } catch (err) {
      setError(err instanceof Error ? err.message : "下载失败");
    }
  }

  async function remove(file: ShelfFile) {
    if (!window.confirm(`删除「${file.name}」？分享链接也会失效。`)) return;
    setError("");
    setNotice("");
    const res = await fetch("/api/shelf", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: file.key }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(data.error || "删除失败");
      return;
    }
    setFiles((cur) => cur.filter((item) => item.key !== file.key));
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (busy || configured === false) return;
    void upload(e.dataTransfer.files);
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">临时文件架</h1>
      <p className="mt-1 text-sm text-zinc-500">
        文件放在 OSS 的 flyntpan，和微信群码的 linchangweb 分开，别人猜不到地址。到期后分享链接失效，文件会从 OSS 删掉。删掉后，已经发出的链接也打不开。
      </p>

      {configured === false ? (
        <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          还没配文件架的 OSS。需要 OSS_ACCESS_KEY_ID、OSS_ACCESS_KEY_SECRET、OSS_SHELF_BUCKET、OSS_SHELF_REGION。
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <label className="text-sm text-zinc-600" htmlFor="shelf-hours">
          保留
        </label>
        <select
          id="shelf-hours"
          className={selectClass}
          value={hours}
          disabled={busy || configured === false}
          onChange={(e) => setHours(Number(e.target.value))}
        >
          {HOURS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className={primaryBtnClass}
          disabled={busy || configured === false}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? "上传中…" : "选择文件"}
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            const picked = e.target.files;
            if (picked?.length) void upload(picked);
            e.target.value = "";
          }}
        />
      </div>

      <div
        className={`mt-3 rounded-2xl border border-dashed px-4 py-8 text-center text-sm text-zinc-500 ${
          dragging ? "border-teal-700 bg-teal-50" : "border-zinc-300"
        }`}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        把文件拖进来，单个不超过 20MB
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {notice ? <p className="mt-3 text-sm text-teal-800">{notice}</p> : null}

      <ul className="mt-6 divide-y divide-zinc-200 rounded-2xl border border-zinc-200">
        {files.length === 0 ? (
          <li className="px-4 py-6 text-sm text-zinc-500">文件架是空的。</li>
        ) : (
          files.map((file) => (
            <li key={file.key} className="flex flex-wrap items-center gap-2 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-zinc-500">
                  {formatSize(file.size)} · {formatWhen(file.expiresAt)} 到期
                </p>
              </div>
              <button type="button" className={btnClass} onClick={() => void download(file.key)}>
                下载
              </button>
              <button type="button" className={btnClass} onClick={() => void copyShare(file.key)}>
                复制分享链接
              </button>
              <button type="button" className={btnClass} onClick={() => void remove(file)}>
                删除
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

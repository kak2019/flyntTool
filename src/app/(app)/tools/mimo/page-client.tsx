"use client";

import { ClipboardEvent, DragEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { chatMimo } from "@/lib/client-mimo";
import { readMimoFile } from "@/lib/client-mimo-files";
import { MAX_MIMO_ATTACHMENTS, MAX_MIMO_CHARS } from "@/lib/limits";
import { markdownToHtml } from "@/lib/markdown";
import {
  MIMO_MODELS,
  addMimoUsage,
  emptyMimoUsage,
  type MimoAttachment,
  type MimoChatMessage,
  type MimoModelId,
  type MimoUsage,
} from "@/lib/mimo";
import { btnClass, fieldClass, primaryBtnClass, selectClass } from "@/lib/styles";

const USAGE_KEY = "flynt-mimo-usage-v1";
const FILE_ACCEPT = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/bmp",
  "application/pdf",
  "text/plain",
  "text/markdown",
  "application/json",
  "text/csv",
  ".txt",
  ".md",
  ".json",
  ".csv",
  ".xml",
  ".html",
  ".js",
  ".ts",
  ".py",
  ".yml",
  ".yaml",
  ".log",
].join(",");

function loadUsage(): MimoUsage {
  try {
    const raw = sessionStorage.getItem(USAGE_KEY);
    if (!raw) return emptyMimoUsage();
    const parsed = JSON.parse(raw) as Partial<MimoUsage>;
    return {
      prompt: Number(parsed.prompt) || 0,
      completion: Number(parsed.completion) || 0,
      reasoning: Number(parsed.reasoning) || 0,
      total: Number(parsed.total) || 0,
      search: Number(parsed.search) || 0,
    };
  } catch {
    return emptyMimoUsage();
  }
}

function formatNum(n: number) {
  return n.toLocaleString("zh-CN");
}

function forApi(messages: ChatItem[]): MimoChatMessage[] {
  const lastUser = messages.findLastIndex((item) => item.role === "user");
  return messages.map((item, i) => ({
    role: item.role,
    content: item.content,
    reasoning: item.reasoning,
    attachments:
      item.role === "user" && item.attachments?.length
        ? i === lastUser
          ? item.attachments
          : item.attachments.map((att) =>
              att.kind === "image" ? { ...att, dataUrl: undefined } : att,
            )
        : undefined,
  }));
}

type ChatItem = MimoChatMessage & { pending?: boolean };

function waitingText(item: ChatItem, waitSec: number) {
  if (item.sources?.length) return "已找到来源，正在回答…";
  if (waitSec >= 8) return `上游排队中（已等 ${waitSec} 秒），多半是小米并发满了`;
  if (waitSec >= 3) return `正在等待小米接口（${waitSec} 秒）…`;
  return "正在回答…";
}

function Bubble({ item, waitSec }: { item: ChatItem; waitSec: number }) {
  const html = useMemo(
    () => (item.role === "assistant" ? markdownToHtml(item.content) : ""),
    [item.content, item.role],
  );
  const images = item.attachments?.filter((att) => att.kind === "image" && att.dataUrl) ?? [];
  const files = item.attachments?.filter((att) => att.kind === "file") ?? [];

  if (item.role === "user") {
    return (
      <div className="ml-auto max-w-[85%] rounded-2xl bg-teal-700 px-4 py-3 text-sm leading-6 text-white">
        {images.length ? (
          <div className="mb-2 flex flex-wrap gap-2">
            {images.map((img) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={img.id}
                src={img.dataUrl}
                alt={img.name}
                className="max-h-40 max-w-full rounded-lg"
              />
            ))}
          </div>
        ) : null}
        {files.length ? (
          <ul className="mb-2 space-y-1 text-xs text-teal-100">
            {files.map((file) => (
              <li key={file.id}>{file.name}</li>
            ))}
          </ul>
        ) : null}
        {item.content ? <p className="whitespace-pre-wrap">{item.content}</p> : null}
      </div>
    );
  }

  return (
    <div className="mr-auto max-w-[85%] rounded-2xl border border-zinc-200 bg-white px-4 py-3">
      {item.reasoning ? (
        <details className="mb-2 rounded-xl bg-zinc-50 px-3 py-2 text-xs leading-5 text-zinc-500" open={item.pending && !item.content}>
          <summary className="cursor-pointer select-none text-zinc-400">思考过程</summary>
          <p className="mt-1 whitespace-pre-wrap">{item.reasoning}</p>
        </details>
      ) : null}
      {html ? (
        <div className="doc-html text-sm leading-7 text-zinc-800" dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <p className="text-sm text-zinc-400">
          {item.pending ? waitingText(item, waitSec) : "没有内容"}
        </p>
      )}
      {item.sources?.length ? (
        <div className="mt-3 border-t border-zinc-100 pt-2">
          <p className="mb-1 text-xs text-zinc-400">来源</p>
          <ul className="space-y-1">
            {item.sources.map((src) => (
              <li key={src.url}>
                <a
                  href={src.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-xs text-teal-700 hover:underline"
                >
                  {src.site ? `${src.site} · ` : ""}
                  {src.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export default function MimoPage() {
  const [model, setModel] = useState<MimoModelId>("mimo-v2.6-pro-ultraspeed");
  const [thinking, setThinking] = useState(false);
  const [search, setSearch] = useState(true);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<MimoAttachment[]>([]);
  const [reading, setReading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [pending, setPending] = useState(false);
  const [waitSec, setWaitSec] = useState(0);
  const [error, setError] = useState("");
  const [lastUsage, setLastUsage] = useState<MimoUsage | null>(null);
  const [totalUsage, setTotalUsage] = useState<MimoUsage | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const sendAnchorRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pinToSend = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const dragCount = useRef(0);

  const count = useMemo(() => input.trim().length, [input]);
  const overLimit = count > MAX_MIMO_CHARS;
  const canSend = (count > 0 || attachments.length > 0) && !pending && !overLimit && !reading;

  useEffect(() => {
    if (!pinToSend.current) return;
    pinToSend.current = false;
    const box = listRef.current;
    const anchor = sendAnchorRef.current;
    if (!box || !anchor) return;
    box.scrollTop += anchor.getBoundingClientRect().top - box.getBoundingClientRect().top - 8;
  }, [messages.length]);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    setTotalUsage(loadUsage());
  }, []);

  useEffect(() => {
    if (!totalUsage) return;
    sessionStorage.setItem(USAGE_KEY, JSON.stringify(totalUsage));
  }, [totalUsage]);

  useEffect(() => {
    if (!pending) {
      setWaitSec(0);
      return;
    }
    const start = Date.now();
    const id = window.setInterval(() => setWaitSec(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => window.clearInterval(id);
  }, [pending]);

  async function addFiles(list: FileList | File[] | null | undefined) {
    const files = list ? Array.from(list) : [];
    if (!files.length || pending) return;
    setError("");
    setReading(true);
    try {
      const added: MimoAttachment[] = [];
      const room = Math.max(0, MAX_MIMO_ATTACHMENTS - attachments.length);
      if (room <= 0) {
        setError(`最多 ${MAX_MIMO_ATTACHMENTS} 个附件`);
        return;
      }
      if (files.length > room) setError(`最多 ${MAX_MIMO_ATTACHMENTS} 个附件`);
      for (const file of files.slice(0, room)) {
        try {
          added.push(await readMimoFile(file));
        } catch (err) {
          setError(err instanceof Error ? err.message : "文件读取失败");
        }
      }
      if (added.length) setAttachments((cur) => [...cur, ...added].slice(0, MAX_MIMO_ATTACHMENTS));
    } finally {
      setReading(false);
    }
  }

  function removeAttachment(id: string) {
    setAttachments((cur) => cur.filter((item) => item.id !== id));
  }

  async function send() {
    if (!canSend) return;
    const text = input.trim();
    const atts = attachments;
    if (!text && !atts.length) return;
    const nextMessages: ChatItem[] = [
      ...messages,
      { role: "user", content: text, attachments: atts.length ? atts : undefined },
    ];
    setInput("");
    setAttachments([]);
    setError("");
    setPending(true);
    pinToSend.current = true;
    setMessages([...nextMessages, { role: "assistant", content: "", pending: true }]);

    const ac = new AbortController();
    abortRef.current = ac;
    let gotDelta = false;
    let timedOut = false;
    const timeout = window.setTimeout(() => {
      if (!gotDelta) {
        timedOut = true;
        ac.abort();
      }
    }, 90_000);

    try {
      const result = await chatMimo({
        messages: forApi(nextMessages),
        model,
        thinking,
        search,
        signal: ac.signal,
        onDelta: (state) => {
          gotDelta = true;
          window.clearTimeout(timeout);
          setMessages([
            ...nextMessages,
            {
              role: "assistant",
              content: state.content,
              reasoning: state.reasoning,
              sources: state.sources,
              pending: true,
            },
          ]);
        },
      });
      window.clearTimeout(timeout);
      if (result.usage) {
        setLastUsage(result.usage);
        setTotalUsage((cur) => addMimoUsage(cur ?? emptyMimoUsage(), result.usage!));
      }
      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: result.content,
          reasoning: result.reasoning,
          sources: result.sources,
        },
      ]);
    } catch (err) {
      window.clearTimeout(timeout);
      if (ac.signal.aborted) {
        setMessages((cur) =>
          cur.map((item, i) =>
            i === cur.length - 1 && item.role === "assistant"
              ? {
                  ...item,
                  pending: false,
                  content: item.content || "（已停止）",
                }
              : item,
          ),
        );
        if (!gotDelta) {
          setError(
            timedOut
              ? "等了 90 秒还没出字。小米那边多半在排队（账号并发满了），稍后再发，或先关掉联网搜索。"
              : "",
          );
        }
        return;
      }
      setError(err instanceof Error ? err.message : "请求失败");
      setMessages((cur) => {
        const last = cur[cur.length - 1];
        if (last?.role === "assistant" && (last.content || last.reasoning || last.sources?.length)) {
          return cur.map((item, i) => (i === cur.length - 1 ? { ...item, pending: false } : item));
        }
        return nextMessages;
      });
    } finally {
      window.clearTimeout(timeout);
      abortRef.current = null;
      setPending(false);
    }
  }

  function stop() {
    abortRef.current?.abort();
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  function onPaste(e: ClipboardEvent<HTMLTextAreaElement>) {
    const files = Array.from(e.clipboardData?.items ?? [])
      .filter((item) => item.kind === "file")
      .map((item) => item.getAsFile())
      .filter((file): file is File => Boolean(file));
    if (!files.length) return;
    e.preventDefault();
    void addFiles(files);
  }

  function onDragEnter(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    dragCount.current += 1;
    setDragging(true);
  }

  function onDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    dragCount.current = Math.max(0, dragCount.current - 1);
    if (dragCount.current === 0) setDragging(false);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    dragCount.current = 0;
    setDragging(false);
    void addFiles(e.dataTransfer.files);
  }

  const lastUserIndex = messages.findLastIndex((item) => item.role === "user");
  const usage = totalUsage ?? emptyMimoUsage();

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">MiMo 问答</h1>
      <p className="mt-1 text-sm text-zinc-500">
        小米 MiMo，默认开联网搜索。可上传或粘贴图片、PDF 和文本文件。回车发送，Shift + Enter 换行。
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <select
          value={model}
          onChange={(e) => setModel(e.target.value as MimoModelId)}
          disabled={pending}
          className={selectClass}
        >
          {MIMO_MODELS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-sm text-zinc-600">
          <input
            type="checkbox"
            checked={thinking}
            disabled={pending}
            onChange={(e) => setThinking(e.target.checked)}
          />
          深度思考
        </label>
        <label className="flex items-center gap-1.5 text-sm text-zinc-600">
          <input
            type="checkbox"
            checked={search}
            disabled={pending}
            onChange={(e) => setSearch(e.target.checked)}
          />
          联网搜索
        </label>
        <button
          type="button"
          className={`${btnClass} ml-auto`}
          disabled={pending || messages.length === 0}
          onClick={() => {
            setMessages([]);
            setAttachments([]);
            setError("");
            setLastUsage(null);
            setTotalUsage(emptyMimoUsage());
          }}
        >
          清空对话
        </button>
      </div>

      <p className="mt-2 text-xs text-zinc-400">
        {lastUsage ? `本轮 ${formatNum(lastUsage.total)}　` : null}
        累计 {formatNum(usage.total)}
        {usage.total > 0
          ? `（输入 ${formatNum(usage.prompt)} · 输出 ${formatNum(usage.completion)}${
              usage.reasoning ? ` · 思考 ${formatNum(usage.reasoning)}` : ""
            }${usage.search ? ` · 搜索 ${formatNum(usage.search)}` : ""}）`
          : "（发一次后按接口返回累计）"}
      </p>

      <div
        ref={listRef}
        className="mt-4 flex h-[min(32rem,60vh)] flex-col gap-3 overflow-y-auto rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
      >
        {messages.length === 0 ? (
          <p className="m-auto text-sm text-zinc-400">问一句就开始。也可以先放一张图。</p>
        ) : (
          messages.map((item, i) => (
            <div key={`${item.role}-${i}`} ref={i === lastUserIndex ? sendAnchorRef : undefined}>
              <Bubble item={item} waitSec={item.pending ? waitSec : 0} />
            </div>
          ))
        )}
      </div>

      <div
        className={`mt-4 rounded-2xl ${dragging ? "ring-2 ring-teal-600 ring-offset-2" : ""}`}
        onDragEnter={onDragEnter}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {attachments.length ? (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white"
              >
                {att.kind === "image" && att.dataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={att.dataUrl} alt={att.name} className="h-16 w-16 object-cover" />
                ) : (
                  <span className="block max-w-40 truncate px-3 py-2 text-xs text-zinc-600" title={att.name}>
                    {att.name}
                  </span>
                )}
                <button
                  type="button"
                  className="absolute right-0.5 top-0.5 rounded-full bg-black/60 px-1.5 text-[10px] leading-4 text-white"
                  onClick={() => removeAttachment(att.id)}
                  aria-label={`移除 ${att.name}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : null}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          rows={3}
          placeholder="输入问题，或把图片/文件拖进来、粘贴进来…"
          className={`${fieldClass} resize-y p-4 leading-6`}
        />
        <input
          ref={fileRef}
          type="file"
          multiple
          accept={FILE_ACCEPT}
          className="hidden"
          onChange={(e) => {
            void addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            className={btnClass}
            disabled={pending || reading || attachments.length >= MAX_MIMO_ATTACHMENTS}
            onClick={() => fileRef.current?.click()}
          >
            上传
          </button>
          <span className={`text-xs ${overLimit ? "text-red-600" : "text-zinc-400"}`}>
            {reading ? "正在读取附件…" : `${count} / ${MAX_MIMO_CHARS}`}
          </span>
          <div className="ml-auto flex gap-2">
            {pending ? (
              <button type="button" onClick={stop} className={btnClass}>
                停止
              </button>
            ) : null}
            <button type="button" disabled={!canSend} onClick={() => void send()} className={primaryBtnClass}>
              {pending ? "回答中…" : "发送"}
            </button>
          </div>
        </div>
      </div>

      {overLimit ? <p className="mt-3 text-sm text-red-600">超出字数上限，请缩短后再发。</p> : null}
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}

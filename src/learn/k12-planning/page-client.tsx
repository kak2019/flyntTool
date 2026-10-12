"use client";

import { useEffect, useState } from "react";
import "katex/dist/katex.min.css";
import { lessonPreview, splitPlanningReply } from "@/learn/k12-planning/lesson-files";
import { chatMimo } from "@/lib/client-mimo";
import { readMimoFile } from "@/lib/client-mimo-files";
import { mathMarkdownToHtml } from "@/lib/math-html";
import type { MimoAttachment, MimoChatMessage } from "@/lib/mimo";
import { btnClass, fieldClass, primaryBtnClass } from "@/lib/styles";

type Turn = MimoChatMessage & { pending?: boolean };

export default function PlanningPage() {
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<MimoAttachment[]>([]);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [word, setWord] = useState<boolean | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/planning/export")
      .then((res) => res.json())
      .then((data: { format?: string }) => {
        if (alive) setWord(data.format === "docx");
      })
      .catch(() => {
        if (alive) setWord(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  async function download(content: string) {
    if (downloading) return;
    setDownloading(true);
    setError("");
    try {
      const res = await fetch("/api/planning/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("下载失败");
      const blob = await res.blob();
      const header = res.headers.get("content-disposition") || "";
      const star = header.match(/filename\*=UTF-8''([^;]+)/i);
      const name = star ? decodeURIComponent(star[1]) : "备课.zip";
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "下载失败");
    } finally {
      setDownloading(false);
    }
  }

  async function addFiles(list: FileList | File[] | null) {
    const files = list ? Array.from(list) : [];
    if (!files.length || busy) return;
    const added: MimoAttachment[] = [];
    for (const file of files.slice(0, 3)) {
      try {
        added.push(await readMimoFile(file));
      } catch (err) {
        setError(err instanceof Error ? err.message : "文件读取失败");
      }
    }
    if (added.length) setAttachments((cur) => [...cur, ...added].slice(0, 3));
  }

  async function send() {
    const text = input.trim();
    if ((!text && !attachments.length) || busy) return;
    const next: Turn[] = [
      ...turns,
      { role: "user", content: text, attachments: attachments.length ? attachments : undefined },
    ];
    setInput("");
    setAttachments([]);
    setError("");
    setBusy(true);
    setTurns([...next, { role: "assistant", content: "", pending: true }]);
    try {
      const result = await chatMimo({
        endpoint: "/api/planning",
        model: "mimo-v2.6-flash",
        thinking: false,
        search: false,
        messages: next.map(({ role, content, attachments: atts }) => ({
          role,
          content,
          attachments: atts,
        })),
        onDelta: (state) => {
          setTurns([
            ...next,
            { role: "assistant", content: state.content, pending: true },
          ]);
        },
      });
      setTurns([...next, { role: "assistant", content: result.content }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "请求失败");
      setTurns(next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col">
      <h1 className="text-2xl font-semibold tracking-tight">备课</h1>
      <p className="mt-1 text-sm text-zinc-500">
        按国家课程和教材进度写教学设计、学生学习单和课堂观察表。能生成 Word 时下载 Word，否则下载 Markdown。教材页可以贴图。
      </p>

      <div className="mt-5 flex flex-1 flex-col gap-3">
        {turns.length === 0 ? (
          <p className="text-sm text-zinc-400">例如「人教版七年级数学，一元一次方程第一课时」。</p>
        ) : null}
        {turns.map((turn, index) =>
          turn.role === "user" ? (
            <div key={index} className="ml-auto max-w-[85%] rounded-2xl bg-teal-700 px-3 py-2 text-sm text-white">
              {turn.content ? <p className="whitespace-pre-wrap">{turn.content}</p> : null}
              {turn.attachments?.length ? (
                <p className="mt-1 text-xs text-teal-100">{turn.attachments.map((item) => item.name).join("、")}</p>
              ) : null}
            </div>
          ) : (
            <AssistantTurn
              key={index}
              content={turn.content}
              pending={turn.pending}
              word={word}
              downloading={downloading}
              onDownload={() => void download(turn.content)}
            />
          ),
        )}
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
      </div>

      {attachments.length ? (
        <ul className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-600">
          {attachments.map((item) => (
            <li key={item.id} className="rounded-lg border border-zinc-200 bg-white px-2 py-1">
              {item.name}
              <button type="button" className="ml-2 text-zinc-400" onClick={() => setAttachments((cur) => cur.filter((att) => att.id !== item.id))}>
                去掉
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <form
        className="sticky bottom-0 mt-4 flex gap-2 bg-zinc-50 py-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <label className="shrink-0 cursor-pointer rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50">
          图片
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              void addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing) return;
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          onPaste={(e) => {
            const files = Array.from(e.clipboardData?.items ?? [])
              .filter((item) => item.kind === "file")
              .map((item) => item.getAsFile())
              .filter((file): file is File => Boolean(file));
            if (!files.length) return;
            e.preventDefault();
            void addFiles(files);
          }}
          placeholder="年级、学科、课题，或贴教材页"
          rows={2}
          className={fieldClass}
          disabled={busy}
        />
        <button type="submit" className={primaryBtnClass} disabled={busy || (!input.trim() && !attachments.length)}>
          {busy ? "备课中" : "发送"}
        </button>
      </form>
    </div>
  );
}

function AssistantTurn({
  content,
  pending,
  word,
  downloading,
  onDownload,
}: {
  content: string;
  pending?: boolean;
  word: boolean | null;
  downloading: boolean;
  onDownload: () => void;
}) {
  const view = splitPlanningReply(content);
  const markdown = [view.prose, view.source ? lessonPreview(view.source) : ""].filter(Boolean).join("\n\n");
  const canDownload = !pending && !view.streaming && Boolean(markdown.trim());
  const asWord = Boolean(view.source) && word === true;
  return (
    <div className="max-w-[95%] rounded-2xl border border-zinc-200 bg-white px-3 py-3 text-sm text-zinc-800">
      {markdown ? (
        <div
          className="space-y-2 [&_h1]:text-base [&_h1]:font-semibold [&_h2]:mt-3 [&_h2]:text-base [&_h2]:font-semibold [&_ol]:list-decimal [&_ol]:pl-5 [&_table]:w-full [&_td]:border [&_td]:border-zinc-200 [&_td]:px-2 [&_th]:border [&_th]:border-zinc-200 [&_th]:px-2 [&_ul]:list-disc [&_ul]:pl-5"
          dangerouslySetInnerHTML={{ __html: mathMarkdownToHtml(markdown) }}
        />
      ) : (
        <p className="text-zinc-400">{pending || view.streaming ? "正在备课…" : ""}</p>
      )}
      {view.streaming ? <p className="mt-2 text-xs text-zinc-400">正在整理可下载的材料…</p> : null}
      {canDownload ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" className={btnClass} disabled={downloading} onClick={onDownload}>
            {downloading ? "准备文件…" : asWord ? "下载 Word" : "下载 Markdown"}
          </button>
          {view.source && word === false ? (
            <span className="text-xs text-zinc-400">当前环境不能生成 Word</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

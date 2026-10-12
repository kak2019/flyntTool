"use client";

import { useState } from "react";
import "katex/dist/katex.min.css";
import { chatMimo } from "@/lib/client-mimo";
import { readMimoFile } from "@/lib/client-mimo-files";
import { mathMarkdownToHtml } from "@/lib/math-html";
import type { MimoAttachment, MimoChatMessage } from "@/lib/mimo";
import { fieldClass, primaryBtnClass } from "@/lib/styles";

type Turn = MimoChatMessage & { pending?: boolean };

export default function MathPage() {
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<MimoAttachment[]>([]);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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
        endpoint: "/api/math",
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
      <h1 className="text-2xl font-semibold tracking-tight">数学辅导</h1>
      <p className="mt-1 text-sm text-zinc-500">
        按教材讲知识点、出题、批改和答疑。直接说年级和想做什么。题目可以打字，也可以贴图片。
      </p>

      <div className="mt-5 flex flex-1 flex-col gap-3">
        {turns.length === 0 ? (
          <p className="text-sm text-zinc-400">例如「讲一下勾股定理」或「出 3 道七年级一元一次方程」。</p>
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
            <div
              key={index}
              className="max-w-[95%] rounded-2xl border border-zinc-200 bg-white px-3 py-3 text-sm text-zinc-800"
            >
              {turn.content ? (
                <div
                  className="space-y-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
                  dangerouslySetInnerHTML={{ __html: mathMarkdownToHtml(turn.content) }}
                />
              ) : (
                <p className="text-zinc-400">{turn.pending ? "正在想…" : ""}</p>
              )}
            </div>
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
          placeholder="想学什么，或贴上题目"
          rows={2}
          className={fieldClass}
          disabled={busy}
        />
        <button type="submit" className={primaryBtnClass} disabled={busy || (!input.trim() && !attachments.length)}>
          {busy ? "思考中" : "发送"}
        </button>
      </form>
    </div>
  );
}

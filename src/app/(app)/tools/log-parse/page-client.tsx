"use client";

import { DragEvent, useMemo, useRef, useState } from "react";
import { bisCopyHtml, bisCopyRows, bisCopyTable, bisCounts, parseBisLog, type BisCase, type BisLogReport } from "@/lib/bisu-log";
import { btnClass, fieldClass, primaryBtnClass } from "@/lib/styles";

const MAX_CHARS = 8_000_000;

type FilterId = "all" | "copied" | "generated" | "unsupported" | "empty";

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "全部案件" },
  { id: "copied", label: "有新复制" },
  { id: "generated", label: "已生成" },
  { id: "unsupported", label: "类型不支持" },
  { id: "empty", label: "没有 InFile" },
];

function matches(item: BisCase, filter: FilterId, query: string) {
  const hay = `${item.ref} ${item.client} ${item.folder} ${item.files.map((file) => file.fileName).join(" ")}`.toLowerCase();
  if (query && !hay.includes(query)) return false;
  if (filter === "copied") return item.files.some((file) => file.kind === "copy");
  if (filter === "generated") return item.files.some((file) => file.reason.includes("已生成"));
  if (filter === "unsupported") return item.files.some((file) => file.reason.includes("不在支持"));
  if (filter === "empty") return item.note.includes("没有 InFile");
  return true;
}

export default function LogParsePage() {
  const [report, setReport] = useState<BisLogReport | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<FilterId>("copied");
  const [query, setQuery] = useState("");
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const counts = useMemo(() => (report ? bisCounts(report) : null), [report]);
  const copyRows = useMemo(() => (report ? bisCopyRows(report) : []), [report]);
  const needle = query.trim().toLowerCase();
  const visible = useMemo(
    () => (report ? report.cases.filter((item) => matches(item, filter, needle)) : []),
    [report, filter, needle],
  );

  async function loadFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".log") && !file.type.startsWith("text/")) {
      setError("请上传 .log 或文本文件");
      return;
    }
    const text = await file.text();
    if (text.length > MAX_CHARS) {
      setError("日志超过 8MB，请先截短");
      return;
    }
    const next = parseBisLog(text);
    if (!next.cases.length && !next.summary) {
      setError("没有认出案件记录。日志需要包含 [1] 文号 这样的段落。");
      setReport(null);
      return;
    }
    setReport(next);
    setFileName(file.name);
    setError("");
    setFilter(next.cases.some((item) => item.files.some((fileItem) => fileItem.kind === "copy")) ? "copied" : "all");
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void loadFile(file);
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">日志解析</h1>
      <p className="mt-1 text-sm text-zinc-500">
        上传专利文书导出日志，看出哪些 PDF 新复制了、哪些因为类型不支持或已经生成而跳过。
      </p>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`mt-5 rounded-2xl border border-dashed px-4 py-8 text-center ${
          dragging ? "border-teal-700 bg-teal-50" : "border-zinc-300 bg-zinc-50"
        }`}
      >
        <p className="text-sm text-zinc-600">把 .log 拖到这里，或选择文件。解析在浏览器里完成。</p>
        <button type="button" className={`${primaryBtnClass} mt-3`} onClick={() => inputRef.current?.click()}>
          选择日志
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".log,text/plain"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void loadFile(file);
            event.target.value = "";
          }}
        />
        {fileName ? <p className="mt-3 text-xs text-zinc-500">{fileName}</p> : null}
      </div>
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      {report && counts ? (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="案件" value={counts.cases} />
            <Stat label="新复制 PDF" value={counts.copiedFiles} />
            <Stat label="跳过 PDF" value={counts.skippedFiles} />
            <Stat label="合并 PDF" value={counts.merged} />
          </div>
          {report.summary ? (
            <p className="mt-3 text-sm text-zinc-600">
              日志收尾：处理 {report.summary.cases} 个案件，新复制 {report.summary.copied}，补翻译{" "}
              {report.summary.translated}，跳过 {report.summary.skipped}，合成 {report.summary.merged}。
              {report.summary.copied !== counts.copiedFiles || report.summary.skipped !== counts.skippedFiles
                ? " 和解析出的条数不一致，请核对原文。"
                : ""}
            </p>
          ) : null}

          <section className="mt-5">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-sm font-medium">新生成的 PDF</h2>
              <button
                type="button"
                className={primaryBtnClass}
                disabled={copyRows.length === 0}
                onClick={() => {
                  const plain = bisCopyTable(copyRows);
                  const html = bisCopyHtml(copyRows);
                  const done = () => {
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 1200);
                  };
                  const rich = navigator.clipboard.write?.([
                    new ClipboardItem({
                      "text/plain": new Blob([plain], { type: "text/plain" }),
                      "text/html": new Blob([html], { type: "text/html" }),
                    }),
                  ]);
                  void (rich ?? navigator.clipboard.writeText(plain)).then(done);
                }}
              >
                {copied ? "已复制" : "复制表格"}
              </button>
              <span className="text-xs text-zinc-400">贴进 Teams 是表格，贴进 Excel 是两列</span>
            </div>
            {copyRows.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-400">这次没有新生成的 PDF。</p>
            ) : (
              <div className="mt-3 overflow-x-auto rounded-2xl border border-zinc-200">
                <table className="w-full min-w-[40rem] text-left text-sm">
                  <thead className="bg-zinc-50 text-xs text-zinc-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">文号</th>
                      <th className="px-3 py-2 font-medium">L 盘路径</th>
                    </tr>
                  </thead>
                  <tbody>
                    {copyRows.map((row) => (
                      <tr key={`${row.ref}-${row.path}`} className="border-t border-zinc-100">
                        <td className="whitespace-nowrap px-3 py-2 font-medium">{row.ref}</td>
                        <td className="break-all px-3 py-2 text-zinc-700">{row.path}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {report.meta.length || report.notes.length ? (
            <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              {report.meta.map((item) => (
                <div key={item.key} className="rounded-xl border border-zinc-200 px-3 py-2">
                  <dt className="text-xs text-zinc-400">{item.key}</dt>
                  <dd className="mt-0.5 break-all text-zinc-800">{item.value}</dd>
                </div>
              ))}
              {report.notes.map((note) => (
                <div key={note} className="rounded-xl border border-zinc-200 px-3 py-2 text-zinc-700 sm:col-span-2">
                  {note}
                </div>
              ))}
            </dl>
          ) : null}

          {counts.reasons.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {counts.reasons.map(([reason, n]) => (
                <span key={reason} className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-700">
                  {reason} {n}
                </span>
              ))}
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={filter === item.id ? primaryBtnClass : btnClass}
              >
                {item.label}
              </button>
            ))}
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜文号、客户、文件名"
              className={`${fieldClass} min-w-52 flex-1`}
            />
            <span className="text-xs text-zinc-400">{visible.length} 条</span>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            {visible.length === 0 ? <p className="text-sm text-zinc-400">这个筛选下没有案件。</p> : null}
            {visible.map((item) => (
              <article key={`${item.index}-${item.ref}`} className="rounded-2xl border border-zinc-200 p-4">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h2 className="text-base font-medium">
                    [{item.index}] {item.ref}
                  </h2>
                  <span className="text-sm text-zinc-500">{item.client}</span>
                </div>
                <p className="mt-1 text-sm text-zinc-600">
                  {item.folder}
                  {item.matched ? " · 已匹配" : ""}
                  {item.note ? ` · ${item.note}` : ""}
                </p>
                {item.files.length ? (
                  <ul className="mt-3 flex flex-col gap-2">
                    {item.files.map((file) => (
                      <li key={`${file.kind}-${file.source}`} className="text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded px-1.5 py-0.5 text-xs ${
                              file.kind === "copy" ? "bg-teal-100 text-teal-800" : "bg-zinc-100 text-zinc-600"
                            }`}
                          >
                            {file.kind === "copy" ? "复制" : "跳过"}
                          </span>
                          <span className="break-all">{file.fileName}</span>
                          {file.reason ? <span className="text-zinc-500">{file.reason}</span> : null}
                        </div>
                        {file.dest ? <p className="mt-1 break-all text-xs text-zinc-500">本地 {file.dest}</p> : null}
                        {file.docType ? <p className="text-xs text-zinc-500">类型 {file.docType}</p> : null}
                        {file.noticeType ? <p className="text-xs text-zinc-500">文书 {file.noticeType}</p> : null}
                        {file.merged ? <p className="break-all text-xs text-zinc-500">合并 {file.merged}</p> : null}
                        {file.upload ? (
                          <a href={file.upload} className="break-all text-xs text-teal-700" target="_blank" rel="noreferrer">
                            上传地址
                          </a>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-zinc-200 px-4 py-3">
      <div className="text-xs text-zinc-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}

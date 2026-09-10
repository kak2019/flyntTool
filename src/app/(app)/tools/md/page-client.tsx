"use client";

import { useMemo, useState } from "react";
import { markdownToHtml } from "@/lib/markdown";
import { btnClass, fieldClass } from "@/lib/styles";

const SAMPLE = `# 标题

左边写 **Markdown**，右边看预览。

- 列表
- 还可以 \`行内代码\`

\`\`\`ts
const ok = true;
\`\`\`

| 左 | 右 |
| --- | --- |
| JSON | 格式化 |
`;

export default function MarkdownPage() {
  const [source, setSource] = useState("");
  const [copied, setCopied] = useState(false);

  const html = useMemo(() => markdownToHtml(source), [source]);

  async function copyHtml() {
    if (!html) return;
    await navigator.clipboard.writeText(html);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Markdown 预览</h1>
      <p className="mt-1 text-sm text-zinc-500">左边写，右边看。支持标题、列表、代码块和表格。</p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setSource(SAMPLE)}
          className={btnClass}
        >
          填入示例
        </button>
        <button type="button" onClick={() => setSource("")} className={btnClass}>
          清空
        </button>
        <button type="button" disabled={!html} onClick={() => void copyHtml()} className={btnClass}>
          {copied ? "已复制 HTML" : "复制 HTML"}
        </button>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Markdown</span>
          <textarea
            value={source}
            onChange={(e) => setSource(e.target.value)}
            rows={22}
            spellCheck={false}
            placeholder="写点什么…"
            className={`${fieldClass} min-h-[32rem] resize-y p-4 font-mono text-[13px] leading-6`}
          />
        </label>
        <div>
          <p className="mb-1.5 text-sm font-medium">预览</p>
          <div className="min-h-[32rem] rounded-xl border border-zinc-200 bg-white px-5 py-4">
            {html ? (
              <div
                className="doc-html text-sm leading-7 text-zinc-800"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            ) : (
              <p className="text-sm text-zinc-400">预览会出现在这里</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

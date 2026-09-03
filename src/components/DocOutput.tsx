"use client";

import { looksLikeHtml, sanitizeHtml, unwrapFenced } from "@/lib/doc-html";

export function DocOutput({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const unwrapped = unwrapFenced(text);
  if (looksLikeHtml(unwrapped)) {
    return (
      <div
        className={`doc-html text-sm leading-7 text-zinc-800 ${className}`}
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(unwrapped) }}
      />
    );
  }
  return (
    <div className={`whitespace-pre-wrap text-sm leading-7 text-zinc-800 ${className}`}>
      {unwrapped}
    </div>
  );
}

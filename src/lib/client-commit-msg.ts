import { readSse } from "@/lib/client-translate";

export const COMMIT_TYPES = [
  "auto",
  "feat",
  "fix",
  "docs",
  "style",
  "refactor",
  "perf",
  "test",
  "build",
  "ci",
  "chore",
] as const;

export type CommitType = (typeof COMMIT_TYPES)[number];

export function cleanCommitMessage(text: string) {
  return text
    .trim()
    .replace(/^```[a-z]*\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

export async function writeCommitMessage(opts: {
  text: string;
  type: CommitType;
  onDelta?: (full: string) => void;
}): Promise<string> {
  const res = await fetch("/api/commit-msg", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: opts.text, type: opts.type, stream: true }),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || `生成失败（${res.status}）`);
  }

  const ctype = res.headers.get("content-type") || "";
  if (ctype.includes("text/event-stream") && res.body) {
    return cleanCommitMessage(await readSse(res.body, opts.onDelta));
  }

  const data = (await res.json()) as { text?: string };
  const text = cleanCommitMessage(data.text ?? "");
  opts.onDelta?.(text);
  return text;
}

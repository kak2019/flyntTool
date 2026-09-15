import { NextRequest, NextResponse } from "next/server";
import { MAX_COMMIT_CHARS } from "@/lib/limits";

const WINDOW_MS = 60_000;
const MAX_HITS = 30;
const TYPES = new Set([
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
]);
const hits = new Map<string, { n: number; t: number }>();

function clientIp(req: NextRequest) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "local"
  );
}

function rateLimited(ip: string) {
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || now - rec.t > WINDOW_MS) {
    hits.set(ip, { n: 1, t: now });
    return false;
  }
  rec.n += 1;
  return rec.n > MAX_HITS;
}

function systemPrompt(type: string) {
  const typeRule =
    type === "auto"
      ? "Choose the type yourself."
      : `Use type "${type}". Do not pick a different type.`;
  return [
    "Turn a change note (usually Chinese) into a Conventional Commits message.",
    "Output ONLY the commit message. No quotes, markdown fences, or commentary.",
    "First line: type(optional-scope): description",
    "Allowed types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert.",
    typeRule,
    "Scope is optional, short, lowercase English. Omit it when unsure.",
    "Description is English, imperative, present tense, lowercase after the colon, no trailing period.",
    "Keep the subject around 50-72 characters when possible.",
    "Write the WHY / user-facing outcome, not a file list.",
    "If there are extra details, add a blank line and a short English body.",
    "Do not invent ticket numbers or BREAKING CHANGE unless the note says so.",
  ].join(" ");
}

export async function POST(req: NextRequest) {
  if (rateLimited(clientIp(req))) {
    return NextResponse.json({ error: "请求太频繁，稍等再试" }, { status: 429 });
  }

  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "未配置 DASHSCOPE_API_KEY" }, { status: 500 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    text?: string;
    type?: string;
    stream?: boolean;
  };
  const text = String(body.text ?? "").trim();
  if (!text) {
    return NextResponse.json({ error: "请先写改动说明" }, { status: 400 });
  }
  if (text.length > MAX_COMMIT_CHARS) {
    return NextResponse.json(
      { error: `单次最多 ${MAX_COMMIT_CHARS} 字，请缩短后再试` },
      { status: 400 },
    );
  }

  const type = TYPES.has(String(body.type ?? "")) ? String(body.type) : "auto";
  const stream = body.stream !== false;
  const baseUrl =
    process.env.DASHSCOPE_BASE_URL ||
    "https://dashscope.aliyuncs.com/compatible-mode/v1";

  const upstream = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.DASHSCOPE_COMMIT_MODEL || process.env.DASHSCOPE_LAYOUT_MODEL || "qwen-plus",
      stream,
      temperature: 0.2,
      messages: [
        { role: "system", content: systemPrompt(type) },
        { role: "user", content: text },
      ],
    }),
  });

  if (!upstream.ok) {
    const err = await upstream.text();
    return NextResponse.json(
      { error: `生成失败：${err.slice(0, 280)}` },
      { status: 502 },
    );
  }

  if (stream && upstream.body) {
    return new Response(upstream.body, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  }

  const data = (await upstream.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return NextResponse.json({ text: data.choices?.[0]?.message?.content ?? "" });
}

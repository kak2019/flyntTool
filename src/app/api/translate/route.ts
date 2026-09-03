import { NextRequest, NextResponse } from "next/server";

const MAX_CHARS = 8000;
const WINDOW_MS = 60_000;
const MAX_HITS = 40;
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

export async function POST(req: NextRequest) {
  if (rateLimited(clientIp(req))) {
    return NextResponse.json(
      { error: "请求太频繁，稍等再试" },
      { status: 429 },
    );
  }

  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "未配置 DASHSCOPE_API_KEY" },
      { status: 500 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    text?: string;
    sourceLang?: string;
    targetLang?: string;
    stream?: boolean;
  };

  const text = String(body.text ?? "").trim();
  if (!text) {
    return NextResponse.json({ error: "没有要翻译的文本" }, { status: 400 });
  }
  if (text.length > MAX_CHARS) {
    return NextResponse.json(
      { error: `单次最多 ${MAX_CHARS} 字，请缩短后再译` },
      { status: 400 },
    );
  }

  const sourceLang = body.sourceLang || "auto";
  const targetLang = body.targetLang || "Chinese";
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
      model: "qwen-mt-flash",
      messages: [{ role: "user", content: text }],
      stream,
      translation_options: {
        source_lang: sourceLang,
        target_lang: targetLang,
      },
    }),
  });

  if (!upstream.ok) {
    const err = await upstream.text();
    return NextResponse.json(
      { error: `翻译接口失败：${err.slice(0, 280)}` },
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

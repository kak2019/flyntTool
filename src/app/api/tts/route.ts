import { NextRequest, NextResponse } from "next/server";

const WINDOW_MS = 60_000;
const MAX_HITS = 20;
const MAX_CHARS = 600;
const hits = new Map<string, { n: number; t: number }>();

const LANGUAGE_TYPES = new Set([
  "Chinese",
  "English",
  "German",
  "Italian",
  "Portuguese",
  "Spanish",
  "Japanese",
  "Korean",
  "French",
  "Russian",
  "Auto",
]);

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

function dashscopeApiBase() {
  const raw = (
    process.env.DASHSCOPE_BASE_URL ||
    "https://dashscope.aliyuncs.com/compatible-mode/v1"
  ).replace(/\/$/, "");
  if (raw.endsWith("/compatible-mode/v1")) {
    return raw.replace(/\/compatible-mode\/v1$/, "/api/v1");
  }
  if (raw.endsWith("/api/v1")) return raw;
  if (raw.includes("dashscope-intl")) {
    return "https://dashscope-intl.aliyuncs.com/api/v1";
  }
  return "https://dashscope.aliyuncs.com/api/v1";
}

export async function POST(req: NextRequest) {
  if (rateLimited(clientIp(req))) {
    return NextResponse.json({ error: "朗读太频繁，稍等再试" }, { status: 429 });
  }

  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "未配置 DASHSCOPE_API_KEY" }, { status: 500 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    text?: string;
    language?: string;
  };
  const text = String(body.text ?? "").trim();
  if (!text) {
    return NextResponse.json({ error: "没有要朗读的文本" }, { status: 400 });
  }
  if (text.length > MAX_CHARS) {
    return NextResponse.json(
      { error: `单次朗读最多 ${MAX_CHARS} 字，请缩短后再试` },
      { status: 400 },
    );
  }

  const language = LANGUAGE_TYPES.has(String(body.language))
    ? String(body.language)
    : "Auto";
  const model = process.env.DASHSCOPE_TTS_MODEL || "qwen3-tts-flash";
  const endpoint = `${dashscopeApiBase()}/services/aigc/multimodal-generation/generation`;

  const upstream = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: {
        text,
        voice: process.env.DASHSCOPE_TTS_VOICE || "Cherry",
        language_type: language,
      },
    }),
  });

  const data = (await upstream.json().catch(() => ({}))) as {
    code?: string;
    message?: string;
    output?: { audio?: { url?: string } };
  };

  if (!upstream.ok) {
    return NextResponse.json(
      { error: `朗读接口失败：${(data.message || JSON.stringify(data)).slice(0, 280)}` },
      { status: 502 },
    );
  }

  const audioUrl = data.output?.audio?.url;
  if (!audioUrl) {
    return NextResponse.json({ error: "朗读接口没有返回音频" }, { status: 502 });
  }

  const audioRes = await fetch(audioUrl);
  if (!audioRes.ok) {
    return NextResponse.json({ error: "下载朗读音频失败" }, { status: 502 });
  }

  const bytes = await audioRes.arrayBuffer();
  const contentType = audioRes.headers.get("content-type") || "audio/wav";
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
    },
  });
}

import { NextRequest, NextResponse } from "next/server";

const WINDOW_MS = 60_000;
const MAX_HITS = 20;
const hits = new Map<string, { n: number; t: number }>();
const MAX_IMAGE_CHARS = 2_500_000;

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
      { error: "识别太频繁，稍等再试" },
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

  const body = (await req.json().catch(() => ({}))) as { image?: string };
  const image = String(body.image ?? "").trim();
  if (!image.startsWith("data:image/")) {
    return NextResponse.json({ error: "缺少页面图片" }, { status: 400 });
  }
  if (image.length > MAX_IMAGE_CHARS) {
    return NextResponse.json({ error: "页面图片太大，请缩小后重试" }, { status: 400 });
  }

  const baseUrl =
    process.env.DASHSCOPE_BASE_URL ||
    "https://dashscope.aliyuncs.com/compatible-mode/v1";
  const model = process.env.DASHSCOPE_OCR_MODEL || "qwen-vl-ocr-latest";

  const upstream = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: image } },
            {
              type: "text",
              text: "请识别图中全部文字，包括印刷体和手写。尽量保留原来的换行、段落和列表，直接输出识别结果，不要解释。",
            },
          ],
        },
      ],
    }),
  });

  if (!upstream.ok) {
    const err = await upstream.text();
    return NextResponse.json(
      { error: `识别接口失败：${err.slice(0, 280)}` },
      { status: 502 },
    );
  }

  const data = (await upstream.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return NextResponse.json({ text: data.choices?.[0]?.message?.content ?? "" });
}
